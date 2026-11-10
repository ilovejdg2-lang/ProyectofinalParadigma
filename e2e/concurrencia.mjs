import { writeFile, mkdir } from 'node:fs/promises'
import { WebSocket } from 'ws'

const AUTH = process.env.AUTH_URL ?? 'http://localhost:5001'
const API = process.env.ACTIVIDADES_URL ?? 'http://localhost:5002'
const CANAL = process.env.CANAL_URL ?? 'ws://localhost:5002/canal'
const CLAVE = 'AuditoriaClase2026'
const tamanos = (process.argv.slice(2).length ? process.argv.slice(2) : ['10', '20', '30']).map(Number)

async function json(url, opciones = {}) {
  const respuesta = await fetch(url, opciones)
  const texto = await respuesta.text()
  let cuerpo = null
  try {
    cuerpo = texto ? JSON.parse(texto) : null
  } catch {
    cuerpo = { texto }
  }
  if (!respuesta.ok) {
    throw new Error(`${opciones.method ?? 'GET'} ${url} -> ${respuesta.status} ${texto.slice(0, 240)}`)
  }
  return cuerpo
}

function esperarSala(socket, predicado) {
  return new Promise((resolve, reject) => {
    const limite = setTimeout(() => reject(new Error('el canal no entregó el estado esperado')), 15000)
    socket.on('message', (datos) => {
      const mensaje = JSON.parse(String(datos))
      if (mensaje.sala && predicado(mensaje.sala)) {
        clearTimeout(limite)
        resolve(mensaje.sala)
      }
    })
  })
}

async function partida(cantidad) {
  const marca = `${Date.now().toString(36)}-${cantidad}`
  const docente = await json(`${AUTH}/perfiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: `Docente Carga ${cantidad}`,
      correo: `carga.docente.${marca}@una.cr`,
      contrasena: CLAVE,
    }),
  })
  const cuestionario = await json(`${API}/cuestionarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${docente.token}` },
    body: JSON.stringify({
      titulo: `Carga ${cantidad} ${marca}`.slice(0, 80),
      descripcion: 'Partida de concurrencia con dos preguntas de verdadero o falso.',
      categoria: 'General',
      etiquetas: ['carga'],
      dificultad: 'facil',
      preguntas: [1, 2].map((numero) => ({
        enunciado: `Carga ${cantidad} pregunta ${numero} del lote ${marca}.`,
        respuestaCorrecta: true,
        orden: numero,
        segundos: 30,
        opciones: [
          { texto: 'Verdadero', correcta: true },
          { texto: 'Falso', correcta: false },
        ],
      })),
    }),
  })
  const sala = await json(`${API}/sesiones-juego`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${docente.token}` },
    body: JSON.stringify({ cuestionarioId: cuestionario.id }),
  })
  const alumnos = await Promise.all(
    Array.from({ length: cantidad }, (_, indice) =>
      json(`${AUTH}/perfiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: `Alumno ${indice + 1}`,
          correo: `carga.${cantidad}.${indice}.${marca}@est.una.ac.cr`,
          contrasena: CLAVE,
        }),
      }),
    ),
  )
  const inicioUnion = Date.now()
  await Promise.all(
    alumnos.map((alumno) =>
      json(`${API}/sesiones-juego/${sala.codigo}/participantes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${alumno.token}` },
      }),
    ),
  )
  const sockets = alumnos.map(
    (alumno) =>
      new WebSocket(`${CANAL}?codigo=${sala.codigo}`, ['profelink', `profelink-bearer.${alumno.token}`]),
  )
  await Promise.all(
    sockets.map(
      (socket) =>
        new Promise((resolve, reject) => {
          socket.once('open', resolve)
          socket.once('error', reject)
        }),
    ),
  )
  const esperas = sockets.map((socket) => esperarSala(socket, (estado) => estado.estado === 'pregunta'))
  await json(`${API}/sesiones-juego/${sala.codigo}/iniciar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${docente.token}` },
  })
  const vistas = await Promise.all(esperas)
  const opcion = vistas[0].preguntas[0].opciones.find((item) => item.texto === 'Verdadero')
  const respuestas = await Promise.all(
    alumnos.map(async (alumno, indice) => {
      const cuerpo = indice % 5 === 0
        ? { opcionId: vistas[0].preguntas[0].opciones.find((item) => item.texto === 'Falso').id }
        : { opcionId: opcion.id }
      const respuesta = await fetch(`${API}/sesiones-juego/${sala.codigo}/respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alumno.token}` },
        body: JSON.stringify(cuerpo),
      })
      return respuesta.status
    }),
  )
  await json(`${API}/sesiones-juego/${sala.codigo}/cerrar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${docente.token}` },
  })
  await json(`${API}/sesiones-juego/${sala.codigo}/avanzar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${docente.token}` },
  })
  const segunda = await json(`${API}/sesiones-juego/${sala.codigo}`, {
    headers: { Authorization: `Bearer ${docente.token}` },
  })
  const opcionDos = segunda.preguntas[1].opciones.find((item) => item.texto === 'Verdadero')
  await Promise.all(
    alumnos.map((alumno) =>
      json(`${API}/sesiones-juego/${sala.codigo}/respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alumno.token}` },
        body: JSON.stringify({ opcionId: opcionDos.id }),
      }),
    ),
  )
  await json(`${API}/sesiones-juego/${sala.codigo}/cerrar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${docente.token}` },
  })
  await json(`${API}/sesiones-juego/${sala.codigo}/avanzar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${docente.token}` },
  })
  const final = await json(`${API}/resultados/${sala.codigo}`, {
    headers: { Authorization: `Bearer ${docente.token}` },
  })
  for (const socket of sockets) socket.close()
  const ids = new Set(final.participantes.map((item) => item.perfilId))
  const incorrectos = respuestas.filter((estado) => estado !== 201 && estado !== 200).length
  const esperadoMal = Math.ceil(cantidad / 5)
  const conUnPunto = final.participantes.filter((item) => item.puntaje === 1).length
  const conDos = final.participantes.filter((item) => item.puntaje === 2).length
  return {
    participantes: cantidad,
    codigo: sala.codigo,
    unionMs: Date.now() - inicioUnion,
    respuestasPrimera: respuestas.length,
    respuestasRechazadas: incorrectos,
    puntajeUno: conUnPunto,
    puntajeDos: conDos,
    identidadesUnicas: ids.size,
    podio: final.participantes.slice(0, 3).map((item) => ({ nombre: item.nombre, puntaje: item.puntaje })),
    coherente: ids.size === cantidad && conUnPunto === esperadoMal && conDos === cantidad - esperadoMal && incorrectos === 0,
  }
}

const resumen = []
for (const cantidad of tamanos) {
  const resultado = await partida(cantidad)
  resumen.push(resultado)
  console.log(JSON.stringify(resultado))
}
await mkdir('evidencias', { recursive: true })
await writeFile('evidencias/concurrencia.json', JSON.stringify(resumen, null, 2))
if (resumen.some((item) => !item.coherente)) process.exitCode = 1
