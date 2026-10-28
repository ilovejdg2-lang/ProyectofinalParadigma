import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AlmacenUsuarios,
  AlmacenUsuariosMemoria,
  RefreshTokenEntidad,
  UsuarioEntidad,
  VerificationTokenEntidad,
} from './almacen-usuarios';
import { EntidadPoliticaDominio } from '../dominio/politica-dominio';
import { RolUsuario, EstadoUsuario } from '../dominio/tipos';

@Injectable()
export class AlmacenUsuariosHibrido extends AlmacenUsuarios implements OnModuleInit {
  private readonly logger = new Logger(AlmacenUsuariosHibrido.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoria: AlmacenUsuariosMemoria,
  ) {
    super();
  }

  async onModuleInit() {
    if (this.prisma.estaListo()) {
      await this.sembrarSiEsNecesario();
    }
  }

  private async sembrarSiEsNecesario() {
    try {
      const db = this.prisma.obtener();
      const count = await db.user.count();
      if (count > 0) return;

      this.logger.log('Sembrando datos iniciales en PostgreSQL...');
      const inst = await db.institution.upsert({
        where: { id: 'inst-una' },
        update: {},
        create: {
          id: 'inst-una',
          name: 'Universidad Nacional de Costa Rica (UNA)',
          isActive: true,
        },
      });

      await db.emailDomainPolicy.upsert({
        where: { domain: 'una.cr' },
        update: {},
        create: {
          domain: 'una.cr',
          institutionId: inst.id,
          defaultRole: 'teacher',
          autoGrantRole: true,
          requiresVerification: true,
        },
      });

      await db.emailDomainPolicy.upsert({
        where: { domain: 'est.una.ac.cr' },
        update: {},
        create: {
          domain: 'est.una.ac.cr',
          institutionId: inst.id,
          defaultRole: 'student',
          autoGrantRole: true,
          requiresVerification: false,
        },
      });

      const salt = await bcrypt.genSalt(10);
      const teacherHash = await bcrypt.hash('Profesor123!', salt);
      const studentHash = await bcrypt.hash('Estudiante123!', salt);
      const adminHash = await bcrypt.hash('Admin123!', salt);

      await db.user.createMany({
        data: [
          {
            id: 'perfil-demo-docente',
            email: 'profesor@una.cr',
            passwordHash: teacherHash,
            displayName: 'Docente de prueba',
            role: 'teacher',
            emailVerified: true,
            institutionId: inst.id,
            status: 'Active',
          },
          {
            id: 'perfil-demo-estudiante',
            email: 'estudiante@est.una.ac.cr',
            passwordHash: studentHash,
            displayName: 'Estudiante de prueba',
            role: 'student',
            emailVerified: true,
            institutionId: inst.id,
            status: 'Active',
          },
          {
            id: 'perfil-demo-admin',
            email: 'admin@una.cr',
            passwordHash: adminHash,
            displayName: 'Administrador ProfeLink',
            role: 'admin',
            emailVerified: true,
            institutionId: inst.id,
            status: 'Active',
          },
        ],
      });
      this.logger.log('Datos iniciales sembrados exitosamente en PostgreSQL.');
    } catch (error) {
      this.logger.warn(`Error al sembrar en PostgreSQL: ${error}`);
    }
  }

