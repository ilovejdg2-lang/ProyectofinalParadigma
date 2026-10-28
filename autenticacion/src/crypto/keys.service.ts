import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ClaimToken, JwksResponse, RolUsuario } from '../dominio/tipos';

@Injectable()
export class KeysService implements OnModuleInit {
  private readonly logger = new Logger(KeysService.name);
  private privateKeyPem!: string;
  private publicKeyPem!: string;
  private kid!: string;
  private issuer!: string;
  private audience!: string;
  private accessMinutes = 15;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.issuer = this.config.get<string>('JWT_ISSUER', 'http://localhost:5001');
    this.audience = this.config.get<string>('JWT_AUDIENCE', 'profelink-actividades');
    this.accessMinutes = Number(this.config.get<number>('JWT_ACCESS_MINUTES', 15));

    this.cargarOGenerarClaves();
  }

  private cargarOGenerarClaves() {
    const keysDir = path.resolve(
      process.cwd(),
      this.config.get<string>('RSA_KEYS_DIR', 'datos/keys'),
    );

    const privateKeyPath = path.join(keysDir, 'private.key');
    const publicKeyPath = path.join(keysDir, 'public.key');

    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
      this.privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
      this.publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');
      this.logger.log(`Claves RSA cargadas desde ${keysDir}`);
    } else {
      this.logger.log(`Generando nuevo par de claves RSA 2048-bit en ${keysDir}...`);
      if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
      }

      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      this.privateKeyPem = privateKey;
      this.publicKeyPem = publicKey;

      fs.writeFileSync(privateKeyPath, privateKey, { encoding: 'utf8', mode: 0o600 });
      fs.writeFileSync(publicKeyPath, publicKey, { encoding: 'utf8', mode: 0o644 });
      this.logger.log(`Par de claves RSA generado y guardado exitosamente.`);
    }

    // Calcular Key ID determinista (primeros 16 caracteres de SHA-256 de la clave pública)
    this.kid = crypto
      .createHash('sha256')
      .update(this.publicKeyPem.trim())
      .digest('hex')
      .slice(0, 16);
  }

  obtenerKid(): string {
    return this.kid;
  }

  obtenerPublicKeyPem(): string {
    return this.publicKeyPem;
  }

  obtenerJwks(): JwksResponse {
    const keyObject = crypto.createPublicKey(this.publicKeyPem);
    const jwk = keyObject.export({ format: 'jwk' });

    return {
      keys: [
        {
          kty: jwk.kty || 'RSA',
          use: 'sig',
          alg: 'RS256',
          kid: this.kid,
          n: jwk.n || '',
          e: jwk.e || 'AQAB',
        },
      ],
    };
  }

  firmarAccessToken(usuario: {
    id: string;
    email: string;
    displayName: string;
    role: RolUsuario;
    institutionId?: string | null;
  }): string {
    const ahora = Math.floor(Date.now() / 1000);
    const exp = ahora + this.accessMinutes * 60;
    const jti = crypto.randomUUID();

    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: this.kid,
    };

    const payload: ClaimToken = {
      iss: this.issuer,
      aud: this.audience,
      sub: usuario.id,
      email: usuario.email,
      name: usuario.displayName,
      role: usuario.role,
      jti,
      iat: ahora,
      exp,
      ...(usuario.institutionId ? { inst: usuario.institutionId } : {}),
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const input = `${headerB64}.${payloadB64}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(input);
    signer.end();
    const signatureB64 = signer.sign(this.privateKeyPem, 'base64url');

    return `${input}.${signatureB64}`;
  }

  verificarAccessToken(token: string): ClaimToken | null {
    try {
      const partes = token.split('.');
      if (partes.length !== 3) return null;

      const [headerB64, payloadB64, signatureB64] = partes;
      const input = `${headerB64}.${payloadB64}`;

      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(input);
      verifier.end();

      const valido = verifier.verify(this.publicKeyPem, signatureB64, 'base64url');
      if (!valido) return null;

      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8'),
      ) as ClaimToken;

      const ahora = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < ahora) {
        return null; // Expirado
      }

      if (payload.aud !== this.audience) {
        return null; // Audiencia inválida
      }

      if (payload.iss !== this.issuer) {
        return null; // Emisor inválido
      }

      return payload;
    } catch {
      return null;
    }
  }
}
