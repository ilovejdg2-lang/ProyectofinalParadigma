import { ErrorServicio } from '../dominio/errores.ts'
import { opcionesDe } from '../dominio/opciones.ts'
import type { Participante, Pregunta, RespuestaParticipante, ResumenResultado, Sala } from '../dominio/tipos.ts'
import type { ClienteActividades } from './actividades.ts'
import type { ClienteAutenticacion } from './autenticacion.ts'
import type { Almacen } from './almacen.ts'

export type EstadoConexion = 'conectado' | 'desconectado' | 'error'

export interface ClienteSala {
  readonly canal: 'simulado' | 'remoto'
  crear(token: string, cuestionarioId: string): Promise<Sala>
  unirse(token: string, codigo: string): Promise<Sala>
  obtener(token: string, codigo: string): Promise<Sala>
  suscribir(codigo: string, alCambiar: (sala: Sala) => void): () => void
  iniciar(token: string, codigo: string): Promise<Sala>
  responder(token: string, codigo: string, valor: boolean | string): Promise<Sala>
  cerrarPregunta(token: string, codigo: string): Promise<Sala>
  avanzar(token: string, codigo: string): Promise<Sala>
  historial(token: string): Promise<ResumenResultado[]>
  obtenerResultado(token: string, codigo: string): Promise<ResumenResultado>
  estadoConexion(): EstadoConexion
  desconectar(): void
  reconectar(): void
}

const CLAVE_SALAS = 'profelink.salas.v1'
const CLAVE_RESULTADOS = 'profelink.resultados.v1'
const SEGUNDOS = 20
const registros = new WeakMap<Almacen, Map<string, Set<(sala: Sala) => void>>>()

interface EstadoSalas {
  salas: Record<string, Sala>
}

function leerSalas(almacen: Almacen): EstadoSalas {
  const texto = almacen.leer(CLAVE_SALAS)
  if (!texto) return { salas: {} }
  return JSON.parse(texto) as EstadoSalas
}

function guardarSalas(almacen: Almacen, estado: EstadoSalas) {
  almacen.escribir(CLAVE_SALAS, JSON.stringify(estado))
}

function leerResultados(almacen: Almacen): ResumenResultado[] {
  const texto = almacen.leer(CLAVE_RESULTADOS)
  if (!texto) return []
  return JSON.parse(texto) as ResumenResultado[]
}

function notificar(almacen: Almacen, codigo: string, sala: Sala) {
  registros.get(almacen)?.get(codigo)?.forEach((oyente) => oyente(sala))
  if (typeof BroadcastChannel === 'undefined') return
  const canal = new BroadcastChannel('profelink-salas')
  canal.postMessage({ codigo })
  canal.close()
}

function codigoNuevo(salas: Record<string, Sala>): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let codigo = ''
  do {
    codigo = Array.from({ length: 6 }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join('')
  } while (salas[codigo])
  return codigo
}

async function exigirPerfil(autenticacion: ClienteAutenticacion, token: string) {
  const sesion = await autenticacion.sesionActual(token)
  if (!sesion) throw new ErrorServicio('permiso', 'La sesión no es válida.')
  return sesion.perfil
}

function exigirSala(estado: EstadoSalas, codigo: string): Sala {
  const sala = estado.salas[codigo.toUpperCase()]
  if (!sala) throw new ErrorServicio('no-encontrado', 'No hay una sala con ese código.')
  return sala
}

function copiarPreguntas(preguntas: Pregunta[]): Pregunta[] {
  return preguntas.map((pregunta) => ({
    ...pregunta,
    opciones: pregunta.opciones?.map((opcion) => ({ ...opcion })),
  }))
}

function acierto(pregunta: Pregunta, respuesta: RespuestaParticipante): boolean {
  if (respuesta.opcionId) {
    return opcionesDe(pregunta).some((opcion) => opcion.correcta && opcion.id === respuesta.opcionId)
  }
  return respuesta.valor === pregunta.respuestaCorrecta
}

