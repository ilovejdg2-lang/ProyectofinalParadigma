import { BadRequestException, ConflictException } from '@nestjs/common';
import { IdentidadExterna } from '../autenticacion/identidad-externa';
import { CUESTIONARIOS_BANCO } from '../banco-preguntas/datos-banco';
import {
  ModoJuego,
  ProgresoCategoria,
  ProgresoUsuario,
} from '../banco-preguntas/estructura-banco';
import { esAcierto } from '../sesiones-juego/calificacion';
import {
  FilaPregunta,
  FilaSesion,
  instantaneaDe,
  leerInstantanea,
  presentarResultado,
  ResumenPublico,
} from '../sesiones-juego/presentacion-sala';
import { RespuestaPartidaDto } from './dto/guardar-partida.dto';

export interface RespuestaValidada {
  preguntaId: string;
  opcionId: string | null;
  valor: boolean | null;
  aceptada: boolean;
  tardia: boolean;
  puntos: number;
}

export interface ResultadoPartidaValidado {
  puntuacion: number;
  aciertos: number;
  incorrectas: number;
  totalPreguntas: number;
  respuestas: RespuestaValidada[];
}

export function idsEquivalentesUsuario(id: string): string[] {
  if (id === 'perfil-demo' || id === 'perfil-demo-docente') {
    return ['perfil-demo', 'perfil-demo-docente'];
  }
  return [id];
}

export function validarRespuestasDePartida(
  preguntas: FilaPregunta[],
  respuestasEntrada: RespuestaPartidaDto[],
  puntuacionReportada?: number,
): ResultadoPartidaValidado {
  if (preguntas.length === 0) {
    throw new BadRequestException({
      mensaje: 'El cuestionario no tiene preguntas.',
    });
  }

  const instantanea = instantaneaDe(preguntas);
  const mapaPreguntas = new Map(
    instantanea.preguntas.map((pregunta) => [pregunta.id, pregunta]),
  );

  const preguntasVistas = new Set<string>();
  const respuestasValidadas: RespuestaValidada[] = [];

  for (const item of respuestasEntrada) {
    const preguntaId = item.preguntaId?.trim();
    if (!preguntaId) {
      throw new BadRequestException({
        mensaje: 'Cada respuesta debe indicar la pregunta.',
      });
    }
    if (preguntasVistas.has(preguntaId)) {
      throw new ConflictException({
        mensaje:
          'No se permiten respuestas duplicadas para la misma pregunta.',
      });
    }
    preguntasVistas.add(preguntaId);

    const pregunta = mapaPreguntas.get(preguntaId);
    if (!pregunta) {
      throw new BadRequestException({
        mensaje:
          'Una de las respuestas hace referencia a una pregunta que no pertenece al cuestionario.',
      });
    }

    const opcionId = item.opcionId?.trim() || null;
    if (opcionId) {
      const existeOpcion = pregunta.opciones.some(
        (opcion) => opcion.id === opcionId,
      );
      if (!existeOpcion) {
        throw new BadRequestException({
          mensaje: 'Esa opción no pertenece a la pregunta.',
        });
      }
    } else if (typeof item.valor !== 'boolean') {
      throw new BadRequestException({
        mensaje:
          'Cada respuesta debe incluir una opción válida o un valor booleano.',
      });
    }

    const tardia = Boolean(item.tardia);
    const aceptada = !tardia;
    const correcta =
      aceptada &&
      esAcierto(pregunta, {
        opcionId,
        valor: typeof item.valor === 'boolean' ? item.valor : null,
      });
    const puntos = correcta ? 1 : 0;

    respuestasValidadas.push({
      preguntaId,
      opcionId,
      valor: typeof item.valor === 'boolean' ? item.valor : null,
      aceptada,
      tardia,
      puntos,
    });
  }

  const aciertos = respuestasValidadas.filter((r) => r.puntos > 0).length;
  const puntuacion = respuestasValidadas.reduce((acc, r) => acc + r.puntos, 0);
  const totalPreguntas = instantanea.preguntas.length;
  const incorrectas = Math.max(0, totalPreguntas - aciertos);

  if (
    puntuacionReportada !== undefined &&
    puntuacionReportada !== puntuacion
  ) {
    throw new BadRequestException({
      mensaje:
        'La puntuación reportada no coincide con la validación oficial de las respuestas.',
    });
  }

  return {
    puntuacion,
    aciertos,
    incorrectas,
    totalPreguntas,
    respuestas: respuestasValidadas,
  };
}

export function deduplicarYValidarHistorial(
  filas: FilaSesion[],
): ResumenPublico[] {
  const vistos = new Set<string>();
  const resultado: ResumenPublico[] = [];

  for (const fila of filas) {
    const codigo = fila.codigo.trim().toUpperCase();
    if (!codigo || vistos.has(codigo)) continue;
    vistos.add(codigo);

    const resumen = presentarResultado(fila);
    resumen.participantes = resumen.participantes.map((participante) => {
      const respuestasUnicas = new Map<
        string,
        (typeof participante.respuestas)[number]
      >();
      for (const resp of participante.respuestas) {
        if (!respuestasUnicas.has(resp.preguntaId)) {
          respuestasUnicas.set(resp.preguntaId, {
            ...resp,
            puntos: resp.puntos > 0 ? 1 : 0,
          });
        }
      }
      const respuestas = [...respuestasUnicas.values()];
      const aciertosCalculados = respuestas.filter((r) => r.puntos > 0).length;
      const puntaje = Math.max(participante.puntaje, aciertosCalculados);
      const aciertos = Math.max(participante.aciertos, aciertosCalculados);
      return {
        ...participante,
        puntaje,
        aciertos,
        respuestas,
      };
    });

    resultado.push(resumen);
  }

  return resultado;
}

