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
import { SesionesJuegoService } from './sesiones-juego.service';

interface ClienteConectado {
  ws: WebSocket;
  codigo: string;
  usuarioId?: string;
  nombre?: string;
}

@Injectable()
export class CanalWebSocketService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(CanalWebSocketService.name);
  private wss: WebSocketServer | null = null;
  private salas = new Map<string, Set<ClienteConectado>>();
  private sesiones!: SesionesJuegoService;

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

    this.logger.log(
      'Canal WebSocket de ProfeLink montado en /canal y / con soporte de salas.',
    );
  }

  onModuleDestroy() {
    this.wss?.close();
    this.salas.clear();
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
    };

    if (codigo) {
      if (!this.salas.has(codigo)) {
        this.salas.set(codigo, new Set());
      }
      this.salas.get(codigo)!.add(cliente);
      this.logger.log(
        `Cliente conectado a sala [${codigo}] (Total: ${this.salas.get(codigo)!.size})`,
      );
    }

    ws.on('close', () => {
      if (codigo && this.salas.has(codigo)) {
        const conjunto = this.salas.get(codigo)!;
        conjunto.delete(cliente);
        if (conjunto.size === 0) {
          this.salas.delete(codigo);
        }
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
      const sala = sesiones
        ? await sesiones
            .obtener(codigo, {
              id: 'sistema',
              nombre: 'Sistema',
            })
            .catch(() => null)
        : null;

      if (sala) {
        // Formato esperado directamente por el frontend (datos.sala)
        this.canal.emitirASala(codigo, {
          sala,
          aviso,
        });

        // Evento tipado adicional según especificación
        this.canal.emitirASala(codigo, {
          evento: this.mapearEvento(aviso.tipo),
          codigo,
          ocurridoEn: aviso.ocurridoEn,
        });
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
      case 'pregunta-cambiada':
        return 'QuestionShown';
      case 'sesion-finalizada':
        return 'GameEnded';
      default:
        return 'StateSnapshot';
    }
  }
}
