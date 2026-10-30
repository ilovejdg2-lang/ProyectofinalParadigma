import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CUESTIONARIOS_BANCO,
  MODOS_JUEGO,
  PREGUNTAS_KANBAN_ACADEMICAS,
  SESIONES_DEMOSTRACION,
} from './datos-banco';
import { FiltrosBancoDto } from './dto/filtros-banco.dto';
import {
  CuestionarioSemilla,
  DefinicionModoJuego,
  PreguntaSemilla,
} from './estructura-banco';

export interface PreguntaReutilizable {
  id: string;
  cuestionarioId: string;
  cuestionarioTitulo: string;
  enunciado: string;
  orden: number;
  categoria: string;
  subtema: string;
  dificultad: 'facil' | 'medio' | 'dificil';
  modoRecomendado: 'en-vivo' | 'practica' | 'evaluacion' | 'desafio';
  segundos: number;
  explicacion?: string;
  imagenUrl?: string;
  opciones: Array<{
    id: string;
    texto: string;
    orden: number;
  }>;
}

export interface ModoConDemostracion extends DefinicionModoJuego {
  cuestionarios: Array<{
    id: string;
    titulo: string;
    categoria: string;
    dificultad: 'facil' | 'medio' | 'dificil';
    totalPreguntas: number;
  }>;
  sesionesDemostracion: Array<{
    codigo: string;
    titulo: string;
    modo: string;
    participantes: number;
  }>;
}

@Injectable()
export class BancoPreguntasService {
  constructor(private readonly prisma: PrismaService) {}

  async listarPreguntas(
    filtros: FiltrosBancoDto = {},
  ): Promise<PreguntaReutilizable[]> {
    const mapa = new Map<string, PreguntaReutilizable>();

    for (const cuestionario of CUESTIONARIOS_BANCO) {
      for (const pregunta of cuestionario.preguntas) {
        mapa.set(
          pregunta.id,
          this.aReutilizable(cuestionario, pregunta),
        );
      }
    }

    if (this.prisma.estaListo()) {
      try {
        const db = this.prisma.obtener() as unknown as {
          cuestionario?: {
            findMany(args: unknown): Promise<
              Array<{
                id: string;
                titulo: string;
                categoria: string;
                dificultad: 'facil' | 'medio' | 'dificil';
                preguntas?: Array<{
                  id: string;
                  enunciado: string;
                  orden: number;
                  segundos: number | null;
                  imagen?: { url: string } | null;
                  opciones: Array<{ id: string; texto: string; orden: number }>;
                }>;
              }>
            >;
          };
        };
        const filas =
          (await db.cuestionario?.findMany({
            where: { eliminadoEn: null },
            include: {
              preguntas: {
                orderBy: { orden: 'asc' },
                include: {
                  imagen: true,
                  opciones: { orderBy: { orden: 'asc' } },
                },
              },
            },
          })) ?? [];

        for (const fila of filas) {
          for (const pregunta of fila.preguntas ?? []) {
            if (mapa.has(pregunta.id)) continue;
            mapa.set(pregunta.id, {
              id: pregunta.id,
              cuestionarioId: fila.id,
              cuestionarioTitulo: fila.titulo,
              enunciado: pregunta.enunciado,
              orden: pregunta.orden,
              categoria: fila.categoria,
              subtema: fila.categoria,
              dificultad: fila.dificultad,
              modoRecomendado: 'en-vivo',
              segundos: pregunta.segundos ?? 20,
              ...(pregunta.imagen?.url ? { imagenUrl: pregunta.imagen.url } : {}),
              opciones: pregunta.opciones.map((o) => ({
                id: o.id,
                texto: o.texto,
                orden: o.orden,
              })),
            });
          }
        }
      } catch {
        // Si la consulta opcional falla, se mantiene el banco semilla en memoria
      }
    }

    return [...mapa.values()].filter((item) =>
      this.coincideFiltro(item, filtros),
    );
  }

