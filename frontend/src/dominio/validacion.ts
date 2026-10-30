import { opcionesDe } from './opciones.ts'
import type {
  BorradorCuestionario,
  Cuestionario,
  EntradaGuardarPartida,
  ModoJuego,
  Participante,
  Pregunta,
  ProgresoCategoria,
  ProgresoUsuario,
  RespuestaParticipante,
  ResumenResultado,
} from './tipos.ts'

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
export const TAMANO_MAXIMO_IMAGEN = 15_000_000

export function validarImagen(archivo: File): string | null {
  const tipo = archivo.type === 'image/jpg' ? 'image/jpeg' : archivo.type
  const extensionOk = /\.(jpe?g|png|webp|gif|svg)$/i.test(archivo.name)
  const tipoValido = TIPOS_IMAGEN.includes(tipo) || (tipo === '' && extensionOk) || tipo.startsWith('image/')
  if (!tipoValido) {
    return 'Usa una imagen JPG, PNG, WEBP, GIF o SVG.'
  }
  if (archivo.size === 0) {
    return 'El archivo de imagen está vacío.'
  }
  const esVectorOGif = tipo === 'image/gif' || tipo === 'image/svg+xml'
  if (esVectorOGif && archivo.size > 1_500_000) {
    return 'Esa imagen supera 1.5 MB.'
  }
  if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
    return 'La imagen supera 15 MB.'
  }
  return null
}

export function validarCuestionario(borrador: BorradorCuestionario): string[] {
  const errores: string[] = []
  const titulo = borrador.titulo.trim()
  const descripcion = borrador.descripcion.trim()

  if (titulo.length < 3) errores.push('El título necesita al menos 3 caracteres.')
  if (titulo.length > 80) errores.push('El título admite como máximo 80 caracteres.')
  if (descripcion.length < 10) errores.push('La descripción necesita al menos 10 caracteres.')
  if (descripcion.length > 400) errores.push('La descripción admite como máximo 400 caracteres.')
  if (!borrador.categoria.trim()) errores.push('Elige una categoría.')
  if (borrador.preguntas.length === 0) errores.push('Agrega al menos una pregunta.')

  const enunciadosVistos = new Set<string>()
  borrador.preguntas.forEach((pregunta, indice) => {
    const enunciado = pregunta.enunciado.trim()
    if (enunciado.length < 5) {
      errores.push(`La pregunta ${indice + 1} necesita un enunciado de al menos 5 caracteres.`)
    }
    if (enunciado.length > 280) {
      errores.push(`La pregunta ${indice + 1} admite como máximo 280 caracteres.`)
    }
    const claveEnunciado = enunciado.toLowerCase()
    if (enunciado.length >= 5 && enunciadosVistos.has(claveEnunciado)) {
      errores.push(`La pregunta ${indice + 1} repite el enunciado de otra pregunta.`)
    }
    if (enunciado.length >= 5) {
      enunciadosVistos.add(claveEnunciado)
    }
    if (pregunta.opciones.length < 2) {
      errores.push(`La pregunta ${indice + 1} necesita al menos 2 respuestas.`)
    }
    if (pregunta.opciones.length > 6) {
      errores.push(`La pregunta ${indice + 1} admite como máximo 6 respuestas.`)
    }
    pregunta.opciones.forEach((opcion, numero) => {
      if (opcion.texto.trim().length < 1) {
        errores.push(`La respuesta ${numero + 1} de la pregunta ${indice + 1} está vacía.`)
      }
    })
    if (pregunta.opcionCorrectaId === null && pregunta.respuestaCorrecta === null) {
      errores.push(`Indica la respuesta correcta de la pregunta ${indice + 1}.`)
    }
  })

  return errores
}