  async buscarPorEmail(email: string): Promise<UsuarioEntidad | null> {
    if (!this.prisma.estaListo()) {
      return this.memoria.buscarPorEmail(email);
    }
    const db = this.prisma.obtener();
    const u = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      displayName: u.displayName,
      role: u.role as RolUsuario,
      emailVerified: u.emailVerified,
      institutionId: u.institutionId,
      status: u.status as EstadoUsuario,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  async buscarPorId(id: string): Promise<UsuarioEntidad | null> {
    if (!this.prisma.estaListo()) {
      return this.memoria.buscarPorId(id);
    }
    const db = this.prisma.obtener();
    const u = await db.user.findUnique({ where: { id } });
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      displayName: u.displayName,
      role: u.role as RolUsuario,
      emailVerified: u.emailVerified,
      institutionId: u.institutionId,
      status: u.status as EstadoUsuario,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  async crearUsuario(datos: Omit<UsuarioEntidad, 'id' | 'createdAt' | 'updatedAt'>): Promise<UsuarioEntidad> {
    if (!this.prisma.estaListo()) {
      return this.memoria.crearUsuario(datos);
    }
    const db = this.prisma.obtener();
    const u = await db.user.create({
      data: {
        id: crypto.randomUUID(),
        email: datos.email.trim().toLowerCase(),
        passwordHash: datos.passwordHash,
        displayName: datos.displayName,
        role: datos.role,
        emailVerified: datos.emailVerified,
        institutionId: datos.institutionId,
        status: datos.status,
      },
    });
    return {
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      displayName: u.displayName,
      role: u.role as RolUsuario,
      emailVerified: u.emailVerified,
      institutionId: u.institutionId,
      status: u.status as EstadoUsuario,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  async actualizarUsuario(id: string, datos: Partial<UsuarioEntidad>): Promise<UsuarioEntidad> {
    if (!this.prisma.estaListo()) {
      return this.memoria.actualizarUsuario(id, datos);
    }
    const db = this.prisma.obtener();
    const u = await db.user.update({
      where: { id },
      data: {
        ...(datos.displayName ? { displayName: datos.displayName } : {}),
        ...(datos.emailVerified !== undefined ? { emailVerified: datos.emailVerified } : {}),
        ...(datos.status ? { status: datos.status } : {}),
        ...(datos.role ? { role: datos.role } : {}),
      },
    });
    return {
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      displayName: u.displayName,
      role: u.role as RolUsuario,
      emailVerified: u.emailVerified,
      institutionId: u.institutionId,
      status: u.status as EstadoUsuario,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  async listarPoliticas(): Promise<EntidadPoliticaDominio[]> {
    if (!this.prisma.estaListo()) {
      return this.memoria.listarPoliticas();
    }
    const db = this.prisma.obtener();
    const pols = await db.emailDomainPolicy.findMany();
    return pols.map((p) => ({
      domain: p.domain,
      defaultRole: p.defaultRole,
      autoGrantRole: p.autoGrantRole,
      requiresVerification: p.requiresVerification,
      institutionId: p.institutionId,
    }));
  }

  async guardarRefreshToken(token: RefreshTokenEntidad): Promise<void> {
    if (!this.prisma.estaListo()) {
      return this.memoria.guardarRefreshToken(token);
    }
    const db = this.prisma.obtener();
    await db.refreshToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        familyId: token.familyId,
        expiresAt: token.expiresAt,
        createdByIp: token.createdByIp,
      },
    });
  }

  async buscarRefreshToken(tokenHash: string): Promise<RefreshTokenEntidad | null> {
    if (!this.prisma.estaListo()) {
      return this.memoria.buscarRefreshToken(tokenHash);
    }
    const db = this.prisma.obtener();
    const t = await db.refreshToken.findUnique({ where: { tokenHash } });
    if (!t) return null;
    return {
      id: t.id,
      userId: t.userId,
      tokenHash: t.tokenHash,
      familyId: t.familyId,
      expiresAt: t.expiresAt,
      revokedAt: t.revokedAt,
      replacedBy: t.replacedBy,
      createdByIp: t.createdByIp,
      createdAt: t.createdAt,
    };
  }

  async revocarRefreshToken(id: string, replacedBy?: string): Promise<void> {
    if (!this.prisma.estaListo()) {
      return this.memoria.revocarRefreshToken(id, replacedBy);
    }
    const db = this.prisma.obtener();
    await db.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        replacedBy: replacedBy ?? null,
      },
    });
  }

  async revocarFamilia(familyId: string): Promise<void> {
    if (!this.prisma.estaListo()) {
      return this.memoria.revocarFamilia(familyId);
    }
    const db = this.prisma.obtener();
    await db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revocarTodasLasSesiones(userId: string): Promise<void> {
    if (!this.prisma.estaListo()) {
      return this.memoria.revocarTodasLasSesiones(userId);
    }
    const db = this.prisma.obtener();
    await db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async guardarVerificationToken(token: VerificationTokenEntidad): Promise<void> {
    if (!this.prisma.estaListo()) {
      return this.memoria.guardarVerificationToken(token);
    }
    const db = this.prisma.obtener();
    await db.emailVerificationToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      },
    });
  }

  async buscarVerificationToken(tokenHash: string): Promise<VerificationTokenEntidad | null> {
    if (!this.prisma.estaListo()) {
      return this.memoria.buscarVerificationToken(tokenHash);
    }
    const db = this.prisma.obtener();
    const t = await db.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!t) return null;
    return {
      id: t.id,
      userId: t.userId,
      tokenHash: t.tokenHash,
      expiresAt: t.expiresAt,
      usedAt: t.usedAt,
      createdAt: t.createdAt,
    };
  }

  async marcarVerificationTokenUsado(id: string): Promise<void> {
    if (!this.prisma.estaListo()) {
      return this.memoria.marcarVerificationTokenUsado(id);
    }
    const db = this.prisma.obtener();
    await db.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
