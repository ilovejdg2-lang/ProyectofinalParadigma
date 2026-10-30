import { Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { AlmacenPersistenciaLocal } from './almacen-persistencia';

export type EstadoBaseDatos = 'no-configurada' | 'disponible' | 'no-disponible';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private cliente: PrismaClient | null = null;
  private respaldoLocal: AlmacenPersistenciaLocal =
    new AlmacenPersistenciaLocal();
  private motivo: EstadoBaseDatos = 'no-configurada';

  constructor(@Optional() private readonly config?: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.conectar();
  }

  async onModuleDestroy(): Promise<void> {
    await this.cliente?.$disconnect();
    this.cliente = null;
  }

  estado(): EstadoBaseDatos {
    return this.motivo;
  }

  estaListo(): boolean {
    return this.cliente !== null || this.respaldoLocal !== null;
  }

  obtener(): PrismaClient {
    if (this.cliente) {
      return this.cliente;
    }
    return this.respaldoLocal as unknown as PrismaClient;
  }

  private async conectar(): Promise<void> {
    const conexion = this.config?.get<string>('DIRECT_URL')?.trim();
    if (!conexion || conexion.includes('PROJECT_REF')) {
      this.motivo = 'no-configurada';
      return;
    }

    const adapter = new PrismaPg({
      connectionString: conexion,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
    const cliente = new PrismaClient({ adapter });

    try {
      await cliente.$queryRaw`SELECT 1`;
      this.cliente = cliente;
      this.motivo = 'disponible';
    } catch {
      await cliente.$disconnect().catch(() => undefined);
      this.motivo = 'no-disponible';
    }
  }
}
