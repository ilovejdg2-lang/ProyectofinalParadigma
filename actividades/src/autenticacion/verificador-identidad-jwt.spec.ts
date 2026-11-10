import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { VerificadorIdentidadJwt } from './verificador-identidad-jwt';

describe('VerificadorIdentidadJwt', () => {
  const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicKey = keys.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString();
  const config = {
    get: (key: string, fallback?: string) =>
      ({
        JWT_PUBLIC_KEY: publicKey,
        JWT_AUDIENCE: 'profelink-actividades',
        JWT_ISSUER: 'http://localhost:5001',
      })[key] ?? fallback,
  } as ConfigService;
  const verifier = new VerificadorIdentidadJwt(config);

  function token(payload: Record<string, unknown>) {
    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    ).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const data = `${header}.${body}`;
    const signature = crypto
      .sign('RSA-SHA256', Buffer.from(data), keys.privateKey)
      .toString('base64url');
    return `${data}.${signature}`;
  }

  const goodClaims = () => ({
    sub: 'member-1',
    exp: Math.floor(Date.now() / 1000) + 60,
    iss: 'http://localhost:5001',
    aud: 'profelink-actividades',
  });

  it('accepts a correctly signed token with required claims', async () => {
    await expect(
      verifier.verificar(token(goodClaims())),
    ).resolves.toMatchObject({
      id: 'member-1',
    });
  });

  it('rejects demo shortcut tokens', async () => {
    await expect(verifier.verificar('token-demo')).resolves.toBeNull();
  });

  it.each([
    [
      'missing expiration',
      {
        sub: 'member-1',
        iss: 'http://localhost:5001',
        aud: 'profelink-actividades',
      },
    ],
    [
      'missing issuer',
      {
        sub: 'member-1',
        exp: Math.floor(Date.now() / 1000) + 60,
        aud: 'profelink-actividades',
      },
    ],
    [
      'wrong issuer',
      {
        sub: 'member-1',
        exp: Math.floor(Date.now() / 1000) + 60,
        iss: 'https://attacker.invalid',
        aud: 'profelink-actividades',
      },
    ],
    [
      'wrong audience',
      {
        sub: 'member-1',
        exp: Math.floor(Date.now() / 1000) + 60,
        iss: 'http://localhost:5001',
        aud: 'other-service',
      },
    ],
    [
      'not yet valid',
      {
        sub: 'member-1',
        exp: Math.floor(Date.now() / 1000) + 60,
        nbf: Math.floor(Date.now() / 1000) + 120,
        iss: 'http://localhost:5001',
        aud: 'profelink-actividades',
      },
    ],
  ])('rejects token with %s', async (_case, claims) => {
    await expect(verifier.verificar(token(claims))).resolves.toBeNull();
  });
});
