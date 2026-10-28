import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AlmacenUsuarios, AlmacenUsuariosMemoria } from '../almacen/almacen-usuarios';
import { KeysService } from '../crypto/keys.service';
import { normalizarEmail, resolverRolYPolitica } from '../dominio/politica-dominio';

describe('AuthService & Dominio de Políticas de Correo', () => {
  let authService: AuthService;
  let keysService: KeysService;
  let almacen: AlmacenUsuariosMemoria;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        KeysService,
        AlmacenUsuariosMemoria,
        {
          provide: AlmacenUsuarios,
          useExisting: AlmacenUsuariosMemoria,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultVal: any) => {
              if (key === 'REGISTRATION_MODE') return 'open';
              if (key === 'EMAIL_AUTO_VERIFY') return 'true';
              if (key === 'JWT_ISSUER') return 'http://localhost:5001';
              if (key === 'JWT_AUDIENCE') return 'profelink-actividades';
              if (key === 'RSA_KEYS_DIR') return 'datos/keys-test';
              return defaultVal;
            },
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    keysService = module.get<KeysService>(KeysService);
    almacen = module.get<AlmacenUsuariosMemoria>(AlmacenUsuariosMemoria);

    keysService.onModuleInit();
    await almacen.onModuleInit();
  });

  describe('1. Resolución de Rol y Políticas de Dominio', () => {
    const politicas = [
      {
        domain: 'una.cr',
        defaultRole: 'teacher',
        autoGrantRole: true,
        requiresVerification: true,
        institutionId: 'inst-una',
      },
      {
        domain: 'est.una.ac.cr',
        defaultRole: 'student',
        autoGrantRole: true,
        requiresVerification: false,
        institutionId: 'inst-una',
      },
    ];

    it('asigna rol teacher al dominio institucional una.cr', () => {
      const res = resolverRolYPolitica('profesor.ciencias@una.cr', politicas, 'open', true);
      expect(res.rol).toBe('teacher');
      expect(res.institutionId).toBe('inst-una');
    });

    it('asigna rol student al dominio estudiantil est.una.ac.cr', () => {
      const res = resolverRolYPolitica('estudiante123@est.una.ac.cr', politicas, 'open', true);
      expect(res.rol).toBe('student');
      expect(res.institutionId).toBe('inst-una');
    });

    it('asigna rol student por defecto en modo open a dominios externos', () => {
      const res = resolverRolYPolitica('usuario@gmail.com', politicas, 'open', true);
      expect(res.rol).toBe('student');
    });

    it('rechaza dominios externos si el modo es domains-only', () => {
      expect(() => {
        resolverRolYPolitica('usuario@gmail.com', politicas, 'domains-only', true);
      }).toThrow('no está autorizado');
    });

    it('normaliza correos con mayúsculas y espacios', () => {
      expect(normalizarEmail('  Estudiante.Nuevo@UNA.CR ')).toBe('estudiante.nuevo@una.cr');
    });
  });

  describe('2. Emisión y Validación de Tokens RS256 con Claves Asimétricas', () => {
    it('firma y verifica tokens RS256 correctamente', () => {
      const token = keysService.firmarAccessToken({
        id: 'usr-123',
        email: 'profesor@una.cr',
        displayName: 'Profesor Carlos',
        role: 'teacher',
      });

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const claims = keysService.verificarAccessToken(token);
      expect(claims).not.toBeNull();
      expect(claims?.sub).toBe('usr-123');
      expect(claims?.role).toBe('teacher');
      expect(claims?.aud).toBe('profelink-actividades');
      expect(claims?.iss).toBe('http://localhost:5001');
    });

    it('expone clave pública en formato RFC 7517 JWKS', () => {
      const jwks = keysService.obtenerJwks();
      expect(jwks.keys).toBeDefined();
      expect(jwks.keys.length).toBeGreaterThan(0);
      expect(jwks.keys[0].kty).toBe('RSA');
      expect(jwks.keys[0].alg).toBe('RS256');
      expect(jwks.keys[0].kid).toBe(keysService.obtenerKid());
    });
  });

  describe('3. Registro, Autenticación y Cuentas Semilla', () => {
    it('inicia sesión con el docente demo sembrado', async () => {
      const res = await authService.iniciarSesion({
        correo: 'profesor@una.cr',
        contrasena: 'Profesor123!',
      } as any);

      expect(res.token).toBeDefined();
      expect(res.refreshToken).toBeDefined();
      expect(res.perfil.rol).toBe('teacher');
      expect(res.perfil.correo).toBe('profesor@una.cr');
    });

    it('inicia sesión con el estudiante demo sembrado', async () => {
      const res = await authService.iniciarSesion({
        correo: 'estudiante@est.una.ac.cr',
        contrasena: 'Estudiante123!',
      } as any);

      expect(res.token).toBeDefined();
      expect(res.perfil.rol).toBe('student');
    });

    it('rechaza contraseñas incorrectas con mensaje genérico', async () => {
      await expect(
        authService.iniciarSesion({
          correo: 'profesor@una.cr',
          contrasena: 'Incorrecta999!',
        } as any),
      ).rejects.toThrow('Correo o contraseña incorrectos.');
    });

    it('registra nuevo usuario asignando rol automáticamente por dominio', async () => {
      const res = await authService.registrar({
        nombre: 'Dra. María Vargas',
        correo: 'maria.vargas@una.cr',
        contrasena: 'Segura1234!',
        obtenerNombre() { return 'Dra. María Vargas'; },
        obtenerEmail() { return 'maria.vargas@una.cr'; },
        obtenerPassword() { return 'Segura1234!'; },
      } as any);

      expect(res.perfil.rol).toBe('teacher');
      expect(res.perfil.correo).toBe('maria.vargas@una.cr');
    });
  });

  describe('4. Rotación de Refresh Tokens y Detección de Reutilización', () => {
    it('rota el refresh token y emite un nuevo access token', async () => {
      const sesion = await authService.iniciarSesion({
        correo: 'estudiante@est.una.ac.cr',
        contrasena: 'Estudiante123!',
      } as any);

      const primerRefresh = sesion.refreshToken;
      const rotada = await authService.refrescar({
        obtenerRefreshToken() { return primerRefresh; },
      } as any);

      expect(rotada.token).toBeDefined();
      expect(rotada.refreshToken).not.toBe(primerRefresh);

      // Si se intenta reutilizar el refresh token anterior (ya rotado), debe detectar la reutilización
      await expect(
        authService.refrescar({
          obtenerRefreshToken() { return primerRefresh; },
        } as any),
      ).rejects.toThrow('Violación de seguridad detectada: intento de reutilización');
    });
  });

  describe('5. Cambio de Contraseña y Revocación de Sesiones', () => {
    it('cambia la contraseña verificando la actual y permite iniciar sesión con la nueva', async () => {
      const docente = await almacen.buscarPorEmail('profesor@una.cr');
      expect(docente).not.toBeNull();

      // Contraseña actual incorrecta
      await expect(
        authService.cambiarPassword(docente!.id, {
          contrasenaActual: 'ClaveEquivocada!',
          nuevaContrasena: 'NuevaClaveSegura2026!',
        } as any),
      ).rejects.toThrow('La contraseña actual es incorrecta.');

      // Cambio exitoso
      const resultado = await authService.cambiarPassword(docente!.id, {
        contrasenaActual: 'Profesor123!',
        nuevaContrasena: 'NuevaClaveSegura2026!',
      } as any);

      expect(resultado.mensaje).toBe('Contraseña actualizada exitosamente.');

      // Iniciar sesión con la nueva contraseña funciona
      const nuevaSesion = await authService.iniciarSesion({
        correo: 'profesor@una.cr',
        contrasena: 'NuevaClaveSegura2026!',
      } as any);
      expect(nuevaSesion.token).toBeDefined();

      // Iniciar sesión con la contraseña antigua ya no funciona
      await expect(
        authService.iniciarSesion({
          correo: 'profesor@una.cr',
          contrasena: 'Profesor123!',
        } as any),
      ).rejects.toThrow('Correo o contraseña incorrectos.');
    });
  });
});
