import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Ip,
  Patch,
  Post,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KeysService } from '../crypto/keys.service';
import { OpenIdConfiguration } from '../dominio/tipos';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import {
  ActualizarPerfilDto,
  CambiarPasswordDto,
  RefreshDto,
  VerificarEmailDto,
} from './dto/varios.dto';

function extraerTokenBearer(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly keys: KeysService,
    private readonly config: ConfigService,
  ) {}

  // 1. Registro estándar y compatible con frontend
  @Post('api/v1/auth/register')
  registrarStandard(@Body() datos: RegistroDto, @Ip() ip: string) {
    return this.auth.registrar(datos, ip);
  }

  @Post('perfiles')
  registrarFrontend(@Body() datos: RegistroDto, @Ip() ip: string) {
    return this.auth.registrar(datos, ip);
  }

  // 2. Inicio de sesión estándar y compatible con frontend
  @Post('api/v1/auth/login')
  @HttpCode(200)
  loginStandard(@Body() datos: LoginDto, @Ip() ip: string) {
    return this.auth.iniciarSesion(datos, ip);
  }

  @Post('sesiones')
  @HttpCode(200)
  loginFrontend(@Body() datos: LoginDto, @Ip() ip: string) {
    return this.auth.iniciarSesion(datos, ip);
  }

  // 3. Rotación de Refresh Token
  @Post('api/v1/auth/refresh')
  @HttpCode(200)
  refrescar(@Body() datos: RefreshDto, @Ip() ip: string) {
    return this.auth.refrescar(datos, ip);
  }

  // 4. Cierre de sesión estándar y compatible con frontend
  @Post('api/v1/auth/logout')
  @HttpCode(200)
  async logoutStandard(
    @Body() datos: RefreshDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const token = extraerTokenBearer(authHeader) ?? datos.refreshToken ?? datos.token ?? '';
    await this.auth.cerrarSesion(token);
    return { mensaje: 'Sesión cerrada exitosamente.' };
  }

  @Delete('sesiones/actual')
  @HttpCode(200)
  async logoutFrontend(
    @Headers('authorization') authHeader?: string,
  ) {
    const token = extraerTokenBearer(authHeader) ?? '';
    await this.auth.cerrarSesion(token);
    return { mensaje: 'Sesión cerrada exitosamente.' };
  }

  // 5. Perfil / me
  @Get('api/v1/auth/me')
  async meStandard(@Headers('authorization') authHeader?: string) {
    const token = extraerTokenBearer(authHeader);
    if (!token) throw new UnauthorizedException({ mensaje: 'No autorizado.' });

    const claims = this.keys.verificarAccessToken(token);
    if (!claims) throw new UnauthorizedException({ mensaje: 'Token inválido o expirado.' });

    return this.auth.obtenerPerfil(claims.sub);
  }

  @Get('sesiones/actual')
  async meFrontend(@Headers('authorization') authHeader?: string) {
    const token = extraerTokenBearer(authHeader);
    if (!token) throw new UnauthorizedException({ mensaje: 'No autorizado.' });

    const claims = this.keys.verificarAccessToken(token);
    if (!claims) throw new UnauthorizedException({ mensaje: 'Token inválido o expirado.' });

    const perfil = await this.auth.obtenerPerfil(claims.sub);
    return {
      token,
      perfil,
    };
  }

  // 6. Actualizar perfil (PATCH /me)
  @Patch('api/v1/auth/me')
  async actualizarMe(
    @Body() datos: ActualizarPerfilDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const token = extraerTokenBearer(authHeader);
    if (!token) throw new UnauthorizedException({ mensaje: 'No autorizado.' });

    const claims = this.keys.verificarAccessToken(token);
    if (!claims) throw new UnauthorizedException({ mensaje: 'Token inválido o expirado.' });

    return this.auth.actualizarPerfil(claims.sub, datos);
  }

  // 7. Cambiar contraseña
  @Put('api/v1/auth/change-password')
  @HttpCode(200)
  async cambiarPasswordStandard(
    @Body() datos: CambiarPasswordDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const token = extraerTokenBearer(authHeader);
    if (!token) throw new UnauthorizedException({ mensaje: 'No autorizado.' });

    const claims = this.keys.verificarAccessToken(token);
    if (!claims) throw new UnauthorizedException({ mensaje: 'Token inválido o expirado.' });

    return this.auth.cambiarPassword(claims.sub, datos);
  }

  @Put('perfiles/password')
  @HttpCode(200)
  async cambiarPasswordFrontend(
    @Body() datos: CambiarPasswordDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const token = extraerTokenBearer(authHeader);
    if (!token) throw new UnauthorizedException({ mensaje: 'No autorizado.' });

    const claims = this.keys.verificarAccessToken(token);
    if (!claims) throw new UnauthorizedException({ mensaje: 'Token inválido o expirado.' });

    return this.auth.cambiarPassword(claims.sub, datos);
  }

  // 8. Verificación de correo
  @Post('api/v1/auth/verify-email')
  @HttpCode(200)
  verificarEmail(@Body() datos: VerificarEmailDto) {
    return this.auth.verificarEmail(datos.token);
  }

  // 8. JWKS RFC 7517
  @Get('.well-known/jwks.json')
  jwks() {
    return this.keys.obtenerJwks();
  }

  // 9. OpenID Configuration
  @Get('.well-known/openid-configuration')
  openidConfiguration(): OpenIdConfiguration {
    const issuer = this.config.get<string>('JWT_ISSUER', 'http://localhost:5001').replace(/\/$/, '');
    return {
      issuer,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      token_endpoint: `${issuer}/api/v1/auth/login`,
      userinfo_endpoint: `${issuer}/api/v1/auth/me`,
      response_types_supported: ['token', 'id_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
    };
  }

  // 10. Health checks
  @Get('health/live')
  live() {
    return { status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  ready() {
    return { status: 'ready', service: 'auth-service', timestamp: new Date().toISOString() };
  }

  @Get('salud')
  salud() {
    return { estado: 'disponible', servicio: 'auth-service', hora: new Date().toISOString() };
  }
}
