import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { HttpAdapterHost, ModuleRef } from '@nestjs/core';
import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { URL } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { VerificadorIdentidad } from '../autenticacion/verificador-identidad';
import { IdentidadExterna } from '../autenticacion/identidad-externa';
import { AvisoConfirmado, AvisoSesiones } from './aviso-sesiones';
import { presentarSala } from './presentacion-sala';
import { SesionesJuegoService } from './sesiones-juego.service';

interface ClienteConectado {
  ws: WebSocket;
  codigo: string;
  usuarioId?: string;
  nombre?: string;
  respondio: boolean;
  fallos: number;
}

const INTERVALO_LATIDO_MS = 20_000;
const FALLOS_PARA_CORTAR = 3;
const GRACIA_AUSENCIA_MS = 8_000;

@Injectable()
export class CanalWebSocketService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(CanalWebSocketService.name);
  private wss: WebSocketServer | null = null;
  private salas = new Map<string, Set<ClienteConectado>>();
  private sesiones!: SesionesJuegoService;
  private latido: ReturnType<typeof setInterval> | null = null;
  private ausencias = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly verificador: VerificadorIdentidad,
    private readonly moduleRef: ModuleRef,
  ) {}

  onApplicationBootstrap() {
    this.sesiones = this.moduleRef.get(SesionesJuegoService, {
      strict: false,
    });
    const server = this.adapterHost.httpAdapter.getHttpServer();
    if (!server) {
      this.logger.warn('No se pudo obtener el servidor HTTP para WebSocket.');
      return;
    }

    this.wss = new WebSocketServer({ noServer: true });

    server.on(
      'upgrade',
      (request: IncomingMessage, socket: Socket, head: Buffer) => {
        void this.autorizarYActualizar(request, socket, head);
      },
    );

    this.latido = setInterval(() => this.revisarLatido(), INTERVALO_LATIDO_MS);
    this.logger.log(
      'Canal WebSocket de ProfeLink montado en /canal y / con soporte de salas.',
    );
  }

  onModuleDestroy() {
    if (this.latido) clearInterval(this.latido);
    for (const espera of this.ausencias.values()) clearTimeout(espera);
    this.ausencias.clear();
    this.wss?.close();
    this.salas.clear();
  }

  private revisarLatido(): void {
    for (const clientes of this.salas.values()) {
      for (const cliente of clientes) {
        if (cliente.ws.readyState !== WebSocket.OPEN) continue;
        if (!cliente.respondio) {
          cliente.fallos += 1;
          if (cliente.fallos >= FALLOS_PARA_CORTAR) {
            cliente.ws.terminate();
            continue;
          }
        } else {
          cliente.fallos = 0;
        }
        cliente.respondio = false;
        try {
          cliente.ws.ping();
        } catch {
          /* El cierre de la sala limpia el socket. */
        }
      }
    }
  }

  private async autorizarYActualizar(
    request: IncomingMessage,
    socket: Socket,
    head: Buffer,
  ): Promise<void> {
    try {
      const url = new URL(request.url ?? '', 'http://localhost');
      const pathname = url.pathname;
      if (!['/canal', '/salas', '/', '/hubs/game'].includes(pathname)) {
        socket.destroy();
        return;
      }

      const codigo = (url.searchParams.get('codigo') ?? '')
        .trim()
        .toUpperCase();
      if (!codigo) {
        this.rechazar(socket, 400, 'Bad Request');
        return;
      }

      const protocolHeader = request.headers['sec-websocket-protocol'];
      const protocols = Array.isArray(protocolHeader)
        ? protocolHeader.join(',')
        : (protocolHeader ?? '');
      const tokenProtocol = protocols
        .split(',')
        .map((protocol) => protocol.trim())
        .find((protocol) => protocol.startsWith('profelink-bearer.'));
      const token = tokenProtocol?.slice('profelink-bearer.'.length) ?? '';
      if (!token) {
        this.rechazar(socket, 401, 'Unauthorized');
        return;
      }

      const identidad = await this.verificador.verificar(token);
      if (!identidad) {
        this.rechazar(socket, 401, 'Unauthorized');
        return;
      }

      if (!(await this.sesiones.autorizarCanal(codigo, identidad))) {
        this.rechazar(socket, 403, 'Forbidden');
        return;
      }

      if (!this.wss) {
        this.rechazar(socket, 503, 'Service Unavailable');
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        void this.manejarConexion(ws, codigo, identidad);
      });
    } catch (error) {
      this.logger.warn(
        `Se rechazó una conexión WebSocket por error de autorización: ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
      this.rechazar(socket, 503, 'Service Unavailable');
    }
  }

  private rechazar(socket: Socket, status: number, reason: string): void {
    if (socket.destroyed) return;
    socket.end(
      `HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
    );
  }

  private async manejarConexion(
    ws: WebSocket,
    codigo: string,
    identidad: IdentidadExterna,
  ) {
    const cliente: ClienteConectado = {
      ws,
      codigo,
      usuarioId: identidad?.id,
      nombre: identidad?.nombre,
      respondio: true,
      fallos: 0,
    };
    const vivo = () => {
      cliente.respondio = true;
      cliente.fallos = 0;
    };
    ws.on('pong', vivo);
    ws.on('message', vivo);

    if (codigo) {
      if (!this.salas.has(codigo)) {
        this.salas.set(codigo, new Set());
      }
      this.salas.get(codigo)!.add(cliente);
      this.logger.log(
        `Cliente conectado a sala [${codigo}] (Total: ${this.salas.get(codigo)!.size})`,
      );
      void this.presencia(codigo, identidad.id, true);
    }

    ws.on('close', () => {
      if (codigo && this.salas.has(codigo)) {
        const conjunto = this.salas.get(codigo)!;
        conjunto.delete(cliente);
        const sigue = [...conjunto].some(
          (item) =>
            item.usuarioId === cliente.usuarioId &&
            item.ws.readyState === WebSocket.OPEN,
        );
        if (conjunto.size === 0) {
          this.salas.delete(codigo);
        }
        if (!sigue) this.programarAusencia(codigo, cliente.usuarioId);
        this.logger.log(`Cliente desconectado de sala [${codigo}]`);
      }
    });

    ws.on('error', (err) => {
      this.logger.warn(
        `Error en WebSocket de sala [${codigo}]: ${err.message}`,
      );
    });

    // Enviar confirmación de conexión
    ws.send(
      JSON.stringify({
        evento: 'Conectado',
        codigo,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  clientesDe(codigo: string): ClienteConectado[] {
    return [...(this.salas.get(codigo.trim().toUpperCase()) ?? [])];
  }

  private programarAusencia(codigo: string, perfilId: string | undefined): void {
    if (!perfilId) return;
    const clave = `${codigo}:${perfilId}`;
    if (this.ausencias.has(clave)) return;
    const espera = setTimeout(() => {
      this.ausencias.delete(clave);
      const conjunto = this.salas.get(codigo);
      const sigue = conjunto
        ? [...conjunto].some(
            (item) =>
              item.usuarioId === perfilId && item.ws.readyState === WebSocket.OPEN,
          )
        : false;
      if (!sigue) void this.presencia(codigo, perfilId, false);
    }, GRACIA_AUSENCIA_MS);
    this.ausencias.set(clave, espera);
  }

  private async presencia(
    codigo: string,
    perfilId: string | undefined,
    conectado: boolean,
  ): Promise<void> {
    if (conectado && perfilId) {
      const espera = this.ausencias.get(`${codigo}:${perfilId}`);
      if (espera) {
        clearTimeout(espera);
        this.ausencias.delete(`${codigo}:${perfilId}`);
      }
    }
    if (!perfilId) return;
    const marcar = this.sesiones.marcarPresencia;
    if (typeof marcar !== 'function') return;
    try {
      await marcar.call(this.sesiones, codigo, perfilId, conectado);
    } catch (error) {
      this.logger.warn(
        `No se pudo actualizar la presencia en [${codigo}]: ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
    }
  }

  emitirASala(codigo: string, mensaje: Record<string, unknown>) {
    const normalizado = codigo.trim().toUpperCase();
    const clientes = this.salas.get(normalizado);
    if (!clientes || clientes.size === 0) return;

    const datos = JSON.stringify(mensaje);
    for (const cliente of clientes) {
      if (cliente.ws.readyState === WebSocket.OPEN) {
        cliente.ws.send(datos);
      }
    }
  }
}

@Injectable()
export class AvisoSesionesCanal extends AvisoSesiones {
  private readonly logger = new Logger(AvisoSesionesCanal.name);

  constructor(
    private readonly canal: CanalWebSocketService,
    private readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async confirmar(aviso: AvisoConfirmado): Promise<void> {
    try {
      // 1. Obtener sala actualizada sin dependencia circular en inicio
      const codigo = aviso.codigo.trim().toUpperCase();
      const sesiones = this.moduleRef.get(SesionesJuegoService, {
        strict: false,
      });
      const fila = sesiones
        ? await sesiones.leerParaEmision(codigo).catch(() => null)
        : null;

      if (fila) {
        const evento = {
          evento: this.mapearEvento(aviso.tipo),
          codigo,
          ocurridoEn: aviso.ocurridoEn,
        };
        for (const cliente of this.canal.clientesDe(codigo)) {
          if (cliente.ws.readyState !== WebSocket.OPEN) continue;
          cliente.ws.send(
            JSON.stringify({
              sala: presentarSala(fila, cliente.usuarioId),
              aviso,
            }),
          );
        }
        this.canal.emitirASala(codigo, evento);
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo emitir aviso de sesión a WebSocket: ${error}`,
      );
    }
  }

  private mapearEvento(tipo: string): string {
    switch (tipo) {
      case 'sala-creada':
        return 'RoomCreated';
      case 'participante-incorporado':
        return 'ParticipantJoined';
      case 'partida-iniciada':
        return 'GameStarted';
      case 'respuesta-aceptada':
        return 'AnswerAccepted';
      case 'pregunta-cerrada':
        return 'QuestionClosed';
      case 'clasificacion-mostrada':
        return 'LeaderboardShown';
      case 'pregunta-cambiada':
        return 'QuestionShown';
      case 'minijuego-iniciado':
        return 'MinigameStarted';
      case 'minijuego-resuelto':
        return 'MinigameResolved';
      case 'sesion-finalizada':
        return 'GameEnded';
      case 'presencia-actualizada':
        return 'PresenceChanged';
      default:
        return 'StateSnapshot';
    }
  }
}
