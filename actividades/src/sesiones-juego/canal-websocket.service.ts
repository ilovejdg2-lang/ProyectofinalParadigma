import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { IncomingMessage } from 'node:http';
import { URL } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { VerificadorIdentidad } from '../autenticacion/verificador-identidad';
import { AvisoConfirmado, AvisoSesiones } from './aviso-sesiones';
import { SesionesJuegoService } from './sesiones-juego.service';

interface ClienteConectado {
  ws: WebSocket;
  codigo: string;
  usuarioId?: string;
  nombre?: string;
}

@Injectable()
export class CanalWebSocketService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CanalWebSocketService.name);
  private wss: WebSocketServer | null = null;
  private salas = new Map<string, Set<ClienteConectado>>();

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly verificador: VerificadorIdentidad,
  ) {}

  onApplicationBootstrap() {
    const server = this.adapterHost.httpAdapter.getHttpServer();
    if (!server) {
      this.logger.warn('No se pudo obtener el servidor HTTP para WebSocket.');
      return;
    }

    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async (request: IncomingMessage, socket: any, head: Buffer) => {
      const url = new URL(request.url ?? '', `http://${request.headers.host}`);
      const pathname = url.pathname;

      // Aceptamos conexiones a /canal o a la raíz con parámetro de consulta codigo
      if (pathname === '/canal' || pathname === '/salas' || pathname === '/' || pathname === '/hubs/game') {
        const codigo = (url.searchParams.get('codigo') ?? '').trim().toUpperCase();
        const token = url.searchParams.get('access_token') ?? '';

        this.wss?.handleUpgrade(request, socket, head, async (ws) => {
          await this.manejarConexion(ws, codigo, token);
        });
      } else {
        socket.destroy();
      }
    });

    this.logger.log('Canal WebSocket de ProfeLink montado en /canal y / con soporte de salas.');
  }

  onModuleDestroy() {
    this.wss?.close();
    this.salas.clear();
  }

  private async manejarConexion(ws: WebSocket, codigo: string, token?: string) {
    let identidad = null;
    if (token) {
      identidad = await this.verificador.verificar(token);
    }

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
      this.logger.log(`Cliente conectado a sala [${codigo}] (Total: ${this.salas.get(codigo)!.size})`);
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
      this.logger.warn(`Error en WebSocket de sala [${codigo}]: ${err.message}`);
    });

    // Enviar confirmación de conexión
    ws.send(JSON.stringify({
      evento: 'Conectado',
      codigo,
      timestamp: new Date().toISOString(),
    }));
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

import { ModuleRef } from '@nestjs/core';

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
      const sesiones = this.moduleRef.get(SesionesJuegoService, { strict: false });
      const sala = sesiones ? await sesiones.obtener(codigo, {
        id: 'sistema',
        nombre: 'Sistema',
      }).catch(() => null) : null;

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
      this.logger.warn(`No se pudo emitir aviso de sesión a WebSocket: ${error}`);
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
