import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { HttpAdapterHost, ModuleRef } from '@nestjs/core';
import WebSocket from 'ws';
import { VerificadorIdentidad } from '../autenticacion/verificador-identidad';
import { CanalWebSocketService } from './canal-websocket.service';
import { SesionesJuegoService } from './sesiones-juego.service';

describe('CanalWebSocketService access control', () => {
  let server: Server;
  let service: CanalWebSocketService;
  let url: string;

  beforeEach(async () => {
    server = createServer();
    const adapterHost = {
      httpAdapter: { getHttpServer: () => server },
    } as unknown as HttpAdapterHost;
    const verifier = {
      verificar: jest.fn(async (token: string) => {
        if (token === 'host-token') return { id: 'host', nombre: 'Host' };
        if (token === 'member-token') return { id: 'member', nombre: 'Member' };
        if (token === 'outsider-token')
          return { id: 'outsider', nombre: 'Outsider' };
        return null;
      }),
    } as unknown as VerificadorIdentidad;
    const sessions = {
      autorizarCanal: jest.fn(
        async (_code: string, identity: { id: string }) =>
          identity.id === 'host' || identity.id === 'member',
      ),
    } as unknown as SesionesJuegoService;
    const moduleRef = {
      get: jest.fn(() => sessions),
    } as unknown as ModuleRef;
    service = new CanalWebSocketService(adapterHost, verifier, moduleRef);
    service.onApplicationBootstrap();
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const { port } = server.address() as AddressInfo;
    url = `ws://127.0.0.1:${port}/canal?codigo=ABC123`;
  });

  afterEach(async () => {
    service.onModuleDestroy();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  async function handshake(
    token?: string,
    queryToken = false,
  ): Promise<number> {
    const protocols =
      token && !queryToken
        ? ['profelink', `profelink-bearer.${token}`]
        : undefined;
    const target = queryToken && token ? `${url}&access_token=${token}` : url;
    const socket = new WebSocket(target, protocols);
    return new Promise<number>((resolve, reject) => {
      socket.once('open', () => {
        socket.close();
        resolve(101);
      });
      socket.once('unexpected-response', (_request, response) => {
        resolve(response.statusCode ?? 0);
      });
      socket.once('error', reject);
    });
  }

  it('rejects missing and invalid JWTs before upgrade', async () => {
    await expect(handshake()).resolves.toBe(401);
    await expect(handshake('fake-token')).resolves.toBe(401);
    await expect(handshake('host-token', true)).resolves.toBe(401);
  });

  it('rejects valid identities that are not registered in the room', async () => {
    await expect(handshake('outsider-token')).resolves.toBe(403);
  });

  it('allows the host and a registered participant to upgrade', async () => {
    await expect(handshake('host-token')).resolves.toBe(101);
    await expect(handshake('member-token')).resolves.toBe(101);
  });
});
