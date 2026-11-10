import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { IdentidadExterna } from '../autenticacion/identidad-externa';
import { PrismaService } from '../prisma/prisma.service';
import { AvisoSesiones, CambioSesion } from './aviso-sesiones';
import { esAcierto, plazoVencido, puntosDeRespuesta, puntosPorAciertoDe } from './calificacion';
import { CURSO_POR_DEFECTO } from '../cursos/curso-predeterminado';
import { aciertosAcademicos, aportePorcentual, notaDeAciertos } from './nota-academica';
import { codigoSala } from './codigo-sala';
import {
  FilaPregunta,
  FilaSesion,
  cuentaPendiente,
  instantaneaDe,
  leerInstantanea,
  MILISEGUNDOS_CUENTA,
  puntosDeSala,
  PreguntaInstantanea,
  presentarSala,
  SalaPublica,
} from './presentacion-sala';

const INTENTOS_CODIGO = 8;
const SEGUNDOS_SALA = 20;

const arbol = {
  participantes: {
    orderBy: { incorporadoEn: 'asc' as const },
    include: { respuestas: { orderBy: { respondidaEn: 'asc' as const } } },
  },
  cuestionario: {
    include: {
      preguntas: {
        orderBy: { orden: 'asc' as const },
        include: {
          imagen: true,
          opciones: { orderBy: { orden: 'asc' as const } },
        },
      },
    },
  },
};

interface CuestionarioJuego {
  id: string;
  titulo: string;
  eliminadoEn: Date | null;
  preguntas: FilaPregunta[];
}