export function crearSalaSimulada(
  almacen: Almacen,
  autenticacion: ClienteAutenticacion,
  actividades: ClienteActividades,
): ClienteSala {
  let conexion: EstadoConexion = 'conectado'

  function exigirConexion() {
    if (conexion !== 'conectado') {
      throw new ErrorServicio('conexion', 'No hay conexión con la sala. Recupera la conexión para ver el estado vigente.')
    }
  }

  function publicar(codigo: string, sala: Sala) {
    guardarSalas(almacen, leerSalas(almacen))
    notificar(almacen, codigo, sala)
  }

  return {
    canal: 'simulado',
    estadoConexion: () => conexion,
    desconectar() {
      conexion = 'desconectado'
    },
    reconectar() {
      conexion = 'conectado'
    },
    async crear(token, cuestionarioId) {
      exigirConexion()
      const perfil = await exigirPerfil(autenticacion, token)
      const cuestionario = await actividades.obtener(cuestionarioId)
      if (cuestionario.preguntas.length === 0) {
        throw new ErrorServicio('validacion', 'El cuestionario no tiene preguntas.')
      }
      const estado = leerSalas(almacen)
      const codigo = codigoNuevo(estado.salas)
      const sala: Sala = {
        codigo,
        cuestionarioId,
        titulo: cuestionario.titulo,
        anfitrionId: perfil.id,
        anfitrionNombre: perfil.nombre,
        estado: 'esperando',
        preguntaActual: 0,
        segundos: SEGUNDOS,
        cierraEn: null,
        participantes: [],
        preguntas: copiarPreguntas(cuestionario.preguntas),
        canal: 'simulado',
      }
      estado.salas[codigo] = sala
      guardarSalas(almacen, estado)
      publicar(codigo, sala)
      return sala
    },
    async unirse(token, codigo) {
      exigirConexion()
      const perfil = await exigirPerfil(autenticacion, token)
      const estado = leerSalas(almacen)
      const sala = exigirSala(estado, codigo)
      if (sala.estado === 'finalizada') {
        throw new ErrorServicio('estado', 'Esta partida ya finalizó.')
      }
      const existente = sala.participantes.find((item) => item.perfilId === perfil.id)
      if (existente) {
        existente.conectado = true
        existente.nombre = perfil.nombre
      } else {
        const participante: Participante = {
          id: crypto.randomUUID(),
          perfilId: perfil.id,
          nombre: perfil.nombre,
          conectado: true,
          puntaje: 0,
          aciertos: 0,
          respuestas: [],
        }
        sala.participantes.push(participante)
      }
      guardarSalas(almacen, estado)
      publicar(sala.codigo, sala)
      return sala
    },
    async obtener(token, codigo) {
      exigirConexion()
      await exigirPerfil(autenticacion, token)
      return exigirSala(leerSalas(almacen), codigo)
    },
    suscribir(codigo, alCambiar) {
      const normalizado = codigo.toUpperCase()
      let mapa = registros.get(almacen)
      if (!mapa) {
        mapa = new Map()
        registros.set(almacen, mapa)
      }
      const conjunto = mapa.get(normalizado) ?? new Set<(sala: Sala) => void>()
      conjunto.add(alCambiar)
      mapa.set(normalizado, conjunto)
      let canal: BroadcastChannel | null = null
      if (typeof BroadcastChannel !== 'undefined') {
        canal = new BroadcastChannel('profelink-salas')
        canal.onmessage = (evento: MessageEvent<{ codigo?: string }>) => {
          if (evento.data?.codigo !== normalizado || conexion !== 'conectado') return
          const sala = leerSalas(almacen).salas[normalizado]
          if (sala) alCambiar(sala)
        }
      }
      return () => {
        conjunto.delete(alCambiar)
        canal?.close()
      }
    },
    async iniciar(token, codigo) {
      exigirConexion()
      const perfil = await exigirPerfil(autenticacion, token)
      const estado = leerSalas(almacen)
      const sala = exigirSala(estado, codigo)
      if (sala.anfitrionId !== perfil.id) {
        throw new ErrorServicio('permiso', 'Solo el anfitrión puede iniciar la partida.')
      }
      if (sala.participantes.length === 0) {
        throw new ErrorServicio('estado', 'Todavía no hay participantes.')
      }
      if (sala.estado !== 'esperando') {
        throw new ErrorServicio('estado', 'La partida ya fue iniciada.')
      }
      sala.estado = 'pregunta'
      sala.preguntaActual = 0
      sala.cierraEn = new Date(Date.now() + sala.segundos * 1000).toISOString()
      guardarSalas(almacen, estado)
      publicar(sala.codigo, sala)
      return sala
    },
    async responder(token, codigo, valor) {
      exigirConexion()
      const perfil = await exigirPerfil(autenticacion, token)
      const estado = leerSalas(almacen)
      const sala = exigirSala(estado, codigo)
      const pregunta = sala.preguntas[sala.preguntaActual]
      if (!pregunta || sala.estado !== 'pregunta') {
        throw new ErrorServicio('tarde', 'La pregunta ya está cerrada. La respuesta no se acepta.')
      }
      if (sala.cierraEn && Date.now() > new Date(sala.cierraEn).getTime()) {
        throw new ErrorServicio('tarde', 'El tiempo de respuesta terminó.')
      }
      const participante = sala.participantes.find((item) => item.perfilId === perfil.id)
      if (!participante) throw new ErrorServicio('permiso', 'No estás unido a esta sala.')
      if (participante.respuestas.some((respuesta) => respuesta.preguntaId === pregunta.id && respuesta.aceptada)) {
        throw new ErrorServicio('estado', 'Ya enviaste una respuesta para esta pregunta.')
      }
      participante.respuestas.push({
        preguntaId: pregunta.id,
        valor: typeof valor === 'boolean' ? valor : null,
        opcionId: typeof valor === 'string' ? valor : undefined,
        aceptada: true,
        tardia: false,
        puntos: 0,
      })
      guardarSalas(almacen, estado)
      publicar(sala.codigo, sala)
      return sala
    },
    async cerrarPregunta(token, codigo) {
      exigirConexion()
      const perfil = await exigirPerfil(autenticacion, token)
      const estado = leerSalas(almacen)
      const sala = exigirSala(estado, codigo)
      if (sala.anfitrionId !== perfil.id) {
        throw new ErrorServicio('permiso', 'Solo el anfitrión puede cerrar la pregunta.')
      }
      if (sala.estado !== 'pregunta') {
        throw new ErrorServicio('estado', 'No hay una pregunta abierta.')
      }
      const pregunta = sala.preguntas[sala.preguntaActual]
      if (!pregunta) throw new ErrorServicio('estado', 'No hay una pregunta activa.')
      for (const participante of sala.participantes) {
        const respuesta = participante.respuestas.find((item) => item.preguntaId === pregunta.id && item.aceptada)
        if (!respuesta) {
          participante.respuestas.push({
            preguntaId: pregunta.id,
            valor: null,
            aceptada: false,
            tardia: false,
            puntos: 0,
          })
          continue
        }
        if (respuesta.puntos > 0) continue
        if (acierto(pregunta, respuesta)) {
          respuesta.puntos = 1
          participante.puntaje += 1
          participante.aciertos += 1
        } else {
          respuesta.puntos = 0
        }
      }
      sala.estado = 'cerrada'
      sala.cierraEn = null
      guardarSalas(almacen, estado)
      publicar(sala.codigo, sala)
      return sala
    },
    async avanzar(token, codigo) {
      exigirConexion()
      const perfil = await exigirPerfil(autenticacion, token)
      const estado = leerSalas(almacen)
      const sala = exigirSala(estado, codigo)
      if (sala.anfitrionId !== perfil.id) {
        throw new ErrorServicio('permiso', 'Solo el anfitrión puede avanzar la partida.')
      }
      if (sala.estado !== 'cerrada') {
        throw new ErrorServicio('estado', 'Cierra la pregunta antes de avanzar.')
      }
      if (sala.preguntaActual + 1 >= sala.preguntas.length) {
        sala.estado = 'finalizada'
        const resumen: ResumenResultado = {
          codigo: sala.codigo,
          titulo: sala.titulo,
          finalizadaEn: new Date().toISOString(),
          anfitrionId: sala.anfitrionId,
          participantes: sala.participantes.map((item) => ({ ...item, respuestas: [...item.respuestas] })),
        }
        const resultados = leerResultados(almacen).filter((item) => item.codigo !== sala.codigo)
        resultados.unshift(resumen)
        almacen.escribir(CLAVE_RESULTADOS, JSON.stringify(resultados))
      } else {
        sala.preguntaActual += 1
        sala.estado = 'pregunta'
        sala.cierraEn = new Date(Date.now() + sala.segundos * 1000).toISOString()
      }
      guardarSalas(almacen, estado)
      publicar(sala.codigo, sala)
      return sala
    },
    async historial(token) {
      exigirConexion()
      const perfil = await exigirPerfil(autenticacion, token)
      return leerResultados(almacen).filter(
        (resultado) =>
          resultado.anfitrionId === perfil.id ||
          resultado.participantes.some((participante) => participante.perfilId === perfil.id),
      )
    },
    async obtenerResultado(token, codigo) {
      exigirConexion()
      await exigirPerfil(autenticacion, token)
      const resultado = leerResultados(almacen).find((item) => item.codigo === codigo.toUpperCase())
      if (!resultado) throw new ErrorServicio('no-encontrado', 'Esta sesión todavía no tiene resultados guardados.')
      return resultado
    },
  }
}

