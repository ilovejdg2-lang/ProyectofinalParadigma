import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { AlmacenUsuarios, RefreshTokenEntidad, UsuarioEntidad } from '../almacen/almacen-usuarios';
import { KeysService } from '../crypto/keys.service';
import { normalizarEmail, resolverRolYPolitica } from '../dominio/politica-dominio';
import { PerfilPublico, TokensRespuesta } from '../dominio/tipos';
import {
  ActualizarPerfilDto,
  CambiarPasswordDto,
  extraerNombreActualizar,
  extraerPasswordActual,
  extraerPasswordNueva,
  extraerRefreshToken,
  RefreshDto,
} from './dto/varios.dto';
import {
  extraerEmailRegistro,
  extraerNombreRegistro,
  extraerPasswordRegistro,
  RegistroDto,
} from './dto/registro.dto';
import { extraerEmail, extraerPassword, LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private modoRegistro: 'open' | 'domains-only' = 'open';
  private autoVerificarEmail = false;
  private refreshDays = 7;

  constructor(
    private readonly almacen: AlmacenUsuarios,
    private readonly keys: KeysService,
    private readonly config: ConfigService,
  ) {
    this.modoRegistro = (this.config.get<string>('REGISTRATION_MODE', 'open') as 'open' | 'domains-only');
    this.autoVerificarEmail = this.config.get<string>('EMAIL_AUTO_VERIFY', 'true') === 'true';
    this.refreshDays = Number(this.config.get<number>('JWT_REFRESH_DAYS', 7));
  }

  private hashearToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generarTokenOpaco(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private formatearPerfil(u: UsuarioEntidad): PerfilPublico {
    return {
      id: u.id,
      nombre: u.displayName,
      correo: u.email,
      rol: u.role,
      emailVerificado: u.emailVerified,
    };
  }

  async registrar(datos: RegistroDto, ip?: string): Promise<TokensRespuesta> {
    const nombre = extraerNombreRegistro(datos);
    const email = extraerEmailRegistro(datos);
    const password = extraerPasswordRegistro(datos);

    const existente = await this.almacen.buscarPorEmail(email);
    if (existente) {
      throw new ConflictException('Ya existe un perfil con ese correo.');
    }

    const politicas = await this.almacen.listarPoliticas();
    const resultadoPolitica = resolverRolYPolitica(
      email,
      politicas,
      this.modoRegistro,
      this.autoVerificarEmail,
    );

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const usuario = await this.almacen.crearUsuario({
      email,
      passwordHash,
      displayName: nombre,
      role: resultadoPolitica.rol,
      emailVerified: resultadoPolitica.emailVerificado,
      institutionId: resultadoPolitica.institutionId ?? null,
      status: resultadoPolitica.requiereVerificacion ? 'PendingVerification' : 'Active',
    });

    if (resultadoPolitica.requiereVerificacion) {
      const tokenVerif = this.generarTokenOpaco();
      await this.almacen.guardarVerificationToken({
        id: crypto.randomUUID(),
        userId: usuario.id,
        tokenHash: this.hashearToken(tokenVerif),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        createdAt: new Date(),
      });
      this.logger.log(`[Email Verification] Token para ${email}: ${tokenVerif}`);
    }

    return this.emitirTokens(usuario, ip);
  }

  async iniciarSesion(datos: LoginDto, ip?: string): Promise<TokensRespuesta> {
    const email = extraerEmail(datos);
    const password = extraerPassword(datos);

    const usuario = await this.almacen.buscarPorEmail(email);
    if (!usuario) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const valida = await bcrypt.compare(password, usuario.passwordHash);
    if (!valida) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    if (usuario.status === 'Locked') {
      throw new UnauthorizedException('La cuenta está bloqueada.');
    }

    return this.emitirTokens(usuario, ip);
  }

  async refrescar(datos: RefreshDto, ip?: string): Promise<TokensRespuesta> {
    const refreshTokenOpaco = extraerRefreshToken(datos);
    const hash = this.hashearToken(refreshTokenOpaco);

    const tokenEntidad = await this.almacen.buscarRefreshToken(hash);
    if (!tokenEntidad) {
      throw new UnauthorizedException('El refresh token no es válido.');
    }

    // Detección de reutilización: si ya fue revocado, posible robo de token
    if (tokenEntidad.revokedAt) {
      this.logger.warn(`Intento de reutilización detectado en familia ${tokenEntidad.familyId}`);
      await this.almacen.revocarFamilia(tokenEntidad.familyId);
      throw new UnauthorizedException(
        'Violación de seguridad detectada: intento de reutilización de sesión. Por favor inicia sesión nuevamente.',
      );
    }

    if (tokenEntidad.expiresAt < new Date()) {
      throw new UnauthorizedException('El refresh token ha expirado.');
    }

    const usuario = await this.almacen.buscarPorId(tokenEntidad.userId);
    if (!usuario || usuario.status === 'Locked') {
      throw new UnauthorizedException('La sesión no es válida.');
    }

    // Rotar refresh token dentro de la misma familia
    const nuevoOpaco = this.generarTokenOpaco();
    const nuevoHash = this.hashearToken(nuevoOpaco);
    const nuevoId = crypto.randomUUID();

    const nuevoToken: RefreshTokenEntidad = {
      id: nuevoId,
      userId: usuario.id,
      tokenHash: nuevoHash,
      familyId: tokenEntidad.familyId,
      expiresAt: new Date(Date.now() + this.refreshDays * 24 * 60 * 60 * 1000),
      createdByIp: ip ?? null,
      createdAt: new Date(),
    };

    await this.almacen.guardarRefreshToken(nuevoToken);
    await this.almacen.revocarRefreshToken(tokenEntidad.id, nuevoId);

    const accessToken = this.keys.firmarAccessToken({
      id: usuario.id,
      email: usuario.email,
      displayName: usuario.displayName,
      role: usuario.role,
      institutionId: usuario.institutionId,
    });

    return {
      token: accessToken,
      refreshToken: nuevoOpaco,
      perfil: this.formatearPerfil(usuario),
    };
  }

  async cerrarSesion(tokenORefreshToken: string): Promise<void> {
    if (!tokenORefreshToken) return;
    const hash = this.hashearToken(tokenORefreshToken);
    const token = await this.almacen.buscarRefreshToken(hash);
    if (token) {
      await this.almacen.revocarFamilia(token.familyId);
    }
  }

  async verificarEmail(token: string): Promise<{ mensaje: string }> {
    const hash = this.hashearToken(token);
    const entidad = await this.almacen.buscarVerificationToken(hash);

    if (!entidad || entidad.usedAt || entidad.expiresAt < new Date()) {
      throw new BadRequestException({ mensaje: 'El token de verificación no es válido o ha expirado.' });
    }

    await this.almacen.marcarVerificationTokenUsado(entidad.id);
    await this.almacen.actualizarUsuario(entidad.userId, {
      emailVerified: true,
      status: 'Active',
    });

    return { mensaje: 'Correo electrónico verificado exitosamente.' };
  }

  async obtenerPerfil(userId: string): Promise<PerfilPublico> {
    const u = await this.almacen.buscarPorId(userId);
    if (!u) throw new UnauthorizedException({ mensaje: 'Usuario no encontrado.' });
    return this.formatearPerfil(u);
  }

  async actualizarPerfil(userId: string, datos: ActualizarPerfilDto): Promise<PerfilPublico> {
    const nombre = extraerNombreActualizar(datos);
    if (!nombre) {
      const actual = await this.almacen.buscarPorId(userId);
      if (!actual) throw new UnauthorizedException({ mensaje: 'Usuario no encontrado.' });
      return this.formatearPerfil(actual);
    }

    const u = await this.almacen.actualizarUsuario(userId, { displayName: nombre });
    return this.formatearPerfil(u);
  }

  async cambiarPassword(userId: string, datos: CambiarPasswordDto): Promise<{ mensaje: string }> {
    const contrasenaActual = extraerPasswordActual(datos);
    const nuevaContrasena = extraerPasswordNueva(datos);

    const usuario = await this.almacen.buscarPorId(userId);
    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const valida = await bcrypt.compare(contrasenaActual, usuario.passwordHash);
    if (!valida) {
      throw new BadRequestException('La contraseña actual es incorrecta.');
    }

    if (contrasenaActual === nuevaContrasena) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(nuevaContrasena, salt);

    await this.almacen.actualizarUsuario(userId, { passwordHash });
    await this.almacen.revocarTodasLasSesiones(userId);

    this.logger.log(`Contraseña actualizada para el usuario ${usuario.email}. Todas las sesiones anteriores fueron revocadas.`);
    return { mensaje: 'Contraseña actualizada exitosamente.' };
  }

  private async emitirTokens(usuario: UsuarioEntidad, ip?: string): Promise<TokensRespuesta> {
    const accessToken = this.keys.firmarAccessToken({
      id: usuario.id,
      email: usuario.email,
      displayName: usuario.displayName,
      role: usuario.role,
      institutionId: usuario.institutionId,
    });

    const refreshTokenOpaco = this.generarTokenOpaco();
    const tokenHash = this.hashearToken(refreshTokenOpaco);
    const familyId = crypto.randomUUID();

    await this.almacen.guardarRefreshToken({
      id: crypto.randomUUID(),
      userId: usuario.id,
      tokenHash,
      familyId,
      expiresAt: new Date(Date.now() + this.refreshDays * 24 * 60 * 60 * 1000),
      createdByIp: ip ?? null,
      createdAt: new Date(),
    });

    return {
      token: accessToken,
      refreshToken: refreshTokenOpaco,
      perfil: this.formatearPerfil(usuario),
    };
  }
}