@Injectable()
export class SesionesJuegoService implements OnModuleDestroy {
  private readonly cierres = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly avisos: AvisoSesiones,
  ) {}

  preparado(): boolean {
    return this.prisma.estaListo();
  }

  onModuleDestroy(): void {
    for (const id of this.cierres.values()) clearTimeout(id);
    this.cierres.clear();
  }

  async crear(
    cuestionarioId: string,
    identidad: IdentidadExterna,
    config?: ConfiguracionAcademica,
  ): Promise<SalaPublica> {
    const cuestionario = await this.cuestionarioJugable(cuestionarioId);
    const academica = await this.prepararAcademica(config, identidad, cuestionario.titulo);
    for (let intento = 0; intento < INTENTOS_CODIGO; intento += 1) {
      try {
        const creada = await this.db().sesionJuego.create({
          data: {
            id: randomUUID(),
            codigo: codigoSala(),
            cuestionarioId: cuestionario.id,
            titulo: cuestionario.titulo,
            anfitrionId: identidad.id,
            anfitrionNombre: identidad.nombre,
            estado: 'esperando',
            preguntaActual: 0,
            segundos: SEGUNDOS_SALA,
            ...academica,
          },
          include: arbol,
        });
        this.avisos.confirmar(aviso('sala-creada', creada.codigo));
        return presentarSala(creada, identidad.id);
      } catch (error) {
        if (codigoPrisma(error) !== 'P2002') throw error;
      }
    }
    throw new ConflictException({
      mensaje: 'No se pudo crear la sala. Intenta de nuevo.',
    });
  }

  async obtener(
    codigo: string,
    identidad: IdentidadExterna,
  ): Promise<SalaPublica> {
    const fila = await this.buscar(codigo);
    this.exigirLecturaFinal(fila, identidad);
    return presentarSala(fila, identidad.id);
  }

  /** Instantánea para el canal. No aplica el permiso de resultados: cada
   * cliente recibe la vista de su propio perfil, también al finalizar. */
  async leerParaEmision(codigo: string): Promise<FilaSesion & { id: string }> {
    return this.buscar(codigo);
  }

  async marcarPresencia(
    codigo: string,
    perfilId: string,
    conectado: boolean,
  ): Promise<void> {
    if (!this.prisma.estaListo()) return;
    const normalizado = codigo.trim().toUpperCase();
    const cambio = await this.db().participante.updateMany({
      where: {
        perfilId,
        conectado: !conectado,
        sesion: { codigo: normalizado },
      },
      data: { conectado },
    });
    if (cambio.count > 0) {
      this.avisos.confirmar(aviso('presencia-actualizada', normalizado));
    }
  }

  async autorizarCanal(
    codigo: string,
    identidad: IdentidadExterna,
  ): Promise<boolean> {
    let fila: FilaSesion;
    try {
      fila = await this.buscar(codigo);
    } catch (error) {
      if (error instanceof NotFoundException) return false;
      throw error;
    }
    return (
      fila.anfitrionId === identidad.id ||
      fila.participantes.some((item) => item.perfilId === identidad.id)
    );
  }

  async unirse(
    codigo: string,
    identidad: IdentidadExterna,
    ficha?: { nombre?: string; avatarId?: string },
  ): Promise<SalaPublica> {
    const sala = await this.transaccion(async (tx) => {
      const normalizado = codigo.trim().toUpperCase();
      await this.bloquear(tx, normalizado);
      const actual = await this.buscarEn(tx, normalizado);
      if (actual.anfitrionId === identidad.id) {
        return actual;
      }
      if (actual.cursoId) {
        const propioYa = actual.participantes.some((participante) => participante.perfilId === identidad.id);
        if (!propioYa) {
          if (actual.cursoId === CURSO_POR_DEFECTO.id) await this.matricularEnPredeterminado(identidad);
          await this.exigirMatricula(actual.cursoId, identidad.id);
        }
      }
      const propio = actual.participantes.find(
        (participante) => participante.perfilId === identidad.id,
      );
      if (actual.estado === 'finalizada') {
        throw new ConflictException({ mensaje: 'Esta partida ya finalizó.' });
      }
      if (!propio && actual.estado !== 'esperando') {
        throw new ConflictException({ mensaje: 'La partida ya fue iniciada.' });
      }
      const pedido = ficha?.nombre?.trim() ?? '';
      const nombre =
        pedido.length >= 2 && pedido.length <= 24 ? pedido : identidad.nombre;
      const avatarId = avatarAceptado(ficha?.avatarId);
      const enEspera = actual.estado === 'esperando';
      const avatarPropio = (actualId?: string | null) =>
        avatarId && (enEspera || !actualId) ? { avatarId } : {};
      if (propio) {
        await tx.participante.update({
          where: {
            sesionId_perfilId: {
              sesionId: actual.id,
              perfilId: identidad.id,
            },
          },
          data: { nombre, conectado: true, ...avatarPropio(propio.avatarId) },
        });
      } else {
        try {
          await tx.participante.create({
            data: {
              id: randomUUID(),
              sesionId: actual.id,
              perfilId: identidad.id,
              nombre,
              conectado: true,
              ...(avatarId ? { avatarId } : {}),
            },
          });
        } catch (error) {
          if (codigoPrisma(error) !== 'P2002') throw error;
          const vigente = await this.buscarEn(tx, normalizado);
          const ya = vigente.participantes.find(
            (participante) => participante.perfilId === identidad.id,
          );
          await tx.participante.update({
            where: {
              sesionId_perfilId: {
                sesionId: actual.id,
                perfilId: identidad.id,
              },
            },
            data: { nombre, conectado: true, ...avatarPropio(ya?.avatarId) },
          });
        }
      }
      return this.buscarEn(tx, normalizado);
    });
    this.avisos.confirmar(aviso('participante-incorporado', sala.codigo));
    return presentarSala(sala, identidad.id);
  }

  async iniciar(
    codigo: string,
    identidad: IdentidadExterna,
  ): Promise<SalaPublica> {
    const sala = await this.transaccion(async (tx) => {
      const normalizado = codigo.trim().toUpperCase();
      await this.bloquear(tx, normalizado);
      const actual = await this.buscarEn(tx, normalizado);
      if (actual.anfitrionId !== identidad.id) {
        throw new ForbiddenException({
          mensaje: 'Solo el anfitrión puede iniciar la partida.',
        });
      }
      if (actual.estado !== 'esperando') {
        throw new ConflictException({ mensaje: 'La partida ya fue iniciada.' });
      }
      if (actual.participantes.length === 0) {
        throw new ConflictException({
          mensaje: 'Todavía no hay participantes.',
        });
      }
      if (actual.cuestionario?.eliminadoEn) {
        throw new ConflictException({
          mensaje: 'El cuestionario ya no está disponible.',
        });
      }
      const preguntas = jugables(actual.cuestionario?.preguntas ?? []);
      const base = instantaneaDe(preguntas);
      const segundos = segundosDe(base.preguntas[0]);
      const iniciadaEn = new Date();
      const abreEn = new Date(iniciadaEn.getTime() + MILISEGUNDOS_CUENTA);
      const instantanea = {
        ...base,
        abreEn: abreEn.toISOString(),
        puntosPorAcierto: puntosPorAciertoDe(actual.cuestionario?.puntosPorAcierto),
      };
      const cambio = await tx.sesionJuego.updateMany({
        where: { id: actual.id, estado: 'esperando' },
        data: {
          estado: 'pregunta',
          preguntaActual: 0,
          segundos,
          iniciadaEn,
          iniciaEn: abreEn,
          cierraEn: new Date(abreEn.getTime() + segundos * 1000),
          elegibles: actual.participantes.map((item) => item.id),
          preguntasInstantanea: instantanea as unknown as Prisma.InputJsonValue,
        },
      });
      if (cambio.count !== 1) {
        throw new ConflictException({ mensaje: 'La partida ya fue iniciada.' });
      }
      return this.buscarEn(tx, normalizado);
    });
    this.avisos.confirmar(aviso('partida-iniciada', sala.codigo));
    this.programarCierre(sala.codigo, sala.cierraEn);
    return presentarSala(sala, identidad.id);
  }

  async responder(
    codigo: string,
    identidad: IdentidadExterna,
    entrada: { valor?: boolean | null; opcionId?: string },
  ): Promise<SalaPublica> {
    const sala = await this.transaccion(async (tx) => {
      const normalizado = codigo.trim().toUpperCase();
      await this.bloquear(tx, normalizado);
      const actual = await this.buscarEn(tx, normalizado);
      if (actual.estado === 'finalizada') {
        throw new ConflictException({ mensaje: 'Esta partida ya finalizó.' });
      }
      if (actual.estado !== 'pregunta') {
        throw new ConflictException({
          mensaje: 'La pregunta ya está cerrada. La respuesta no se acepta.',
        });
      }
      if (cuentaPendiente(actual, new Date())) {
        throw new ConflictException({
          mensaje: 'La cuenta regresiva todavía no termina.',
        });
      }
      if (plazoVencido(actual.cierraEn, new Date())) {
        throw new ConflictException({
          mensaje: 'El tiempo de respuesta terminó.',
        });
      }
      const participante = actual.participantes.find(
        (item) => item.perfilId === identidad.id,
      );
      if (!participante) {
        throw new ForbiddenException({
          mensaje: 'No estás unido a esta sala.',
        });
      }
      const esperados = elegiblesDe(actual);
      if (esperados.length > 0 && !esperados.includes(participante.id)) {
        throw new ConflictException({
          mensaje: 'Esta pregunta empezó antes de que entraras.',
        });
      }
      const pregunta = this.preguntaActiva(actual);
      const seleccion = seleccionDe(entrada, pregunta);
      const repetida = await tx.respuesta.findMany({
        where: { participanteId: participante.id, preguntaId: pregunta.id },
      });
      if (repetida.length > 0) {
        throw new ConflictException({
          mensaje: 'Ya enviaste una respuesta para esta pregunta.',
        });
      }
      try {
        await tx.respuesta.create({
          data: {
            id: randomUUID(),
            sesionId: actual.id,
            participanteId: participante.id,
            preguntaId: pregunta.id,
            opcionId: seleccion.opcionId,
            valor: seleccion.valor,
            aceptada: true,
            tardia: false,
            puntos: 0,
          },
        });
      } catch (error) {
        if (codigoPrisma(error) !== 'P2002') throw error;
        throw new ConflictException({
          mensaje: 'Ya enviaste una respuesta para esta pregunta.',
        });
      }
      const cerro = await this.cerrarSiCompleta(tx, actual);
      return { fila: await this.buscarEn(tx, normalizado), cerro };
    });
    if (sala.cerro) this.cancelarCierre(sala.fila.codigo);
    this.avisos.confirmar(
      aviso(
        sala.cerro ? 'pregunta-cerrada' : 'respuesta-aceptada',
        sala.fila.codigo,
      ),
    );
    return presentarSala(sala.fila, identidad.id);
  }

  async cerrar(
    codigo: string,
    identidad: IdentidadExterna,
  ): Promise<SalaPublica> {
    const sala = await this.transaccion(async (tx) => {
      const normalizado = codigo.trim().toUpperCase();
      await this.bloquear(tx, normalizado);
      const actual = await this.buscarEn(tx, normalizado);
      if (actual.anfitrionId !== identidad.id) {
        throw new ForbiddenException({
          mensaje: 'Solo el anfitrión puede cerrar la pregunta.',
        });
      }
      if (actual.estado !== 'pregunta') {
        throw new ConflictException({
          mensaje: 'No hay una pregunta abierta.',
        });
      }
      if (cuentaPendiente(actual, new Date())) {
        throw new ConflictException({
          mensaje: 'La cuenta regresiva todavía no termina.',
        });
      }
      const cerro = await this.aplicarCierre(tx, actual);
      if (!cerro) {
        throw new ConflictException({
          mensaje: 'No hay una pregunta abierta.',
        });
      }
      return this.buscarEn(tx, normalizado);
    });
    this.cancelarCierre(sala.codigo);
    this.avisos.confirmar(aviso('pregunta-cerrada', sala.codigo));
    return presentarSala(sala, identidad.id);
  }

  /** Cierra la pregunta si el plazo oficial ya venció. No hace nada si sigue abierta. */
  async cerrarPorPlazo(codigo: string): Promise<void> {
    let cerrada = false;
    let normalizado = codigo.trim().toUpperCase();
    try {
      const sala = await this.transaccion(async (tx) => {
        normalizado = codigo.trim().toUpperCase();
        await this.bloquear(tx, normalizado);
        const actual = await this.buscarEn(tx, normalizado);
        if (actual.estado !== 'pregunta') return null;
        if (cuentaPendiente(actual, new Date())) return null;
        if (!plazoVencido(actual.cierraEn, new Date())) return null;
        const cerro = await this.aplicarCierre(tx, actual);
        if (!cerro) return null;
        return this.buscarEn(tx, normalizado);
      });
      if (!sala) return;
      cerrada = true;
      normalizado = sala.codigo;
    } catch {
      return;
    }
    if (!cerrada) return;
    this.cancelarCierre(normalizado);
    this.avisos.confirmar(aviso('pregunta-cerrada', normalizado));
  }

  async avanzar(
    codigo: string,
    identidad: IdentidadExterna,
    desde?: 'cerrada' | 'clasificacion',
  ): Promise<SalaPublica> {
    const sala = await this.transaccion(async (tx) => {
      const normalizado = codigo.trim().toUpperCase();
      await this.bloquear(tx, normalizado);
      const actual = await this.buscarEn(tx, normalizado);
      if (actual.anfitrionId !== identidad.id) {
        throw new ForbiddenException({
          mensaje: 'Solo el anfitrión puede avanzar la partida.',
        });
      }
      if (actual.estado === 'finalizada') {
        throw new ConflictException({ mensaje: 'La partida ya finalizó.' });
      }
      if (desde && actual.estado !== desde) {
        throw new ConflictException({ mensaje: 'La partida ya avanzó.' });
      }
      if (actual.estado === 'cerrada') {
        const cambio = await tx.sesionJuego.updateMany({
          where: {
            id: actual.id,
            estado: 'cerrada',
            preguntaActual: actual.preguntaActual,
          },
          data: { estado: 'clasificacion' },
        });
        if (cambio.count !== 1) {
          throw new ConflictException({
            mensaje: 'Cierra la pregunta antes de avanzar.',
          });
        }
        return this.buscarEn(tx, normalizado);
      }
      if (actual.estado !== 'clasificacion') {
        throw new ConflictException({
          mensaje: 'Cierra la pregunta antes de avanzar.',
        });
      }
      const instantanea = leerInstantanea(actual.preguntasInstantanea);
      const preguntas = instantanea?.preguntas ?? [];
      if (actual.preguntaActual + 1 >= preguntas.length) {
        await this.finalizar(tx, actual, preguntas.length);
      } else {
        const siguiente = preguntas[actual.preguntaActual + 1];
        const segundos = segundosDe(siguiente);
        const iniciaEn = new Date();
        const cambio = await tx.sesionJuego.updateMany({
          where: {
            id: actual.id,
            estado: 'clasificacion',
            preguntaActual: actual.preguntaActual,
          },
          data: {
            estado: 'pregunta',
            preguntaActual: actual.preguntaActual + 1,
            segundos,
            iniciaEn,
            cierraEn: new Date(iniciaEn.getTime() + segundos * 1000),
            elegibles: actual.participantes.map((item) => item.id),
          },
        });
        if (cambio.count !== 1) {
          throw new ConflictException({
            mensaje: 'Muestra la clasificación antes de continuar.',
          });
        }
      }
      return this.buscarEn(tx, normalizado);
    });
    const tipo =
      sala.estado === 'finalizada'
        ? 'sesion-finalizada'
        : sala.estado === 'clasificacion'
          ? 'clasificacion-mostrada'
          : 'pregunta-cambiada';
    if (sala.estado === 'pregunta') {
      this.programarCierre(sala.codigo, sala.cierraEn);
    }
    this.avisos.confirmar(aviso(tipo, sala.codigo));
    return presentarSala(sala, identidad.id);
  }

  private programarCierre(
    codigo: string,
    cierraEn: Date | string | null | undefined,
  ): void {
    this.cancelarCierre(codigo);
    if (!cierraEn) return;
    const espera = new Date(cierraEn).getTime() - Date.now() + 1;
    if (!Number.isFinite(espera)) return;
    const id = setTimeout(() => {
      this.cierres.delete(codigo);
      void this.cerrarPorPlazo(codigo);
    }, Math.max(0, espera));
    id.unref?.();
    this.cierres.set(codigo, id);
  }

  private cancelarCierre(codigo: string): void {
    const id = this.cierres.get(codigo);
    if (id) clearTimeout(id);
    this.cierres.delete(codigo);
  }

  private async cerrarSiCompleta(
    tx: ClienteSesion,
    fila: FilaSesion & { id: string },
  ): Promise<boolean> {
    const pregunta = this.preguntaActiva(fila);
    const esperados = elegiblesDe(fila);
    if (esperados.length === 0) return false;
    const hechas = await tx.respuesta.findMany({
      where: { sesionId: fila.id, preguntaId: pregunta.id, aceptada: true },
    });
    const ids = new Set(hechas.map((item) => item.participanteId));
    if (!esperados.every((id) => ids.has(id))) return false;
    const cerro = await this.aplicarCierre(tx, fila);
    if (!cerro) {
      throw new ConflictException({ mensaje: 'No hay una pregunta abierta.' });
    }
    return true;
  }

  private async aplicarCierre(
    tx: ClienteSesion,
    fila: FilaSesion & { id: string },
  ): Promise<boolean> {
    const pregunta = this.preguntaActiva(fila);
    await this.calificar(tx, fila, pregunta);
    const cambio = await tx.sesionJuego.updateMany({
      where: {
        id: fila.id,
        estado: 'pregunta',
        preguntaActual: fila.preguntaActual,
      },
      data: { estado: 'cerrada', cierraEn: null },
    });
    return cambio.count === 1;
  }

  private async cuestionarioJugable(id: string): Promise<CuestionarioJuego> {
    const fila = await this.db().cuestionario.findFirst({
      where: { id, eliminadoEn: null },
      include: arbol.cuestionario.include,
    });
    if (!fila) {
      throw new NotFoundException({
        mensaje: 'No se encontró el cuestionario.',
      });
    }
    jugables(fila.preguntas);
    return fila;
  }

  private async buscar(codigo: string): Promise<FilaSesion & { id: string }> {
    return this.buscarEn(this.db(), codigo);
  }

  private async buscarEn(
    tx: ClienteSesion,
    codigo: string,
  ): Promise<FilaSesion & { id: string }> {
    const fila = await tx.sesionJuego.findFirst({
      where: { codigo: codigo.trim().toUpperCase() },
      include: arbol,
    });
    if (!fila) {
      throw new NotFoundException({
        mensaje: 'No hay una sala con ese código.',
      });
    }
    return fila;
  }

  private async bloquear(tx: ClienteSesion, codigo: string): Promise<void> {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "SesionJuego" WHERE codigo = ${codigo} FOR UPDATE`,
    );
  }

  private exigirLecturaFinal(
    fila: FilaSesion,
    identidad: IdentidadExterna,
  ): void {
    if (fila.estado !== 'finalizada') return;
    if (fila.anfitrionId === identidad.id) return;
    if (fila.participantes.some((item) => item.perfilId === identidad.id))
      return;
    throw new ForbiddenException({
      mensaje: 'No puedes ver los resultados de esta partida.',
    });
  }

  private preguntaActiva(fila: FilaSesion): PreguntaInstantanea {
    const instantanea = leerInstantanea(fila.preguntasInstantanea);
    const pregunta = instantanea?.preguntas[fila.preguntaActual];
    if (!pregunta) {
      throw new ConflictException({ mensaje: 'No hay una pregunta activa.' });
    }
    return pregunta;
  }

  private async calificar(
    tx: ClienteSesion,
    fila: FilaSesion,
    pregunta: PreguntaInstantanea,
  ): Promise<void> {
    const deLaPregunta = await tx.respuesta.findMany({
      where: { sesionId: fila.id, preguntaId: pregunta.id, aceptada: true },
    });
    const limite = Math.max(1, fila.segundos) * 1000;
    const inicio = fila.iniciaEn
      ? new Date(fila.iniciaEn).getTime()
      : fila.cierraEn
        ? new Date(fila.cierraEn).getTime() - limite
        : Date.now();
    const valorAcierto = puntosDeSala(fila);
    const rapidez = new Map<string, number>();
    for (const respuesta of deLaPregunta) {
      if (respuesta.puntos > 0) continue;
      const puntos = puntosDeRespuesta(esAcierto(pregunta, respuesta), valorAcierto);
      if (puntos === 0) continue;
      const transcurrido = Math.max(
        0,
        new Date(respuesta.respondidaEn ?? inicio).getTime() - inicio,
      );
      await tx.respuesta.update({
        where: { id: respuesta.id },
        data: { puntos },
      });
      rapidez.set(
        respuesta.participanteId,
        (rapidez.get(respuesta.participanteId) ?? 0) + transcurrido,
      );
    }
    for (const participante of fila.participantes) {
      const suyas = await tx.respuesta.findMany({
        where: { participanteId: participante.id },
      });
      const puntaje = suyas.reduce((suma, item) => suma + item.puntos, 0);
      const aciertos = suyas.filter((item) => item.puntos > 0).length;
      await tx.participante.update({
        where: { id: participante.id },
        data: {
          puntaje,
          aciertos,
          tiempoMs: (participante.tiempoMs ?? 0) + (rapidez.get(participante.id) ?? 0),
        },
      });
    }
  }

  private async finalizar(
    tx: ClienteSesion,
    fila: FilaSesion,
    jugadas: number,
  ): Promise<void> {
    const finalizadaEn = new Date();
    const cambio = await tx.sesionJuego.updateMany({
      where: {
        id: fila.id,
        estado: 'clasificacion',
        preguntaActual: fila.preguntaActual,
      },
      data: { estado: 'finalizada', finalizadaEn, cierraEn: null },
    });
    if (cambio.count !== 1) {
      throw new ConflictException({ mensaje: 'La partida ya finalizó.' });
    }
    await tx.resultado.createMany({
      data: fila.participantes.map((participante) => ({
        id: randomUUID(),
        sesionId: fila.id,
        participanteId: participante.id,
        puntuacion: participante.puntaje,
        aciertos: participante.aciertos,
        incorrectas: Math.max(0, jugadas - participante.aciertos),
        finalizadoEn: finalizadaEn,
      })),
    });
    if (fila.modoAcademico === 'evaluacion') {
      await this.escribirNotas(tx, fila, jugadas);
    }
  }

  private async prepararAcademica(
    config: ConfiguracionAcademica | undefined,
    identidad: IdentidadExterna,
    tituloCuestionario: string,
  ) {
    const modo = config?.modo ?? 'practica';
    if (modo === 'practica' && !config?.cursoId) {
      return {
        modoAcademico: 'practica',
        cursoId: null,
        cursoNombre: null,
        nombreEvaluacion: null,
        notaMaxima: 100,
        valorPorcentaje: 0,
        notaMinima: 70,
      };
    }
    if (!config?.cursoId) {
      throw new BadRequestException({ mensaje: 'Elige el curso de la evaluación.' });
    }
    const curso = await this.cursoDelDocente(config.cursoId, identidad.id);
    const notaMaxima = config.notaMaxima ?? 100;
    const valorPorcentaje = config.valorPorcentaje ?? (modo === 'evaluacion' ? 10 : 0);
    const notaMinima = config.notaMinima ?? 70;
    if (modo === 'evaluacion' && !(valorPorcentaje >= 1 && valorPorcentaje <= 100)) {
      throw new BadRequestException({ mensaje: 'Indica qué porcentaje de la nota del curso representa la evaluación.' });
    }
    if (notaMinima > notaMaxima) {
      throw new BadRequestException({ mensaje: 'La nota mínima no puede superar la nota máxima.' });
    }
    const nombre = config.nombreEvaluacion?.trim();
    return {
      modoAcademico: modo,
      cursoId: curso.id,
      cursoNombre: curso.nombre,
      nombreEvaluacion: modo === 'evaluacion' ? nombre || tituloCuestionario : null,
      notaMaxima,
      valorPorcentaje: modo === 'evaluacion' ? valorPorcentaje : 0,
      notaMinima,
    };
  }

  private async cursoDelDocente(cursoId: string, docenteId: string) {
    const cliente = this.prisma.obtener() as unknown as ClienteAcademico;
    if (!cliente.curso) {
      throw new ServiceUnavailableException({ mensaje: 'Los cursos no están disponibles.' });
    }
    const curso = await cliente.curso.findFirst({ where: { id: cursoId, docenteId } });
    if (!curso) {
      throw new ForbiddenException({ mensaje: 'Ese curso no está asignado a tu cuenta.' });
    }
    return curso;
  }

  private async exigirMatricula(cursoId: string, estudianteId: string) {
    const cliente = this.prisma.obtener() as unknown as ClienteAcademico;
    if (!cliente.matricula) {
      throw new ForbiddenException({ mensaje: 'Solo un estudiante matriculado puede entrar a esta evaluación.' });
    }
    const fila = await cliente.matricula.findFirst({ where: { cursoId, estudianteId } });
    if (!fila) {
      throw new ForbiddenException({ mensaje: 'Solo quien pertenece a este curso puede entrar a la partida.' });
    }
  }

  private async matricularEnPredeterminado(identidad: IdentidadExterna) {
    const cliente = this.prisma.obtener() as unknown as ClienteAcademico;
    if (!cliente.curso?.upsert || !cliente.matricula?.upsert) return;
    await cliente.curso.upsert({
      where: { id: CURSO_POR_DEFECTO.id },
      update: {},
      create: {
        id: CURSO_POR_DEFECTO.id,
        nombre: CURSO_POR_DEFECTO.nombre,
        docenteId: CURSO_POR_DEFECTO.docenteId,
      },
    });
    const nombre = identidad.nombre.trim().slice(0, 80) || 'Estudiante';
    await cliente.matricula.upsert({
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
  }

  private async escribirNotas(tx: ClienteSesion, fila: FilaSesion, jugadas: number) {
    const notas = (tx as ClienteSesion & { calificacion?: ClienteNotas }).calificacion;
    const academico = this.prisma.obtener() as unknown as ClienteAcademico;
    if (!notas || !fila.cursoId) return;
    const existentes = await notas.count({ where: { sesionId: fila.id } });
    if (existentes > 0) return;
    const matriculas = new Set(await this.idsMatriculados(academico, fila.cursoId));
    const preguntas = leerInstantanea(fila.preguntasInstantanea)?.preguntas ?? [];
    const total = preguntas.length || jugadas;
    const notaMaxima = fila.notaMaxima ?? 100;
    const valor = fila.valorPorcentaje ?? 0;
    const filas = fila.participantes
      .filter((participante) => matriculas.has(participante.perfilId))
      .map((participante) => {
        const aciertos = aciertosAcademicos(preguntas, participante.respuestas ?? []);
        const nota = notaDeAciertos(aciertos, total, notaMaxima);
        return {
          participante,
          aciertos,
          nota,
          aporte: aportePorcentual(nota, notaMaxima, valor),
        };
      })
      .sort(
        (a, b) =>
          b.participante.puntaje - a.participante.puntaje ||
          b.aciertos - a.aciertos ||
          a.participante.nombre.localeCompare(b.participante.nombre),
      );
    if (filas.length === 0) return;
    await notas.createMany({
      data: filas.map((item, indice) => ({
        id: randomUUID(),
        sesionId: fila.id,
        estudianteId: item.participante.perfilId,
        nombre: item.participante.nombre,
        aciertos: item.aciertos,
        total,
        nota: item.nota,
        aporte: item.aporte,
        posicion: indice + 1,
        puntaje: item.participante.puntaje,
      })),
    });
  }

  private async idsMatriculados(cliente: ClienteAcademico, cursoId: string) {
    if (!cliente.matricula?.findMany) return [];
    const filas = await cliente.matricula.findMany({ where: { cursoId } });
    return filas.map((fila) => fila.estudianteId);
  }

  private db(): ClienteSesion {
    if (!this.prisma.estaListo()) {
      throw new ServiceUnavailableException({
        mensaje: 'La base de datos no está disponible.',
      });
    }
    return this.prisma.obtener() as unknown as ClienteSesion;
  }

  private async transaccion<T>(
    operacion: (tx: ClienteSesion) => Promise<T>,
  ): Promise<T> {
    return this.db().$transaction(operacion, {
      maxWait: 10_000,
      timeout: 60_000,
    });
  }
}

export interface ConfiguracionAcademica {
  modo?: 'practica' | 'evaluacion';
  cursoId?: string;
  nombreEvaluacion?: string;
  notaMaxima?: number;
  valorPorcentaje?: number;
  notaMinima?: number;
}

interface ClienteAcademico {
  curso?: {
    findFirst(args: { where: { id: string; docenteId: string } }): Promise<{ id: string; nombre: string } | null>;
    upsert?(args: {
      where: { id: string };
      update: Record<string, never>;
      create: { id: string; nombre: string; docenteId: string };
    }): Promise<{ id: string; nombre: string }>;
  };
  matricula?: {
    findFirst(args: { where: { cursoId: string; estudianteId: string } }): Promise<{ estudianteId: string } | null>;
    findMany?(args: { where: { cursoId: string } }): Promise<Array<{ estudianteId: string }>>;
    upsert?(args: {
      where: { cursoId_estudianteId: { cursoId: string; estudianteId: string } };
      update: { nombre: string };
      create: { id: string; cursoId: string; estudianteId: string; nombre: string };
    }): Promise<unknown>;
  };
}

interface ClienteNotas {
  count(args: { where: { sesionId: string } }): Promise<number>;
  createMany(args: {
    data: Array<{
      id: string;
      sesionId: string;
      estudianteId: string;
      nombre: string;
      aciertos: number;
      total: number;
      nota: number;
      aporte: number;
      posicion: number;
      puntaje: number;
    }>;
  }): Promise<unknown>;
}

interface ClienteSesion {
  cuestionario: {
    findFirst(args: {
      where: { id: string; eliminadoEn: null };
      include: typeof arbol.cuestionario.include;
    }): Promise<CuestionarioJuego | null>;
  };
  sesionJuego: {
    create(args: {
      data: {
        id: string;
        codigo: string;
        cuestionarioId: string;
        titulo: string;
        anfitrionId: string;
        anfitrionNombre: string;
        estado: 'esperando';
        preguntaActual: number;
        segundos: number;
        modoAcademico?: string;
        cursoId?: string | null;
        cursoNombre?: string | null;
        nombreEvaluacion?: string | null;
        notaMaxima?: number;
        valorPorcentaje?: number;
        notaMinima?: number;
      };
      include: typeof arbol;
    }): Promise<FilaSesion & { id: string; codigo: string }>;
    findFirst(args: {
      where: { codigo: string };
      include: typeof arbol;
    }): Promise<
      | (FilaSesion & { id: string; cuestionario: CuestionarioJuego | null })
      | null
    >;
    updateMany(args: {
      where: { id: string; estado: string; preguntaActual?: number };
      data: {
        estado?: string;
        preguntaActual?: number;
        segundos?: number;
        iniciadaEn?: Date;
        iniciaEn?: Date | null;
        cierraEn?: Date | null;
        elegibles?: string[];
        finalizadaEn?: Date;
        preguntasInstantanea?: Prisma.InputJsonValue;
      };
    }): Promise<{ count: number }>;
  };
  participante: {
    create(args: {
      data: {
        id: string;
        sesionId: string;
        perfilId: string;
        nombre: string;
        avatarId?: string;
        conectado: boolean;
      };
    }): Promise<unknown>;
    update(args: {
      where:
        | { id: string }
        | { sesionId_perfilId: { sesionId: string; perfilId: string } };
      data: {
        nombre?: string;
        avatarId?: string;
        conectado?: boolean;
        puntaje?: number;
        aciertos?: number;
        tiempoMs?: number;
      };
    }): Promise<unknown>;
    updateMany(args: {
      where: {
        perfilId: string;
        conectado: boolean;
        sesion: { codigo: string };
      };
      data: { conectado: boolean };
    }): Promise<{ count: number }>;
  };
  respuesta: {
    findMany(args: {
      where: {
        sesionId?: string;
        preguntaId?: string;
        participanteId?: string;
        aceptada?: boolean;
      };
    }): Promise<
      Array<{
        id: string;
        participanteId: string;
        preguntaId: string;
        opcionId: string | null;
        valor: boolean | null;
        puntos: number;
        respondidaEn?: Date | string;
      }>
    >;
    create(args: {
      data: {
        id: string;
        sesionId: string;
        participanteId: string;
        preguntaId: string;
        opcionId: string | null;
        valor: boolean | null;
        aceptada: boolean;
        tardia: boolean;
        puntos: number;
      };
    }): Promise<unknown>;
    update(args: {
      where: { id: string };
      data: { puntos: number };
    }): Promise<unknown>;
  };
  resultado: {
    createMany(args: {
      data: Array<{
        id: string;
        sesionId: string;
        participanteId: string;
        puntuacion: number;
        aciertos: number;
        incorrectas: number;
        finalizadoEn: Date;
      }>;
    }): Promise<unknown>;
  };
  $queryRaw(consulta: Prisma.Sql): Promise<unknown>;
  $transaction<T>(
    operacion: (tx: ClienteSesion) => Promise<T>,
    opciones?: { maxWait?: number; timeout?: number },
  ): Promise<T>;
}

function jugables(preguntas: FilaPregunta[]): FilaPregunta[] {
  if (preguntas.length === 0) {
    throw new BadRequestException({
      mensaje: 'El cuestionario no tiene preguntas.',
    });
  }
  for (const pregunta of preguntas) {
    const correctas = pregunta.opciones.filter(
      (opcion) => opcion.correcta,
    ).length;
    if (pregunta.opciones.length < 2 || correctas !== 1) {
      throw new BadRequestException({
        mensaje: 'El cuestionario no está listo para jugar.',
      });
    }
  }
  return preguntas;
}

function segundosDe(pregunta: PreguntaInstantanea | undefined): number {
  const segundos = pregunta?.segundos;
  if (segundos === null || segundos === undefined) return SEGUNDOS_SALA;
  if (!Number.isInteger(segundos) || segundos < 5 || segundos > 120)
    return SEGUNDOS_SALA;
  return segundos;
}

function aviso(tipo: CambioSesion, codigo: string) {
  return { tipo, codigo, ocurridoEn: new Date().toISOString() };
}

function seleccionDe(
  entrada: { valor?: boolean | null; opcionId?: string },
  pregunta: PreguntaInstantanea,
): { opcionId: string | null; valor: boolean | null } {
  const opcionId = entrada.opcionId?.trim() ?? '';
  if (opcionId) {
    const existe = pregunta.opciones.some((opcion) => opcion.id === opcionId);
    if (!existe) {
      throw new BadRequestException({
        mensaje: 'Esa opción no pertenece a la pregunta.',
      });
    }
    return { opcionId, valor: null };
  }
  if (typeof entrada.valor === 'boolean') {
    return { opcionId: null, valor: entrada.valor };
  }
  throw new BadRequestException({ mensaje: 'Elige una respuesta.' });
}

function elegiblesDe(fila: FilaSesion): string[] {
  if (fila.elegibles && fila.elegibles.length > 0) return fila.elegibles;
  return fila.participantes.map((item) => item.id);
}

function avatarAceptado(valor: string | undefined): string | undefined {
  const pedido = valor?.trim() ?? '';
  return /^[a-z][a-z-]{1,30}[a-z]$/.test(pedido) ? pedido : undefined;
}

function codigoPrisma(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error)
    return String(error.code);
  return '';
}
