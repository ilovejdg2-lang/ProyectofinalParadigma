import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { RolUsuario, EstadoUsuario } from '../dominio/tipos';
import { EntidadPoliticaDominio } from '../dominio/politica-dominio';

export interface UsuarioEntidad {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: RolUsuario;
  emailVerified: boolean;
  institutionId?: string | null;
  status: EstadoUsuario;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenEntidad {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedBy?: string | null;
  createdByIp?: string | null;
  createdAt: Date;
}

export interface VerificationTokenEntidad {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

export abstract class AlmacenUsuarios {
  abstract buscarPorEmail(email: string): Promise<UsuarioEntidad | null>;
  abstract buscarPorId(id: string): Promise<UsuarioEntidad | null>;
  abstract crearUsuario(datos: Omit<UsuarioEntidad, 'id' | 'createdAt' | 'updatedAt'>): Promise<UsuarioEntidad>;
  abstract actualizarUsuario(id: string, datos: Partial<UsuarioEntidad>): Promise<UsuarioEntidad>;
  abstract listarPoliticas(): Promise<EntidadPoliticaDominio[]>;
  abstract guardarRefreshToken(token: RefreshTokenEntidad): Promise<void>;
  abstract buscarRefreshToken(tokenHash: string): Promise<RefreshTokenEntidad | null>;
  abstract revocarRefreshToken(id: string, replacedBy?: string): Promise<void>;
  abstract revocarFamilia(familyId: string): Promise<void>;
  abstract revocarTodasLasSesiones(userId: string): Promise<void>;
  abstract guardarVerificationToken(token: VerificationTokenEntidad): Promise<void>;
  abstract buscarVerificationToken(tokenHash: string): Promise<VerificationTokenEntidad | null>;
  abstract marcarVerificationTokenUsado(id: string): Promise<void>;
}

@Injectable()
export class AlmacenUsuariosMemoria extends AlmacenUsuarios implements OnModuleInit {
  private readonly logger = new Logger(AlmacenUsuariosMemoria.name);

  private usuarios: Map<string, UsuarioEntidad> = new Map();
  private politicas: EntidadPoliticaDominio[] = [];
  private refreshTokens: Map<string, RefreshTokenEntidad> = new Map();
  private verificationTokens: Map<string, VerificationTokenEntidad> = new Map();

  async onModuleInit() {
    await this.sembrarDatosIniciales();
  }

