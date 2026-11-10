import type { Cuestionario, ProgresoUsuario, ResumenResultado } from '../dominio/tipos.ts'

export interface Consejo {
  texto: string
  general: boolean
}

export interface FilaPartida {
  codigo: string
  titulo: string
  fecha: string
  posicion: number
  puntos: number
  participantes: number
  resultado: 'Excelente' | 'Muy bien' | 'Bueno' | 'Por mejorar'
}

export interface FilaCuestionario {
  id: string
  titulo: string
  fecha: string
  jugadores: number
  partidas: number
  estado: string
  tono: 'verde' | 'azul' | 'gris'
  ultimoCodigo: string | null
}

export interface AnalisisCuestionario {
  titulo: string
  sesiones: number
  participantes: number
  puntajePromedio: number | null
  porcentajeAciertos: number | null
  masErrores: string | null
  masAciertos: string | null
}

const DEMOS = new Set(['perfil-demo', 'perfil-demo-docente'])

export function mismoUsuario(a?: string, b?: string) {
  if (!a || !b) return false
  if (a === b) return true
  return DEMOS.has(a) && DEMOS.has(b)
}

export function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0] ?? ''}${partes[1][0] ?? ''}`.toUpperCase()
}

export function formatearFecha(iso: string, conHora = false) {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return 'No registrada'
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(fecha)
}

export function formatearNumero(valor: number) {
  return new Intl.NumberFormat('es-CR').format(valor)
}

export function normalizarGithub(valor: string): string | null {
  const texto = valor.trim()
  if (!texto) return ''
  const conProtocolo = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`
  try {
    const url = new URL(conProtocolo)
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null
    const usuario = url.pathname.split('/').filter(Boolean)[0]
    if (!usuario || !/^[A-Za-z0-9-]+$/.test(usuario)) return null
    return `https://github.com/${usuario}`
  } catch {
    return null
  }
}

export function claveGithub(perfilId: string) {
  return `profelink.github.${perfilId}`
}

function posicionEn(resultado: ResumenResultado, perfilId: string) {
  const orden = [...resultado.participantes].sort((a, b) => b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre, 'es'))
  const indice = orden.findIndex((item) => mismoUsuario(item.perfilId, perfilId))
  return indice < 0 ? null : indice + 1
}

function resultadoDe(posicion: number): FilaPartida['resultado'] {
  if (posicion === 1) return 'Excelente'
  if (posicion === 2) return 'Muy bien'
  if (posicion === 3) return 'Bueno'
  return 'Por mejorar'
}

export function partidasDelEstudiante(historial: ResumenResultado[], perfilId: string): FilaPartida[] {
  return [...historial]
    .sort((a, b) => b.finalizadaEn.localeCompare(a.finalizadaEn))
    .flatMap((resultado) => {
      const yo = resultado.participantes.find((item) => mismoUsuario(item.perfilId, perfilId))
      const posicion = posicionEn(resultado, perfilId)
      if (!yo || posicion === null) return []
      return [{
        codigo: resultado.codigo,
        titulo: resultado.titulo,
        fecha: formatearFecha(resultado.finalizadaEn, true),
        posicion,
        puntos: yo.puntaje,
        participantes: resultado.participantes.length,
        resultado: resultadoDe(posicion),
      }]
    })
}

export function mejorPosicion(filas: FilaPartida[]) {
  if (filas.length === 0) return null
  return Math.min(...filas.map((fila) => fila.posicion))
}