export function validarAcceso(datos: { nombre?: string; correo: string; contrasena: string; registro: boolean }): string[] {
  const errores: string[] = []
  if (datos.registro && (datos.nombre?.trim().length ?? 0) < 3) {
    errores.push('El nombre necesita al menos 3 caracteres.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim())) {
    errores.push('Escribe un correo válido.')
  }
  if (datos.contrasena.length < 8) {
    errores.push('La contraseña necesita al menos 8 caracteres.')
  }
  return errores
}

export function validarEntradaPartida(
  cuestionario: Cuestionario,
  entrada: EntradaGuardarPartida,
): { respuestas: RespuestaParticipante[]; puntaje: number; aciertos: number } {
  if (cuestionario.preguntas.length === 0) {
    throw new Error('El cuestionario no tiene preguntas.')
  }
  const mapaPreguntas = new Map<string, Pregunta>(
    cuestionario.preguntas.map((p) => [p.id, p]),
  )
  const preguntasRespondidas = new Set<string>()
  const respuestas: RespuestaParticipante[] = []

  for (const item of entrada.respuestas) {
    const preguntaId = item.preguntaId.trim()
    if (!preguntaId) {
      throw new Error('Cada respuesta debe indicar la pregunta.')
    }
    if (preguntasRespondidas.has(preguntaId)) {
      throw new Error('No se permiten respuestas duplicadas para la misma pregunta.')
    }
    preguntasRespondidas.add(preguntaId)

    const pregunta = mapaPreguntas.get(preguntaId)
    if (!pregunta) {
      throw new Error('Una de las respuestas no pertenece al cuestionario.')
    }

    const opciones = opcionesDe(pregunta)
    const opcionId = item.opcionId?.trim() || undefined
    if (opcionId && !opciones.some((o) => o.id === opcionId)) {
      throw new Error('Esa opción no pertenece a la pregunta.')
    }
    if (!opcionId && typeof item.valor !== 'boolean') {
      throw new Error('Cada respuesta debe incluir una opción o un valor booleano.')
    }

    const tardia = Boolean(item.tardia)
    const aceptada = !tardia
    const esCorrecta =
      aceptada &&
      (opcionId
        ? opciones.some((o) => o.id === opcionId && o.correcta)
        : item.valor === pregunta.respuestaCorrecta)
    const puntos = esCorrecta ? 1 : 0

    respuestas.push({
      preguntaId,
      valor: typeof item.valor === 'boolean' ? item.valor : null,
      opcionId,
      aceptada,
      tardia,
      puntos,
    })
  }

  const aciertos = respuestas.filter((r) => r.puntos > 0).length
  const puntaje = respuestas.reduce((acc, r) => acc + r.puntos, 0)

  if (
    entrada.puntuacionReportada !== undefined &&
    entrada.puntuacionReportada !== puntaje
  ) {
    throw new Error('La puntuación reportada no coincide con la validación oficial de las respuestas.')
  }

  return { respuestas, puntaje, aciertos }
}

export function normalizarYValidarResultado(resumen: ResumenResultado): ResumenResultado {
  const codigo = resumen.codigo.trim().toUpperCase()
  const participantesUnicos = new Map<string, Participante>()

  for (const part of resumen.participantes) {
    const clave = part.perfilId || part.id
    if (participantesUnicos.has(clave)) continue

    const respuestasUnicas = new Map<string, RespuestaParticipante>()
    for (const resp of part.respuestas ?? []) {
      if (!resp.preguntaId || respuestasUnicas.has(resp.preguntaId)) continue
      respuestasUnicas.set(resp.preguntaId, {
        ...resp,
        puntos: resp.puntos > 0 ? 1 : 0,
      })
    }

    const respuestas = [...respuestasUnicas.values()]
    const aciertosDeRespuestas = respuestas.filter((r) => r.puntos > 0).length
    const aciertos = Math.max(0, part.aciertos, aciertosDeRespuestas)
    const puntaje = Math.max(0, part.puntaje, aciertosDeRespuestas)

    participantesUnicos.set(clave, {
      ...part,
      puntaje,
      aciertos,
      respuestas,
    })
  }

  return {
    ...resumen,
    codigo,
    participantes: [...participantesUnicos.values()],
  }
}

export function deduplicarResultados(lista: ResumenResultado[]): ResumenResultado[] {
  const vistos = new Set<string>()
  const resultado: ResumenResultado[] = []

  for (const item of lista) {
    if (!item?.codigo) continue
    const normalizado = normalizarYValidarResultado(item)
    if (vistos.has(normalizado.codigo)) continue
    vistos.add(normalizado.codigo)
    resultado.push(normalizado)
  }

  return resultado
}

export function calcularProgresoLocal(
  perfilId: string,
  nombre: string,
  resultados: ResumenResultado[],
  cuestionarios: Cuestionario[],
): ProgresoUsuario {
  const idsEquivalentes = new Set(
    perfilId === 'perfil-demo' || perfilId === 'perfil-demo-docente'
      ? ['perfil-demo', 'perfil-demo-docente']
      : [perfilId],
  )
  const porId = new Map(cuestionarios.map((c) => [c.id, c]))
  const porTitulo = new Map(cuestionarios.map((c) => [c.titulo.toLowerCase(), c]))

  const unicos = deduplicarResultados(resultados)
  let partidasJugadas = 0
  let partidasComoAnfitrion = 0
  let puntajeTotal = 0
  let totalAciertos = 0
  let totalIncorrectas = 0
  let totalPreguntasRespondidas = 0
  let mejorPuntaje = 0

  const modosSet = new Set<ModoJuego>()
  const cuestionariosSet = new Set<string>()
  const acumuladoCat = new Map<string, { partidas: number; aciertos: number; total: number }>()

  for (const res of unicos) {
    if (idsEquivalentes.has(res.anfitrionId)) {
      partidasComoAnfitrion += 1
    }
    const mio = res.participantes.find((p) => idsEquivalentes.has(p.perfilId))
    if (!mio) continue

    partidasJugadas += 1
    const cuest =
      (res.cuestionarioId ? porId.get(res.cuestionarioId) : undefined) ??
      porTitulo.get(res.titulo.toLowerCase())
    if (cuest) {
      cuestionariosSet.add(cuest.id)
    }
    const modo = res.modo ?? cuest?.modo ?? 'en-vivo'
    modosSet.add(modo)

    const totalPreguntas = Math.max(
      cuest?.preguntas.length ?? 0,
      mio.respuestas.length,
      mio.aciertos,
      1,
    )
    const aciertos = Math.max(0, mio.aciertos)
    const puntaje = Math.max(0, mio.puntaje)
    const incorrectas = Math.max(0, totalPreguntas - aciertos)

    puntajeTotal += puntaje
    totalAciertos += aciertos
    totalIncorrectas += incorrectas
    totalPreguntasRespondidas += totalPreguntas
    if (puntaje > mejorPuntaje) mejorPuntaje = puntaje

    const categoria = cuest?.categoria ?? (res.titulo.toLowerCase().includes('kanban') ? 'Kanban' : 'General')
    const actual = acumuladoCat.get(categoria) ?? { partidas: 0, aciertos: 0, total: 0 }
    actual.partidas += 1
    actual.aciertos += aciertos
    actual.total += totalPreguntas
    acumuladoCat.set(categoria, actual)
  }

  const promedioPorcentaje =
    totalPreguntasRespondidas > 0
      ? Math.round((totalAciertos / totalPreguntasRespondidas) * 100)
      : 0

  const progresoPorCategoria: ProgresoCategoria[] = [...acumuladoCat.entries()].map(
    ([categoria, datos]) => ({
      categoria,
      partidasCompletadas: datos.partidas,
      aciertos: datos.aciertos,
      preguntasRespondidas: datos.total,
      porcentajeDominio: datos.total > 0 ? Math.round((datos.aciertos / datos.total) * 100) : 0,
    }),
  )

  const kanban = acumuladoCat.get('Kanban') ?? { partidas: 0, aciertos: 0, total: 0 }
  const dominioKanban: ProgresoCategoria = {
    categoria: 'Kanban',
    partidasCompletadas: kanban.partidas,
    aciertos: kanban.aciertos,
    preguntasRespondidas: kanban.total,
    porcentajeDominio: kanban.total > 0 ? Math.round((kanban.aciertos / kanban.total) * 100) : 0,
  }

  return {
    usuarioId: perfilId,
    nombre,
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
  }
}