export function calcularProgresoUsuario(
  identidad: IdentidadExterna,
  filas: FilaSesion[],
  categoriasPorCuestionario?: Map<string, string>,
): ProgresoUsuario {
  const idsUsuario = new Set(idsEquivalentesUsuario(identidad.id));
  const mapaCategorias = new Map<string, string>(
    CUESTIONARIOS_BANCO.map((c) => [c.id, c.categoria]),
  );
  if (categoriasPorCuestionario) {
    for (const [id, cat] of categoriasPorCuestionario.entries()) {
      mapaCategorias.set(id, cat);
    }
  }

  const mapaModos = new Map<string, ModoJuego>(
    CUESTIONARIOS_BANCO.map((c) => [c.id, c.modo]),
  );

  const codigosVistos = new Set<string>();
  let partidasJugadas = 0;
  let partidasComoAnfitrion = 0;
  let puntajeTotal = 0;
  let totalAciertos = 0;
  let totalIncorrectas = 0;
  let totalPreguntasRespondidas = 0;
  let mejorPuntaje = 0;

  const modosSet = new Set<ModoJuego>();
  const cuestionariosSet = new Set<string>();
  const acumuladoCategorias = new Map<
    string,
    { partidas: number; aciertos: number; total: number }
  >();

  for (const fila of filas) {
    const codigo = fila.codigo.trim().toUpperCase();
    if (codigosVistos.has(codigo) || fila.estado !== 'finalizada') continue;
    codigosVistos.add(codigo);

    if (idsUsuario.has(fila.anfitrionId)) {
      partidasComoAnfitrion += 1;
    }

    const participante = fila.participantes.find((p) =>
      idsUsuario.has(p.perfilId),
    );
    if (!participante) continue;

    partidasJugadas += 1;
    cuestionariosSet.add(fila.cuestionarioId);

    const modo = mapaModos.get(fila.cuestionarioId) ?? 'en-vivo';
    modosSet.add(modo);

    const instantanea = leerInstantanea(fila.preguntasInstantanea);
    const totalPreguntasSesion =
      instantanea?.preguntas.length ||
      fila.cuestionario?.preguntas.length ||
      Math.max(1, participante.respuestas?.length ?? 0);

    const aciertos = Math.max(0, participante.aciertos);
    const puntaje = Math.max(0, participante.puntaje);
    const incorrectas = Math.max(0, totalPreguntasSesion - aciertos);

    puntajeTotal += puntaje;
    totalAciertos += aciertos;
    totalIncorrectas += incorrectas;
    totalPreguntasRespondidas += totalPreguntasSesion;
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
    }

    const categoria =
      mapaCategorias.get(fila.cuestionarioId) ?? 'General';
    const actualCat = acumuladoCategorias.get(categoria) ?? {
      partidas: 0,
      aciertos: 0,
      total: 0,
    };
    actualCat.partidas += 1;
    actualCat.aciertos += aciertos;
    actualCat.total += totalPreguntasSesion;
    acumuladoCategorias.set(categoria, actualCat);
  }

  const promedioPorcentaje =
    totalPreguntasRespondidas > 0
      ? Math.round((totalAciertos / totalPreguntasRespondidas) * 100)
      : 0;

  const progresoPorCategoria: ProgresoCategoria[] = [
    ...acumuladoCategorias.entries(),
  ].map(([categoria, datos]) => ({
    categoria,
    partidasCompletadas: datos.partidas,
    aciertos: datos.aciertos,
    preguntasRespondidas: datos.total,
    porcentajeDominio:
      datos.total > 0 ? Math.round((datos.aciertos / datos.total) * 100) : 0,
  }));

  const kanbanDatos = acumuladoCategorias.get('Kanban') ?? {
    partidas: 0,
    aciertos: 0,
    total: 0,
  };
  const dominioKanban: ProgresoCategoria = {
    categoria: 'Kanban',
    partidasCompletadas: kanbanDatos.partidas,
    aciertos: kanbanDatos.aciertos,
    preguntasRespondidas: kanbanDatos.total,
    porcentajeDominio:
      kanbanDatos.total > 0
        ? Math.round((kanbanDatos.aciertos / kanbanDatos.total) * 100)
        : 0,
  };

  return {
    usuarioId: identidad.id,
    nombre: identidad.nombre,
    partidasJugadas,
    partidasComoAnfitrion,
    puntajeTotal,
    totalAciertos,
    totalIncorrectas,
    totalPreguntasRespondidas,
    promedioPorcentaje,
    mejorPuntaje,
    modosJugados: [...modosSet],
    cuestionariosCompletados: [...cuestionariosSet],
    dominioKanban,
    progresoPorCategoria,
    actualizadoEn: new Date().toISOString(),
  };
}