export function consejosEstudiante(progreso: ProgresoUsuario | null, filas: FilaPartida[]): Consejo[] {
  if (!progreso || progreso.partidasJugadas === 0 || filas.length === 0) {
    return [
      { texto: 'Juega una partida para recibir recomendaciones según tus resultados.', general: true },
      { texto: 'Mantén tu consistencia en las preguntas.', general: true },
      { texto: 'Refuerza los temas con menor puntaje cuando aparezcan en tu historial.', general: true },
    ]
  }
  const consejos: Consejo[] = []
  const debil = [...progreso.progresoPorCategoria]
    .filter((item) => item.preguntasRespondidas > 0)
    .sort((a, b) => a.porcentajeDominio - b.porcentajeDominio)[0]
  if (debil && debil.porcentajeDominio < 80) {
    consejos.push({
      texto: `Refuerza ${debil.categoria}: tu dominio está en ${debil.porcentajeDominio}%.`,
      general: false,
    })
  }
  if (progreso.promedioPorcentaje < 75) {
    consejos.push({
      texto: `Mantén tu consistencia: tu precisión media es ${progreso.promedioPorcentaje}%.`,
      general: false,
    })
  } else {
    consejos.push({ texto: 'Mantén tu consistencia en las preguntas.', general: false })
  }
  const peor = [...filas].sort((a, b) => a.puntos - b.puntos)[0]
  if (peor && peor.posicion > 1) {
    consejos.push({ texto: `Repasa «${peor.titulo}», donde quedaste en ${peor.posicion}.º.`, general: false })
  } else {
    consejos.push({ texto: 'Sigue cuidando la velocidad de respuesta en las preguntas que aún fallas.', general: true })
  }
  return consejos.slice(0, 3)
}

function sesionesDelDocente(historial: ResumenResultado[], perfilId: string) {
  return historial.filter((item) => mismoUsuario(item.anfitrionId, perfilId))
}

function sesionesDeCuestionario(cuestionario: Cuestionario, historial: ResumenResultado[], perfilId: string) {
  const titulo = cuestionario.titulo.trim().toLowerCase()
  return sesionesDelDocente(historial, perfilId).filter((item) =>
    item.cuestionarioId === cuestionario.id
    || (!item.cuestionarioId && item.titulo.trim().toLowerCase() === titulo),
  )
}

export function metricasDocente(cuestionarios: Cuestionario[], historial: ResumenResultado[], perfilId: string) {
  const sesiones = sesionesDelDocente(historial, perfilId)
  let aciertos = 0
  let respondidas = 0
  let participaciones = 0
  for (const sesion of sesiones) {
    participaciones += sesion.participantes.length
    for (const persona of sesion.participantes) {
      aciertos += persona.aciertos
      respondidas += persona.respuestas.filter((respuesta) => respuesta.aceptada).length
    }
  }
  return {
    cuestionarios: cuestionarios.length,
    partidas: sesiones.length,
    participaciones,
    porcentaje: respondidas > 0 ? Math.round((aciertos / respondidas) * 100) : null,
  }
}

function tonoEstado(estado: string): FilaCuestionario['tono'] {
  if (estado === 'En curso') return 'verde'
  if (estado === 'Finalizada') return 'azul'
  return 'gris'
}

export function filasCuestionarios(cuestionarios: Cuestionario[], historial: ResumenResultado[], perfilId: string): FilaCuestionario[] {
  return [...cuestionarios]
    .sort((a, b) => (b.actualizadoEn ?? '').localeCompare(a.actualizadoEn ?? ''))
    .slice(0, 8)
    .map((cuestionario) => {
      const sesiones = sesionesDeCuestionario(cuestionario, historial, perfilId)
        .sort((a, b) => b.finalizadaEn.localeCompare(a.finalizadaEn))
      const jugadores = new Set(sesiones.flatMap((item) => item.participantes.map((persona) => persona.perfilId)))
      const ultima = sesiones[0]
      const estado = sesiones.length === 0 ? 'Sin partidas' : 'Finalizada'
      return {
        id: cuestionario.id,
        titulo: cuestionario.titulo,
        fecha: formatearFecha(cuestionario.actualizadoEn ?? '', true),
        jugadores: jugadores.size,
        partidas: sesiones.length,
        estado,
        tono: tonoEstado(estado),
        ultimoCodigo: ultima?.codigo ?? null,
      }
    })
}