  obtenerBancoKanban() {
    const cuestionariosKanban = CUESTIONARIOS_BANCO.filter(
      (c) => c.categoria.toLowerCase() === 'kanban',
    );
    const subtemas = [
      ...new Set(
        PREGUNTAS_KANBAN_ACADEMICAS.map((p) => p.subtema).filter(Boolean),
      ),
    ];
    return {
      tema: 'Kanban e Ingeniería de Flujo Ágil',
      totalCuestionarios: cuestionariosKanban.length,
      totalPreguntas: PREGUNTAS_KANBAN_ACADEMICAS.length,
      subtemas,
      cuestionarios: cuestionariosKanban.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        descripcion: c.descripcion,
        categoria: c.categoria,
        dificultad: c.dificultad,
        modo: c.modo,
        etiquetas: c.etiquetas,
        imagenUrl: c.imagenUrl,
        totalPreguntas: c.preguntas.length,
        preguntas: c.preguntas.map((p) => ({
          id: p.id,
          orden: p.orden,
          enunciado: p.enunciado,
          subtema: p.subtema ?? 'Kanban',
          dificultad: p.dificultad ?? c.dificultad,
          modoRecomendado: p.modoRecomendado ?? c.modo,
          segundos: p.segundos ?? 20,
          explicacion: p.explicacion,
          opciones: p.opciones.map((o) => ({
            id: o.id,
            texto: o.texto,
            orden: o.orden,
          })),
        })),
      })),
    };
  }

  obtenerModosDemostracion(): ModoConDemostracion[] {
    return MODOS_JUEGO.map((modo) => ({
      ...modo,
      cuestionarios: CUESTIONARIOS_BANCO.filter((c) => c.modo === modo.id).map(
        (c) => ({
          id: c.id,
          titulo: c.titulo,
          categoria: c.categoria,
          dificultad: c.dificultad,
          totalPreguntas: c.preguntas.length,
        }),
      ),
      sesionesDemostracion: SESIONES_DEMOSTRACION.filter(
        (s) => s.modo === modo.id,
      ).map((s) => ({
        codigo: s.codigo,
        titulo: s.titulo,
        modo: s.modo,
        participantes: s.participantes.length,
      })),
    }));
  }

  private aReutilizable(
    cuestionario: CuestionarioSemilla,
    pregunta: PreguntaSemilla,
  ): PreguntaReutilizable {
    return {
      id: pregunta.id,
      cuestionarioId: cuestionario.id,
      cuestionarioTitulo: cuestionario.titulo,
      enunciado: pregunta.enunciado,
      orden: pregunta.orden,
      categoria: pregunta.categoria ?? cuestionario.categoria,
      subtema: pregunta.subtema ?? cuestionario.categoria,
      dificultad: pregunta.dificultad ?? cuestionario.dificultad,
      modoRecomendado: pregunta.modoRecomendado ?? cuestionario.modo,
      segundos: pregunta.segundos ?? 20,
      ...(pregunta.explicacion ? { explicacion: pregunta.explicacion } : {}),
      ...(pregunta.imagenUrl ? { imagenUrl: pregunta.imagenUrl } : {}),
      opciones: pregunta.opciones.map((o) => ({
        id: o.id,
        texto: o.texto,
        orden: o.orden,
      })),
    };
  }

  private coincideFiltro(
    item: PreguntaReutilizable,
    filtros: FiltrosBancoDto,
  ): boolean {
    if (
      filtros.categoria &&
      item.categoria.toLowerCase() !== filtros.categoria.trim().toLowerCase()
    ) {
      return false;
    }
    if (
      filtros.subtema &&
      !item.subtema
        .toLowerCase()
        .includes(filtros.subtema.trim().toLowerCase())
    ) {
      return false;
    }
    if (filtros.dificultad && item.dificultad !== filtros.dificultad) {
      return false;
    }
    if (filtros.modo && item.modoRecomendado !== filtros.modo) {
      return false;
    }
    const texto = filtros.texto?.trim().toLowerCase() ?? '';
    if (texto.length > 0) {
      const buscable = [
        item.enunciado,
        item.categoria,
        item.subtema,
        item.cuestionarioTitulo,
        item.explicacion ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!buscable.includes(texto)) return false;
    }
    return true;
  }
}