async function mensaje(respuesta: Response): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as { mensaje?: string }
    return cuerpo.mensaje ?? 'La API de sesiones rechazó la solicitud.'
  } catch {
    return 'La API de sesiones no respondió correctamente.'
  }
}

export function crearSalaHttp(baseUrl: string, canalUrl: string): ClienteSala {
  const raiz = baseUrl.replace(/\/$/, '')
  let conexion: EstadoConexion = 'conectado'
  const autorizacion = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  })

  async function enviar(token: string, ruta: string, metodo: string, cuerpo?: unknown): Promise<Sala> {
    if (conexion !== 'conectado') {
      throw new ErrorServicio('conexion', 'No hay conexión con la sala.')
    }
    const respuesta = await fetch(`${raiz}${ruta}`, {
      method: metodo,
      headers: autorizacion(token),
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
    if (respuesta.status === 403) throw new ErrorServicio('permiso', await mensaje(respuesta))
    if (respuesta.status === 404) throw new ErrorServicio('no-encontrado', await mensaje(respuesta))
    if (respuesta.status === 409) throw new ErrorServicio('tarde', await mensaje(respuesta))
    if (!respuesta.ok) throw new ErrorServicio('conexion', await mensaje(respuesta))
    return (await respuesta.json()) as Sala
  }

  return {
    canal: 'remoto',
    estadoConexion: () => conexion,
    desconectar() {
      conexion = 'desconectado'
    },
    reconectar() {
      conexion = 'conectado'
    },
    crear: (token, cuestionarioId) => enviar(token, '/sesiones-juego', 'POST', { cuestionarioId }),
    unirse: (token, codigo) => enviar(token, `/sesiones-juego/${codigo}/participantes`, 'POST', {}),
    obtener: (token, codigo) => enviar(token, `/sesiones-juego/${codigo}`, 'GET'),
    iniciar: (token, codigo) => enviar(token, `/sesiones-juego/${codigo}/iniciar`, 'POST', {}),
    responder: (token, codigo, valor) =>
      enviar(token, `/sesiones-juego/${codigo}/respuestas`, 'POST', {
        valor: typeof valor === 'boolean' ? valor : null,
        opcionId: typeof valor === 'string' ? valor : undefined,
      }),
    cerrarPregunta: (token, codigo) => enviar(token, `/sesiones-juego/${codigo}/cerrar`, 'POST', {}),
    avanzar: (token, codigo) => enviar(token, `/sesiones-juego/${codigo}/avanzar`, 'POST', {}),
    async historial(token) {
      const respuesta = await fetch(`${raiz}/resultados`, { headers: { Authorization: `Bearer ${token}` } })
      if (!respuesta.ok) throw new ErrorServicio('conexion', await mensaje(respuesta))
      return (await respuesta.json()) as ResumenResultado[]
    },
    async obtenerResultado(token, codigo) {
      const respuesta = await fetch(`${raiz}/resultados/${codigo}`, { headers: { Authorization: `Bearer ${token}` } })
      if (respuesta.status === 404) throw new ErrorServicio('no-encontrado', 'Esta sesión todavía no tiene resultados guardados.')
      if (!respuesta.ok) throw new ErrorServicio('conexion', await mensaje(respuesta))
      return (await respuesta.json()) as ResumenResultado
    },
    suscribir(codigo, alCambiar) {
      if (typeof WebSocket === 'undefined' || !canalUrl) return () => undefined
      const socket = new WebSocket(`${canalUrl}?codigo=${codigo}`)
      socket.onopen = () => {
        conexion = 'conectado'
      }
      socket.onerror = () => {
        conexion = 'error'
      }
      socket.onclose = () => {
        if (conexion === 'conectado') conexion = 'desconectado'
      }
      socket.onmessage = (evento) => {
        const datos = JSON.parse(String(evento.data)) as { sala?: Sala }
        if (datos.sala?.codigo === codigo) alCambiar(datos.sala)
      }
      return () => socket.close()
    },
  }
}
