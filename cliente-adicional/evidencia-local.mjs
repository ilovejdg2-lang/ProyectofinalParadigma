import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const authUrl = (process.env.AUTH_URL ?? 'http://127.0.0.1:5001').replace(/\/$/, '')
const actUrl = (process.env.ACTIVITIES_URL ?? 'http://127.0.0.1:5002').replace(/\/$/, '')
const frontUrl = (process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173').replace(/\/$/, '')
const participantesExtra = Number(process.env.PARTICIPANTES ?? 8)

function exigirLocal(url) {
  const host = new URL(url).hostname
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error(`Destino rechazado: ${url}`)
  }
}

exigirLocal(authUrl)
exigirLocal(actUrl)
exigirLocal(frontUrl)

const docente = { email: 'profesor@una.cr', password: 'Profesor123!', nombre: 'Docente de prueba' }
const estudiante = { email: 'estudiante@est.una.ac.cr', password: 'Estudiante123!', nombre: 'Estudiante de prueba' }
const resultado = {
  fecha: new Date().toISOString(),
  entorno: 'localhost',
  casos: {},
}

function anotar(caso, ok, detalle) {
  resultado.casos[caso] = { ok, detalle }
  console.log(`${ok ? 'OK' : 'FALLO'} ${caso}: ${detalle}`)
}

async function json(url, opciones = {}) {
  const respuesta = await fetch(url, opciones)
  const texto = await respuesta.text()
  let cuerpo = null
  try {
    cuerpo = texto ? JSON.parse(texto) : null
  } catch {
    cuerpo = texto
  }
  return { estado: respuesta.status, cuerpo }
}

async function entrar(cuenta) {
  const login = await json(`${authUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cuenta.email, password: cuenta.password }),
  })
  if (login.estado === 200 && login.cuerpo?.token) return login.cuerpo
  const registro = await json(`${authUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: cuenta.nombre,
      email: cuenta.email,
      password: cuenta.password,
    }),
  })
  if (registro.estado >= 400 || !registro.cuerpo?.token) {
    throw new Error(`No entré como ${cuenta.email}: login ${login.estado}, registro ${registro.estado}`)
  }
  return registro.cuerpo
}