export function analizarCuestionario(cuestionario: Cuestionario, historial: ResumenResultado[], perfilId: string): AnalisisCuestionario {
  const sesiones = sesionesDeCuestionario(cuestionario, historial, perfilId)
  const personas = sesiones.flatMap((item) => item.participantes)
  const puntajes = personas.map((item) => item.puntaje)
  let aciertos = 0
  let respondidas = 0
  const porPregunta = new Map<string, { aciertos: number; errores: number }>()
  for (const persona of personas) {
    for (const respuesta of persona.respuestas.filter((item) => item.aceptada)) {
      respondidas += 1
      const actual = porPregunta.get(respuesta.preguntaId) ?? { aciertos: 0, errores: 0 }
      if (respuesta.puntos > 0) {
        aciertos += 1
        actual.aciertos += 1
      } else {
        actual.errores += 1
      }
      porPregunta.set(respuesta.preguntaId, actual)
    }
  }
  const enunciado = (id: string) => cuestionario.preguntas.find((item) => item.id === id)?.enunciado ?? null
  const ranking = [...porPregunta.entries()]
  const peor = [...ranking].sort((a, b) => b[1].errores - a[1].errores)[0]
  const mejor = [...ranking].sort((a, b) => b[1].aciertos - a[1].aciertos)[0]
  return {
    titulo: cuestionario.titulo,
    sesiones: sesiones.length,
    participantes: new Set(personas.map((item) => item.perfilId)).size,
    puntajePromedio: puntajes.length > 0 ? Math.round(puntajes.reduce((suma, valor) => suma + valor, 0) / puntajes.length) : null,
    porcentajeAciertos: respondidas > 0 ? Math.round((aciertos / respondidas) * 100) : null,
    masErrores: peor && peor[1].errores > 0 ? enunciado(peor[0]) : null,
    masAciertos: mejor && mejor[1].aciertos > 0 ? enunciado(mejor[0]) : null,
  }
}

export function consejosDocente(cuestionarios: Cuestionario[], historial: ResumenResultado[], perfilId: string): Consejo[] {
  const metricas = metricasDocente(cuestionarios, historial, perfilId)
  if (cuestionarios.length === 0) {
    return [
      { texto: 'Crea tu primer cuestionario para empezar a ver actividad real.', general: true },
      { texto: 'Cuando haya partidas, aquí verás los temas con más errores.', general: true },
      { texto: 'Invita al grupo con el código o el QR de la sala.', general: true },
    ]
  }
  const consejos: Consejo[] = []
  const debiles = cuestionarios
    .map((cuestionario) => ({ cuestionario, analisis: analizarCuestionario(cuestionario, historial, perfilId) }))
    .filter((item) => item.analisis.porcentajeAciertos !== null)
    .sort((a, b) => (a.analisis.porcentajeAciertos ?? 100) - (b.analisis.porcentajeAciertos ?? 100))
  const peor = debiles[0]
  if (peor && (peor.analisis.porcentajeAciertos ?? 100) < 70) {
    consejos.push({
      texto: `Revisa la dificultad de «${peor.cuestionario.titulo}»: los aciertos están en ${peor.analisis.porcentajeAciertos}%.`,
      general: false,
    })
    if (peor.analisis.masErrores) {
      consejos.push({ texto: `Refuerza la pregunta con más errores: «${peor.analisis.masErrores}».`, general: false })
    }
    if (!peor.cuestionario.imagenUrl) {
      consejos.push({ texto: 'Agrega una imagen a ese cuestionario si el enunciado se entiende mejor con un recurso visual.', general: false })
    }
  }
  if (metricas.partidas === 0) {
    consejos.push({ texto: 'Todavía no hay partidas finalizadas. Abre una sala para medir la participación.', general: true })
  } else if (metricas.participaciones < metricas.partidas) {
    consejos.push({ texto: 'Hay partidas con poca participación. Comparte el QR antes de comenzar.', general: false })
  }
  const generales = [
    'Añade variedad de preguntas en los temas donde el grupo ya responde con seguridad.',
    'Revisa los cuestionarios que todavía no tienen partidas finalizadas.',
    'Comparte el código o el QR antes de comenzar para que entre todo el grupo.',
  ]
  for (const texto of generales) {
    if (consejos.length >= 3) break
    if (consejos.some((item) => item.texto === texto)) continue
    consejos.push({ texto, general: true })
  }
  return consejos.slice(0, 3)
}
