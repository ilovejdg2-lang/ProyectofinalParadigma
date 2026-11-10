import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IdentidadExterna } from '../autenticacion/identidad-externa';
import { PrismaService } from '../prisma/prisma.service';
import { CURSO_POR_DEFECTO } from './curso-predeterminado';

export interface FilaEvaluacion {
  codigo: string;
  nombre: string;
  cursoId: string | null;
  cursoNombre: string | null;
  fecha: string | null;
  notaMaxima: number;
  valorPorcentaje: number;
  notaMinima: number;
  participantes: number;
  promedio: number | null;
  notaAlta: number | null;
  notaBaja: number | null;
  aprobacion: number | null;
  calificaciones: FilaNota[];
}

export interface FilaNota {
  estudianteId: string;
  nombre: string;
  aciertos: number;
  total: number;
  nota: number;
  notaMaxima: number;
  aporte: number;
  posicion: number;
  puntaje: number;
}

@Injectable()
export class CursosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(identidad: IdentidadExterna) {
    this.exigirDocente(identidad);
    const cursos = await this.db().curso.findMany({
      where: { docenteId: identidad.id },
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { matriculas: true } } },
    });
    return cursos.map((curso) => ({
      id: curso.id,
      nombre: curso.nombre,
      estudiantes: curso._count.matriculas,
    }));
  }

  async crear(identidad: IdentidadExterna, nombre: string) {
    this.exigirDocente(identidad);
    const limpio = nombre.trim();
    const curso = await this.db().curso.create({
      data: { id: randomUUID(), nombre: limpio, docenteId: identidad.id },
    });
    return { id: curso.id, nombre: curso.nombre, estudiantes: 0 };
  }

  async entrarPredeterminado(identidad: IdentidadExterna) {
    const db = this.db();
    await db.curso.upsert({
      where: { id: CURSO_POR_DEFECTO.id },
      update: {},
      create: {
        id: CURSO_POR_DEFECTO.id,
        nombre: CURSO_POR_DEFECTO.nombre,
        docenteId: CURSO_POR_DEFECTO.docenteId,
      },
    });
    const nombre = identidad.nombre.trim().slice(0, 80) || 'Estudiante';
    await db.matricula.upsert({
      where: {
        cursoId_estudianteId: { cursoId: CURSO_POR_DEFECTO.id, estudianteId: identidad.id },
      },
      update: { nombre },
      create: {
        id: randomUUID(),
        cursoId: CURSO_POR_DEFECTO.id,
        estudianteId: identidad.id,
        nombre,
      },
    });
    return { id: CURSO_POR_DEFECTO.id, nombre: CURSO_POR_DEFECTO.nombre };
  }

  async matricular(identidad: IdentidadExterna, cursoId: string, estudianteId: string, nombre: string) {
    this.exigirDocente(identidad);
    const curso = await this.cursoPropio(identidad.id, cursoId);
    await this.db().matricula.upsert({
      where: { cursoId_estudianteId: { cursoId: curso.id, estudianteId } },
      update: { nombre: nombre.trim() },
      create: {
        id: randomUUID(),
        cursoId: curso.id,
        estudianteId,
        nombre: nombre.trim(),
      },
    });
    return { cursoId: curso.id, estudianteId, nombre: nombre.trim() };
  }

  async evaluaciones(identidad: IdentidadExterna, cursoId: string) {
    const docente = this.esDocente(identidad);
    if (docente) await this.cursoPropio(identidad.id, cursoId);
    const sesiones = await this.db().sesionJuego.findMany({
      where: { cursoId, modoAcademico: 'evaluacion', estado: 'finalizada' },
      orderBy: { finalizadaEn: 'desc' },
      include: { calificaciones: true },
    });
    return sesiones
      .map((sesion) => this.presentar(sesion, docente ? null : identidad.id))
      .filter((fila) => docente || fila.calificaciones.length > 0);
  }

  async detalle(identidad: IdentidadExterna, codigo: string): Promise<FilaEvaluacion> {
    const sesion = await this.buscar(codigo);
    const docente = this.esDocente(identidad) && sesion.anfitrionId === identidad.id;
    if (!docente && !sesion.calificaciones.some((nota) => nota.estudianteId === identidad.id)) {
      throw new ForbiddenException({ mensaje: 'No puedes ver las notas de esta evaluación.' });
    }
    return this.presentar(sesion, docente ? null : identidad.id);
  }

  async csv(identidad: IdentidadExterna, codigo: string): Promise<string> {
    const sesion = await this.buscar(codigo);
    if (!this.esDocente(identidad) || sesion.anfitrionId !== identidad.id) {
      throw new ForbiddenException({ mensaje: 'Solo el docente de la evaluación puede exportar las notas.' });
    }
    const fila = this.presentar(sesion, null);
    const encabezado = 'Estudiante,Aciertos,Nota,Aporte,Posicion';
    const lineas = fila.calificaciones.map((nota) =>
      [
        csv(nota.nombre),
        `${nota.aciertos}/${nota.total}`,
        `${nota.nota}/${nota.notaMaxima}`,
        String(nota.aporte),
        String(nota.posicion),
      ].join(','),
    );
    return `\uFEFF${[encabezado, ...lineas].join('\n')}\n`;
  }

  private presentar(
    sesion: {
      codigo: string;
      nombreEvaluacion: string | null;
      titulo: string;
      cursoId: string | null;
      cursoNombre: string | null;
      finalizadaEn: Date | null;
      notaMaxima: number;
      valorPorcentaje: number;
      notaMinima: number;
      calificaciones: Array<{
        estudianteId: string;
        nombre: string;
        aciertos: number;
        total: number;
        nota: number;
        aporte: number;
        posicion: number;
        puntaje: number;
      }>;
    },
    soloEstudiante: string | null,
  ): FilaEvaluacion {
    const visibles = sesion.calificaciones
      .filter((nota) => !soloEstudiante || nota.estudianteId === soloEstudiante)
      .sort((a, b) => a.posicion - b.posicion);
    const notas = sesion.calificaciones.map((nota) => nota.nota);
    const promedio = notas.length ? Math.round(notas.reduce((suma, nota) => suma + nota, 0) / notas.length) : null;
    const aprobados = sesion.calificaciones.filter((nota) => nota.nota >= sesion.notaMinima).length;
    return {
      codigo: sesion.codigo,
      nombre: sesion.nombreEvaluacion || sesion.titulo,
      cursoId: sesion.cursoId,
      cursoNombre: sesion.cursoNombre,
      fecha: sesion.finalizadaEn ? sesion.finalizadaEn.toISOString() : null,
      notaMaxima: sesion.notaMaxima,
      valorPorcentaje: sesion.valorPorcentaje,
      notaMinima: sesion.notaMinima,
      participantes: sesion.calificaciones.length,
      promedio: soloEstudiante ? null : promedio,
      notaAlta: soloEstudiante || !notas.length ? null : Math.max(...notas),
      notaBaja: soloEstudiante || !notas.length ? null : Math.min(...notas),
      aprobacion: soloEstudiante || !notas.length ? null : Math.round((aprobados / notas.length) * 100),
      calificaciones: visibles.map((nota) => ({
        estudianteId: nota.estudianteId,
        nombre: nota.nombre,
        aciertos: nota.aciertos,
        total: nota.total,
        nota: nota.nota,
        notaMaxima: sesion.notaMaxima,
        aporte: nota.aporte,
        posicion: nota.posicion,
        puntaje: nota.puntaje,
      })),
    };
  }

  private async buscar(codigo: string) {
    const sesion = await this.db().sesionJuego.findFirst({
      where: { codigo: codigo.trim().toUpperCase(), modoAcademico: 'evaluacion' },
      include: { calificaciones: true },
    });
    if (!sesion) throw new NotFoundException({ mensaje: 'No hay una evaluación con ese código.' });
    return sesion;
  }

  private async cursoPropio(docenteId: string, cursoId: string) {
    const curso = await this.db().curso.findFirst({ where: { id: cursoId, docenteId } });
    if (!curso) throw new ForbiddenException({ mensaje: 'Ese curso no está asignado a tu cuenta.' });
    return curso;
  }

  private exigirDocente(identidad: IdentidadExterna) {
    if (!this.esDocente(identidad)) {
      throw new ForbiddenException({ mensaje: 'Solo un docente puede administrar cursos.' });
    }
  }

  private esDocente(identidad: IdentidadExterna) {
    return identidad.role === 'teacher' || identidad.role === 'admin';
  }

  private db() {
    if (!this.prisma.estaListo()) {
      throw new ServiceUnavailableException({ mensaje: 'La base de datos no está disponible.' });
    }
    return this.prisma.obtener();
  }
}

function csv(valor: string) {
  return `"${valor.replaceAll('"', '""')}"`;
}