  async sembrarDatosIniciales() {
    // 1. Políticas de dominio semilla para Universidad Nacional (UNA)
    this.politicas = [
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

    // 2. Usuarios demo (docente, docente frontend, estudiantes y admin)
    const salt = await bcrypt.genSalt(10);
    const teacherPasswordHash = await bcrypt.hash('Profesor123!', salt);
    const demoFrontendPasswordHash = await bcrypt.hash('Demo-2026', salt);
    const studentPasswordHash = await bcrypt.hash('Estudiante123!', salt);
    const fatimaPasswordHash = await bcrypt.hash('F1T3M12107', salt);
    const adminPasswordHash = await bcrypt.hash('Admin123!', salt);

    const teacherDemo: UsuarioEntidad = {
      id: 'perfil-demo-docente',
      email: 'profesor@una.cr',
      passwordHash: teacherPasswordHash,
      displayName: 'Docente de prueba',
      role: 'teacher',
      emailVerified: true,
      institutionId: 'inst-una',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const teacherFrontendDemo: UsuarioEntidad = {
      id: 'perfil-demo',
      email: 'docente.demo@profelink.test',
      passwordHash: demoFrontendPasswordHash,
      displayName: 'Docente de prueba',
      role: 'teacher',
      emailVerified: true,
      institutionId: 'inst-una',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const studentDemo: UsuarioEntidad = {
      id: 'perfil-demo-estudiante',
      email: 'estudiante@est.una.ac.cr',
      passwordHash: studentPasswordHash,
      displayName: 'Estudiante de prueba',
      role: 'student',
      emailVerified: true,
      institutionId: 'inst-una',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const fatimaStudent: UsuarioEntidad = {
      id: 'perfil-fatima-una',
      email: 'fatima.carrillo.garcia@est.una.ac.cr',
      passwordHash: fatimaPasswordHash,
      displayName: 'Fátima Carrillo García',
      role: 'student',
      emailVerified: true,
      institutionId: 'inst-una',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const adminDemo: UsuarioEntidad = {
      id: 'perfil-demo-admin',
      email: 'admin@una.cr',
      passwordHash: adminPasswordHash,
      displayName: 'Administrador ProfeLink',
      role: 'admin',
      emailVerified: true,
      institutionId: 'inst-una',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.usuarios.set(teacherDemo.email, teacherDemo);
    this.usuarios.set(teacherFrontendDemo.email, teacherFrontendDemo);
    this.usuarios.set(studentDemo.email, studentDemo);
    this.usuarios.set(fatimaStudent.email, fatimaStudent);
    this.usuarios.set(adminDemo.email, adminDemo);

    this.logger.log('Almacén en memoria inicializado con usuarios demo y políticas de la UNA.');
  }

  async buscarPorEmail(email: string): Promise<UsuarioEntidad | null> {
    const normalizado = email.trim().toLowerCase();
    return this.usuarios.get(normalizado) ?? null;
  }

  async buscarPorId(id: string): Promise<UsuarioEntidad | null> {
    for (const usuario of this.usuarios.values()) {
      if (usuario.id === id) return usuario;
    }
    return null;
  }

  async crearUsuario(datos: Omit<UsuarioEntidad, 'id' | 'createdAt' | 'updatedAt'>): Promise<UsuarioEntidad> {
    const id = crypto.randomUUID();
    const ahora = new Date();
    const usuario: UsuarioEntidad = {
      ...datos,
      id,
      email: datos.email.trim().toLowerCase(),
      createdAt: ahora,
      updatedAt: ahora,
    };
    this.usuarios.set(usuario.email, usuario);
    return usuario;
  }

  async actualizarUsuario(id: string, datos: Partial<UsuarioEntidad>): Promise<UsuarioEntidad> {
    const usuario = await this.buscarPorId(id);
    if (!usuario) throw new Error('Usuario no encontrado');

    const actualizado: UsuarioEntidad = {
      ...usuario,
      ...datos,
      updatedAt: new Date(),
    };
    this.usuarios.set(actualizado.email, actualizado);
    return actualizado;
  }

  async listarPoliticas(): Promise<EntidadPoliticaDominio[]> {
    return [...this.politicas];
  }

  async guardarRefreshToken(token: RefreshTokenEntidad): Promise<void> {
    this.refreshTokens.set(token.tokenHash, token);
  }

  async buscarRefreshToken(tokenHash: string): Promise<RefreshTokenEntidad | null> {
    return this.refreshTokens.get(tokenHash) ?? null;
  }

  async revocarRefreshToken(id: string, replacedBy?: string): Promise<void> {
    for (const [hash, token] of this.refreshTokens.entries()) {
      if (token.id === id) {
        token.revokedAt = new Date();
        if (replacedBy) token.replacedBy = replacedBy;
        this.refreshTokens.set(hash, token);
        break;
      }
    }
  }

  async revocarFamilia(familyId: string): Promise<void> {
    const ahora = new Date();
    for (const [hash, token] of this.refreshTokens.entries()) {
      if (token.familyId === familyId) {
        token.revokedAt = token.revokedAt ?? ahora;
        this.refreshTokens.set(hash, token);
      }
    }
  }

  async revocarTodasLasSesiones(userId: string): Promise<void> {
    const ahora = new Date();
    for (const [hash, token] of this.refreshTokens.entries()) {
      if (token.userId === userId) {
        token.revokedAt = token.revokedAt ?? ahora;
        this.refreshTokens.set(hash, token);
      }
    }
  }

  async guardarVerificationToken(token: VerificationTokenEntidad): Promise<void> {
    this.verificationTokens.set(token.tokenHash, token);
  }

  async buscarVerificationToken(tokenHash: string): Promise<VerificationTokenEntidad | null> {
    return this.verificationTokens.get(tokenHash) ?? null;
  }

  async marcarVerificationTokenUsado(id: string): Promise<void> {
    for (const [hash, token] of this.verificationTokens.entries()) {
      if (token.id === id) {
        token.usedAt = new Date();
        this.verificationTokens.set(hash, token);
        break;
      }
    }
  }
}
