import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export type EstadoBaseDatos = 'no-configurada' | 'disponible' | 'no-disponible';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private cliente: PrismaClient | null = null;
  private motivo: EstadoBaseDatos = 'no-configurada';

  constructor(private readonly config: ConfigService) {}

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
    return this.cliente !== null;
  }

  obtener(): PrismaClient {
    if (!this.cliente) {
      throw new Error('PostgreSQL no está disponible.');
    }
    return this.cliente;
  }

  private async conectar(): Promise<void> {
    const conexion = this.config.get<string>('DIRECT_URL')?.trim();
    if (!conexion) {
      this.motivo = 'no-configurada';
      this.logger.log('DIRECT_URL no configurada; operando con almacenamiento seguro en memoria/fallback.');
      return;
    }

    try {
      const adapter = new PrismaPg({
        connectionString: conexion,
        max: 5,
        connectionTimeoutMillis: 5000,
      });
      const cliente = new PrismaClient({ adapter });

      await cliente.$queryRaw`SELECT 1`;
      this.cliente = cliente;
      this.motivo = 'disponible';
      this.logger.log('Conexión con PostgreSQL (Supabase) establecida con éxito.');
    } catch (error) {
      this.motivo = 'no-disponible';
      this.logger.warn(`No se pudo conectar a PostgreSQL: ${error instanceof Error ? error.message : error}. Se usará almacenamiento en memoria.`);
    }
  }
}