function abrirCanal(codigo, token) {
  const url = `${actUrl.replace(/^http/i, 'ws')}/canal?codigo=${encodeURIComponent(codigo)}`
  const socket = new WebSocket(url, ['profelink', `profelink-bearer.${token}`])
  const mensajes = []
  const listo = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Sin conexión a ${codigo}`)), 8000)
    socket.addEventListener('open', () => {
      clearTimeout(timer)
      resolve()
    })
    socket.addEventListener('error', () => {
      clearTimeout(timer)
      reject(new Error(`Error de canal ${codigo}`))
    })
  })
  socket.addEventListener('message', (evento) => {
    try {
      mensajes.push(JSON.parse(String(evento.data)))
    } catch {
      mensajes.push(String(evento.data))
    }
  })
  return { socket, mensajes, listo }
}

async function main() {
  const saludAuth = await json(`${authUrl}/health/ready`)
  const saludAct = await json(`${actUrl}/salud`)
  if (saludAuth.estado !== 200 || saludAct.estado !== 200) {
    throw new Error(`Salud local incompleta: auth ${saludAuth.estado}, actividades ${saludAct.estado}`)
  }

  const sesionDocente = await entrar(docente)
  const tokenDocente = sesionDocente.token
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const formulario = new FormData()
  formulario.append('archivo', new Blob([png], { type: 'image/png' }), 'prueba-clase.png')
  const subida = await json(`${actUrl}/imagenes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenDocente}` },
    body: formulario,
  })
  const foto = subida.cuerpo?.url
  if (subida.estado >= 400 || typeof foto !== 'string' || !foto.includes('/archivos/')) {
    throw new Error(`No se guardó la foto: ${subida.estado} ${JSON.stringify(subida.cuerpo)}`)
  }
  const lecturaFoto = await json(foto)
  anotar(
    'foto-subida',
    lecturaFoto.estado === 200,
    `La foto quedó en ${foto} y responde ${lecturaFoto.estado}. Esa URL usa la dirección de la red, no un SVG del frontend.`,
  )

  const creado = await json(`${actUrl}/cuestionarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenDocente}` },
    body: JSON.stringify({
      titulo: 'Prueba de clase con foto',
      descripcion: 'Cuestionario de prueba con una foto subida al servidor.',
      categoria: 'General',
      etiquetas: ['prueba'],
      dificultad: 'medio',
      imagenUrl: foto,
      puntosPorAcierto: 1,
      preguntas: [
        {
          enunciado: 'La foto de esta pregunta se sirve desde la API.',
          respuestaCorrecta: true,
          orden: 1,
          segundos: 30,
          imagenUrl: foto,
          opciones: [
            { id: 'vf-verdadero', texto: 'Verdadero', correcta: true },
            { id: 'vf-falso', texto: 'Falso', correcta: false },
          ],
        },
      ],
    }),
  })
  if (creado.estado >= 400 || !creado.cuerpo?.id) {
    throw new Error(`No se creó el cuestionario: ${creado.estado} ${JSON.stringify(creado.cuerpo)}`)
  }
  const conImagen = creado.cuerpo

  const salaA = await json(`${actUrl}/sesiones-juego`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenDocente}` },
    body: JSON.stringify({ cuestionarioId: conImagen.id }),
  })
  const salaB = await json(`${actUrl}/sesiones-juego`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenDocente}` },
    body: JSON.stringify({ cuestionarioId: conImagen.id }),
  })
  if (salaA.estado >= 400 || salaB.estado >= 400) {
    throw new Error(`No se crearon las salas: ${salaA.estado} y ${salaB.estado}`)
  }
  const codigoA = salaA.cuerpo.codigo
  const codigoB = salaB.cuerpo.codigo

  const cuentas = [estudiante]
  for (let i = 2; i <= participantesExtra; i += 1) {
    cuentas.push({
      email: `estudiante.local.${i}@est.una.ac.cr`,
      password: 'Estudiante123!',
      nombre: `Estudiante local ${i}`,
    })
  }

  const sesiones = []
  for (const cuenta of cuentas) {
    sesiones.push(await entrar(cuenta))
  }

  let unidos = 0
  for (const sesion of sesiones) {
    const alta = await json(`${actUrl}/sesiones-juego/${codigoA}/participantes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sesion.token}` },
    })
    if (alta.estado < 400) unidos += 1
  }
  const enB = await json(`${actUrl}/sesiones-juego/${codigoB}/participantes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sesiones[0].token}` },
  })
  anotar(
    'varios-participantes',
    unidos >= 2,
    `${unidos} participantes entraron a ${codigoA} desde clientes Node distintos en esta máquina. No son teléfonos físicos.`,
  )
  anotar(
    'maximo-participantes-probado',
    unidos === sesiones.length,
    `Se probó unirse con ${sesiones.length} cuentas. Aceptadas: ${unidos}. El servicio no declara un tope numérico; este es el máximo ejecutado en esta corrida.`,
  )

  const canalDocente = abrirCanal(codigoA, tokenDocente)
  const canalA = abrirCanal(codigoA, sesiones[1].token)
  const canalB = abrirCanal(codigoB, sesiones[0].token)
  await Promise.all([canalDocente.listo, canalA.listo, canalB.listo])

  const inicioA = await json(`${actUrl}/sesiones-juego/${codigoA}/iniciar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenDocente}` },
  })
  const inicioB = await json(`${actUrl}/sesiones-juego/${codigoB}/iniciar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenDocente}` },
  })
  await new Promise((resolve) => setTimeout(resolve, 5200))

  const preguntaAbierta = inicioA.cuerpo?.preguntas?.[inicioA.cuerpo.preguntaActual ?? 0]
  const opcionId = preguntaAbierta?.opciones?.[0]?.id
  let respuestaEstado = 0
  if (opcionId) {
    const respuesta = await json(`${actUrl}/sesiones-juego/${codigoA}/respuestas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesiones[1].token}` },
      body: JSON.stringify({ opcionId }),
    })
    respuestaEstado = respuesta.estado
  }
  const cierre = await json(`${actUrl}/sesiones-juego/${codigoA}/cerrar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenDocente}` },
  })
  const puntajes = (cierre.cuerpo?.participantes ?? []).map((item) => item.puntaje)
  anotar(
    'resultados-un-punto',
    cierre.estado < 400 && puntajes.length > 0 && puntajes.every((puntos) => puntos === 0 || puntos === 1),
    `Cierre ${cierre.estado} ${cierre.cuerpo?.mensaje ?? ''}, respuesta ${respuestaEstado}. Puntajes de la pregunta: ${puntajes.join(', ') || 'ninguno'}.`,
  )

  const preguntaA = inicioA.cuerpo?.preguntas?.find((pregunta) => pregunta.imagenUrl)
    ?? canalA.mensajes.map((mensaje) => mensaje.sala).find((sala) => sala?.codigo === codigoA)?.preguntas?.find((pregunta) => pregunta.imagenUrl)
  let imagenHttp = null
  if (preguntaA?.imagenUrl) {
    const destino = preguntaA.imagenUrl.startsWith('http')
      ? preguntaA.imagenUrl
      : `${frontUrl}${preguntaA.imagenUrl.startsWith('/') ? '' : '/'}${preguntaA.imagenUrl}`
    imagenHttp = (await json(destino)).estado
  }
  anotar(
    'imagen-durante-partida',
    Boolean(preguntaA?.imagenUrl) && inicioA.estado < 400,
    preguntaA?.imagenUrl
      ? `La pregunta en vivo de ${codigoA} incluye ${preguntaA.imagenUrl}. Lectura local de esa URL: ${imagenHttp ?? 'no aplica'}.`
      : `La sala ${codigoA} no entregó imagenUrl. Inicio: ${inicioA.estado}.`,
  )

  canalA.socket.close()
  await new Promise((resolve) => setTimeout(resolve, 400))
  const reconectado = abrirCanal(codigoA, sesiones[1].token)
  await reconectado.listo
  const salaTrasReconexion = await json(`${actUrl}/sesiones-juego/${codigoA}`, {
    headers: { Authorization: `Bearer ${sesiones[1].token}` },
  })
  const perfilId = sesiones[1].perfil?.id
  const copias = (salaTrasReconexion.cuerpo?.participantes ?? []).filter((item) => item.perfilId === perfilId).length
  anotar(
    'reconexion',
    reconectado.socket.readyState === WebSocket.OPEN && copias === 1,
    `El segundo participante cerró el socket y volvió a ${codigoA}. Copias de su perfil en la sala: ${copias}.`,
  )

  const mensajesAjenos = canalA.mensajes.filter((mensaje) => mensaje.codigo === codigoB || mensaje.sala?.codigo === codigoB)
  const mensajesPropiosB = canalB.mensajes.filter((mensaje) => mensaje.codigo === codigoB || mensaje.sala?.codigo === codigoB)
  anotar(
    'aislamiento-de-salas',
    mensajesAjenos.length === 0 && (mensajesPropiosB.length > 0 || inicioB.estado < 400) && codigoA !== codigoB,
    `Sala A ${codigoA} y sala B ${codigoB}. El canal de A recibió ${mensajesAjenos.length} mensajes de B. El canal de B recibió ${mensajesPropiosB.length} mensajes de su sala. Inicio B: ${inicioB.estado}.`,
  )

  const lecturas = await Promise.all([
    json(`${authUrl}/health/ready`),
    json(`${actUrl}/salud`),
    json(`${actUrl}/cuestionarios`),
    json(`${actUrl}/cuestionarios`),
  ])
  anotar(
    'consumo-independiente-api',
    lecturas.every((lectura) => lectura.estado === 200),
    `Cuatro GET locales desde este proceso, fuera del frontend React: ${lecturas.map((lectura) => lectura.estado).join(', ')}.`,
  )

  canalDocente.socket.close()
  canalB.socket.close()
  reconectado.socket.close()

  const salida = resolve('.local', 'evidencia-local.json')
  writeFileSync(salida, JSON.stringify(resultado, null, 2))
  console.log(`Evidencia escrita en ${salida}`)
  if (Object.values(resultado.casos).some((caso) => !caso.ok)) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
