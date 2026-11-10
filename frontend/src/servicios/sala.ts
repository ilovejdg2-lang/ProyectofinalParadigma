import { resultadosDemostracion } from '../datos/demostracion.ts'
import { ErrorServicio } from '../dominio/errores.ts'
import { opcionesDe } from '../dominio/opciones.ts'
import type {
  EntradaGuardarPartida,
  Participante,
  Pregunta,
  ProgresoUsuario,
  RespuestaParticipante,
  ResumenResultado,
  Sala,
  ConfiguracionSala,
} from '../dominio/tipos.ts'
import {
  calcularProgresoLocal,
  deduplicarResultados,
  normalizarYValidarResultado,
  validarEntradaPartida,
} from '../dominio/validacion.ts'
import type { ClienteActividades } from './actividades.ts'
import type { ClienteAutenticacion } from './autenticacion.ts'
import { puntosDeRespuesta } from '../juego/puntuacion.ts'
import type { Almacen } from './almacen.ts'

export type EstadoConexion = 'conectado' | 'desconectado' | 'error'

export interface ClienteSala {
  readonly canal: 'simulado' | 'remoto'
  crear(token: string, cuestionarioId: string, config?: ConfiguracionSala): Promise<Sala>
  unirse(token: string, codigo: string, ficha?: { nombre?: string; avatarId?: string }): Promise<Sala>
  obtener(token: string, codigo: string): Promise<Sala>
  suscribir(
    codigo: string,
    token: string,
    alCambiar: (sala: Sala) => void,
    alConexion?: (estado: EstadoConexion) => void,
  ): () => void
  iniciar(token: string, codigo: string): Promise<Sala>
  responder(token: string, codigo: string, valor: boolean | string): Promise<Sala>
  cerrarPregunta(token: string, codigo: string): Promise<Sala>
  avanzar(token: string, codigo: string, desde?: Sala['estado']): Promise<Sala>
  guardarPartida(token: string, entrada: EntradaGuardarPartida): Promise<ResumenResultado>
  historial(token: string): Promise<ResumenResultado[]>
  progreso(token: string): Promise<ProgresoUsuario>
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
  const iniciales = resultadosDemostracion()
  if (!texto) {
    const validos = deduplicarResultados(iniciales)
    almacen.escribir(CLAVE_RESULTADOS, JSON.stringify(validos))
    return validos
  }
  const guardados = JSON.parse(texto) as ResumenResultado[]
  const faltantes = iniciales.filter(
    (demo) => !guardados.some((actual) => actual.codigo === demo.codigo),
  )
  const combinados = deduplicarResultados([...guardados, ...faltantes])
  if (faltantes.length > 0) {
    almacen.escribir(CLAVE_RESULTADOS, JSON.stringify(combinados))
  }
  return combinados
}

function guardarResultados(almacen: Almacen, lista: ResumenResultado[]) {
  almacen.escribir(CLAVE_RESULTADOS, JSON.stringify(deduplicarResultados(lista)))
}

function notificar(almacen: Almacen, codigo: string, sala: Sala) {
  registros.get(almacen)?.get(codigo)?.forEach((oyente) => oyente(sala))
  if (typeof BroadcastChannel === 'undefined') return
  const canal = new BroadcastChannel('profelink-salas')
  canal.postMessage({ codigo })
  canal.close()
}

function codigoNuevo(salas: Record<string, Sala>, existentes?: ResumenResultado[]): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const codigosUsados = new Set(
    existentes?.map((r) => r.codigo.toUpperCase()) ?? [],
  )
  let codigo = ''
  do {
    codigo = Array.from({ length: 6 }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join('')
  } while (salas[codigo] || codigosUsados.has(codigo))
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

function avatarDeFicha(valor: string | undefined): string | undefined {
  const pedido = valor?.trim() ?? ''
  return /^[a-z][a-z-]{1,30}[a-z]$/.test(pedido) ? pedido : undefined
}

function cuentaSimulada(sala: Sala) {
  return Boolean(
    sala.estado === 'pregunta' &&
      sala.preguntaActual === 0 &&
      sala.abreEn &&
      Date.now() < new Date(sala.abreEn).getTime(),
  )
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

  const relojes = new Map<string, number>()

  function cancelarReloj(codigo: string) {
    const id = relojes.get(codigo)
    if (id) clearTimeout(id)
    relojes.delete(codigo)
  }

  function cerrarSala(sala: Sala) {
    cancelarReloj(sala.codigo)
    const pregunta = sala.preguntas[sala.preguntaActual]
    if (!pregunta || sala.estado !== 'pregunta') return
    const limite = (pregunta.segundos && pregunta.segundos >= 5 ? pregunta.segundos : sala.segundos) * 1000
    const inicio = sala.iniciaEn ? new Date(sala.iniciaEn).getTime() : Date.now()
    const ids = new Set(sala.elegibles?.length ? sala.elegibles : sala.participantes.map((item) => item.id))
    for (const participante of sala.participantes) {
      if (!ids.has(participante.id)) continue
      const respuesta = participante.respuestas.find((item) => item.preguntaId === pregunta.id && item.aceptada)
      if (!respuesta || respuesta.puntos > 0) continue
      const enviada = respuesta.enviadaEn ? new Date(respuesta.enviadaEn).getTime() : inicio
      const transcurrido = Math.max(0, enviada - inicio)
      respuesta.milisegundos = transcurrido
      respuesta.puntos = puntosDeRespuesta(acierto(pregunta, respuesta), sala.puntosPorAcierto ?? 1)
    }
    for (const participante of sala.participantes) {
      participante.puntaje = participante.respuestas.reduce((suma, item) => suma + item.puntos, 0)
      participante.aciertos = participante.respuestas.filter((item) => item.puntos > 0).length
      participante.tiempoMs = participante.respuestas.reduce(
        (suma, item) => suma + (item.puntos > 0 ? (item.milisegundos ?? 0) : 0),
        0,
      )
    }
    sala.estado = 'cerrada'
    sala.cierraEn = null
  }

  function programarReloj(sala: Sala) {
    cancelarReloj(sala.codigo)
    if (typeof window === 'undefined' || sala.estado !== 'pregunta' || !sala.cierraEn) return
    const espera = new Date(sala.cierraEn).getTime() - Date.now() + 1
    const id = window.setTimeout(() => {
      relojes.delete(sala.codigo)
      const estado = leerSalas(almacen)
      const vigente = estado.salas[sala.codigo]
      if (!vigente || vigente.estado !== 'pregunta' || !vigente.cierraEn) return
      if (Date.now() <= new Date(vigente.cierraEn).getTime()) return
      cerrarSala(vigente)
      publicar(vigente.codigo, vigente)
    }, Math.max(0, espera))
    relojes.set(sala.codigo, id)
  }

  function abrirPregunta(sala: Sala, indice: number, abreEn?: string) {
    const pregunta = sala.preguntas[indice]
    const segundos = pregunta?.segundos && pregunta.segundos >= 5 && pregunta.segundos <= 120 ? pregunta.segundos : SEGUNDOS
    const inicio = abreEn ? new Date(abreEn).getTime() : Date.now()
    sala.preguntaActual = indice
    sala.estado = 'pregunta'
    sala.segundos = segundos
    sala.iniciaEn = new Date(inicio).toISOString()
    sala.cierraEn = new Date(inicio + segundos * 1000).toISOString()
    sala.elegibles = sala.participantes.map((item) => item.id)
    if (abreEn) sala.abreEn = abreEn
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
      const codigo = codigoNuevo(estado.salas, leerResultados(almacen))
      const sala: Sala = {
        codigo,
        cuestionarioId,
        titulo: cuestionario.titulo,
        modo: cuestionario.modo ?? 'en-vivo',
        anfitrionId: perfil.id,
        anfitrionNombre: perfil.nombre,
        estado: 'esperando',
        preguntaActual: 0,
        segundos: SEGUNDOS,
        cierraEn: null,
        abreEn: null,
        participantes: [],
        preguntas: copiarPreguntas(cuestionario.preguntas),
        canal: 'simulado',
      }
      estado.salas[codigo] = sala
      guardarSalas(almacen, estado)
      publicar(codigo, sala)
      return sala
    },
    async unirse(token, codigo, ficha) {
      exigirConexion()
      const perfil = await exigirPerfil(autenticacion, token)
      const estado = leerSalas(almacen)
      const sala = exigirSala(estado, codigo)
      if (sala.estado === 'finalizada') {
        throw new ErrorServicio('estado', 'Esta partida ya finalizó.')
      }
      const nombre = ficha?.nombre?.trim() || perfil.nombre
      const avatarId = avatarDeFicha(ficha?.avatarId)
      const existente = sala.participantes.find((item) => item.perfilId === perfil.id)
      if (existente) {
        existente.conectado = true
        existente.nombre = nombre
        if (avatarId && (sala.estado === 'esperando' || !existente.avatarId)) existente.avatarId = avatarId
      } else {
        const participante: Participante = {
          id: crypto.randomUUID(),
          perfilId: perfil.id,
          nombre,
          avatarId,
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
    suscribir(codigo, _token, alCambiar) {
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
      const abre = new Date(Date.now() + 4_500).toISOString()
      abrirPregunta(sala, 0, abre)
      guardarSalas(almacen, estado)
      publicar(sala.codigo, sala)
      programarReloj(sala)
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
      if (cuentaSimulada(sala)) {
        throw new ErrorServicio('estado', 'La cuenta regresiva todavía no termina.')
      }
      if (sala.cierraEn && Date.now() > new Date(sala.cierraEn).getTime()) {
        throw new ErrorServicio('tarde', 'El tiempo de respuesta terminó.')
      }
      const participante = sala.participantes.find((item) => item.perfilId === perfil.id)
      if (!participante) throw new ErrorServicio('permiso', 'No estás unido a esta sala.')
      if (sala.elegibles?.length && !sala.elegibles.includes(participante.id)) {
        throw new ErrorServicio('estado', 'Esta pregunta empezó antes de que entraras.')
      }
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
        enviadaEn: new Date().toISOString(),
      })
      const esperados = sala.elegibles?.length ? sala.elegibles : sala.participantes.map((item) => item.id)
      const completos = esperados.every((id) =>
        sala.participantes
          .find((item) => item.id === id)
          ?.respuestas.some((respuesta) => respuesta.preguntaId === pregunta.id && respuesta.aceptada),
      )
      if (esperados.length > 0 && completos) cerrarSala(sala)
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
      if (cuentaSimulada(sala)) {
        throw new ErrorServicio('estado', 'La cuenta regresiva todavía no termina.')
      }
      cerrarSala(sala)
      guardarSalas(almacen, estado)
      publicar(sala.codigo, sala)
      return sala
    },
    async avanzar(token, codigo, desde) {
      exigirConexion()
      const perfil = await exigirPerfil(autenticacion, token)
      const estado = leerSalas(almacen)
      const sala = exigirSala(estado, codigo)
      if (sala.anfitrionId !== perfil.id) {
        throw new ErrorServicio('permiso', 'Solo el anfitrión puede avanzar la partida.')
      }
      if (desde && sala.estado !== desde) {
        throw new ErrorServicio('estado', 'La partida ya avanzó.')
      }
      if (sala.estado === 'cerrada') {
        sala.estado = 'clasificacion'
        guardarSalas(almacen, estado)
        publicar(sala.codigo, sala)
        return sala
      }
      if (sala.estado !== 'clasificacion') {
        throw new ErrorServicio('estado', 'Cierra la pregunta antes de avanzar.')
      }
      if (sala.preguntaActual + 1 >= sala.preguntas.length) {
        sala.estado = 'finalizada'
        const resumen: ResumenResultado = normalizarYValidarResultado({
          codigo: sala.codigo,
          cuestionarioId: sala.cuestionarioId,
          titulo: sala.titulo,
          modo: sala.modo ?? 'en-vivo',
          finalizadaEn: new Date().toISOString(),
          anfitrionId: sala.anfitrionId,
          participantes: sala.participantes.map((item) => ({ ...item, respuestas: [...item.respuestas] })),
        })
        const resultados = leerResultados(almacen).filter((item) => item.codigo !== sala.codigo)
        resultados.unshift(resumen)
        guardarResultados(almacen, resultados)
      } else {
        abrirPregunta(sala, sala.preguntaActual + 1)
        programarReloj(sala)
      }
      guardarSalas(almacen, estado)
      publicar(sala.codigo, sala)
      return sala
    },
    async guardarPartida(token, entrada) {
      exigirConexion()
      const perfil = await exigirPerfil(autenticacion, token)
      const cuestionario = await actividades.obtener(entrada.cuestionarioId)
      const existentes = leerResultados(almacen)
      const codigoSolicitado = entrada.codigo?.trim().toUpperCase().slice(0, 6)
      if (codigoSolicitado) {
        const previo = existentes.find((item) => item.codigo === codigoSolicitado)
        if (previo) {
          const pertenece =
            previo.anfitrionId === perfil.id ||
            previo.participantes.some((p) => p.perfilId === perfil.id)
          if (!pertenece) {
            throw new ErrorServicio('estado', 'Ya existe una partida registrada con ese código.')
          }
          return normalizarYValidarResultado(previo)
        }
      }

      let validado: ReturnType<typeof validarEntradaPartida>
      try {
        validado = validarEntradaPartida(cuestionario, entrada)
      } catch (err) {
        throw new ErrorServicio('validacion', err instanceof Error ? err.message : 'Resultados inválidos.')
      }

      const estado = leerSalas(almacen)
      const codigo =
        codigoSolicitado && /^[A-Z0-9]{6}$/.test(codigoSolicitado)
          ? codigoSolicitado
          : codigoNuevo(estado.salas, existentes)

      const resumen: ResumenResultado = normalizarYValidarResultado({
        codigo,
        cuestionarioId: cuestionario.id,
        titulo: cuestionario.titulo,
        modo: entrada.modo ?? cuestionario.modo ?? 'practica',
        finalizadaEn: new Date().toISOString(),
        anfitrionId: perfil.id,
        participantes: [
          {
            id: crypto.randomUUID(),
            perfilId: perfil.id,
            nombre: perfil.nombre,
            conectado: true,
            puntaje: validado.puntaje,
            aciertos: validado.aciertos,
            respuestas: validado.respuestas,
          },
        ],
      })

      existentes.unshift(resumen)
      guardarResultados(almacen, existentes)
      return resumen
    },
    async historial(token) {
      exigirConexion()
      const perfil = await exigirPerfil(autenticacion, token)
      const idsEquivalentes = new Set(
        perfil.id === 'perfil-demo' || perfil.id === 'perfil-demo-docente'
          ? ['perfil-demo', 'perfil-demo-docente']
          : [perfil.id],
      )
      return deduplicarResultados(leerResultados(almacen)).filter(
        (resultado) =>
          idsEquivalentes.has(resultado.anfitrionId) ||
          resultado.participantes.some((participante) => idsEquivalentes.has(participante.perfilId)),
      )
    },
    async progreso(token) {
      exigirConexion()
      const perfil = await exigirPerfil(autenticacion, token)
      const resultados = leerResultados(almacen)
      const cuestionarios = await actividades.listar()
      return calcularProgresoLocal(perfil.id, perfil.nombre, resultados, cuestionarios)
    },
    async obtenerResultado(token, codigo) {
      exigirConexion()
      await exigirPerfil(autenticacion, token)
      const resultado = leerResultados(almacen).find((item) => item.codigo === codigo.toUpperCase())
      if (!resultado) throw new ErrorServicio('no-encontrado', 'Esta sesión todavía no tiene resultados guardados.')
      return normalizarYValidarResultado(resultado)
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
  let pausado = false
  let reabrir: (() => void) | null = null
  const autorizacion = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  })

  async function enviar(token: string, ruta: string, metodo: string, cuerpo?: unknown): Promise<Sala> {
    if (pausado) {
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
      pausado = true
      conexion = 'desconectado'
    },
    reconectar() {
      pausado = false
      conexion = 'conectado'
      reabrir?.()
    },
    crear: (token, cuestionarioId, config) =>
      enviar(token, '/sesiones-juego', 'POST', { cuestionarioId, ...config }),
    unirse: (token, codigo, ficha) =>
      enviar(token, `/sesiones-juego/${codigo}/participantes`, 'POST', {
        nombre: ficha?.nombre,
        avatarId: ficha?.avatarId,
      }),
    obtener: (token, codigo) => enviar(token, `/sesiones-juego/${codigo}`, 'GET'),
    iniciar: (token, codigo) => enviar(token, `/sesiones-juego/${codigo}/iniciar`, 'POST', {}),
    responder: (token, codigo, valor) =>
      enviar(token, `/sesiones-juego/${codigo}/respuestas`, 'POST', {
        valor: typeof valor === 'boolean' ? valor : null,
        opcionId: typeof valor === 'string' ? valor : undefined,
      }),
    cerrarPregunta: (token, codigo) => enviar(token, `/sesiones-juego/${codigo}/cerrar`, 'POST', {}),
    avanzar: (token, codigo, desde) =>
      enviar(token, `/sesiones-juego/${codigo}/avanzar`, 'POST', desde ? { desde } : {}),
    async guardarPartida(token, entrada) {
      const respuesta = await fetch(`${raiz}/resultados/partidas`, {
        method: 'POST',
        headers: autorizacion(token),
        body: JSON.stringify(entrada),
      })
      if (respuesta.status === 400) throw new ErrorServicio('validacion', await mensaje(respuesta))
      if (respuesta.status === 404) throw new ErrorServicio('no-encontrado', await mensaje(respuesta))
      if (respuesta.status === 409) throw new ErrorServicio('estado', await mensaje(respuesta))
      if (!respuesta.ok) throw new ErrorServicio('conexion', await mensaje(respuesta))
      return normalizarYValidarResultado((await respuesta.json()) as ResumenResultado)
    },
    async historial(token) {
      const respuesta = await fetch(`${raiz}/resultados`, { headers: { Authorization: `Bearer ${token}` } })
      if (!respuesta.ok) throw new ErrorServicio('conexion', await mensaje(respuesta))
      return deduplicarResultados((await respuesta.json()) as ResumenResultado[])
    },
    async progreso(token) {
      const respuesta = await fetch(`${raiz}/resultados/progreso`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!respuesta.ok) throw new ErrorServicio('conexion', await mensaje(respuesta))
      return (await respuesta.json()) as ProgresoUsuario
    },
    async obtenerResultado(token, codigo) {
      const respuesta = await fetch(`${raiz}/resultados/${codigo}`, { headers: { Authorization: `Bearer ${token}` } })
      if (respuesta.status === 404) throw new ErrorServicio('no-encontrado', 'Esta sesión todavía no tiene resultados guardados.')
      if (!respuesta.ok) throw new ErrorServicio('conexion', await mensaje(respuesta))
      return normalizarYValidarResultado((await respuesta.json()) as ResumenResultado)
    },
    suscribir(codigo, token, alCambiar, alConexion) {
      if (typeof WebSocket === 'undefined' || !canalUrl) return () => undefined
      let cerrado = false
      let socket: WebSocket | null = null
      let espera: number | undefined
      let intento = 0

      const avisar = (estado: EstadoConexion) => {
        conexion = estado
        alConexion?.(estado)
      }

      const abrir = () => {
        if (cerrado) return
        if (espera !== undefined) {
          window.clearTimeout(espera)
          espera = undefined
        }
        if (socket) {
          socket.onclose = null
          socket.close()
        }
        const actual = new WebSocket(
          `${canalUrl}?codigo=${encodeURIComponent(codigo)}`,
          ['profelink', `profelink-bearer.${token}`],
        )
        socket = actual
        actual.onopen = () => {
          if (socket !== actual) return
          intento = 0
          avisar('conectado')
          void enviar(token, `/sesiones-juego/${encodeURIComponent(codigo)}`, 'GET')
            .then((sala) => {
              if (socket === actual) alCambiar(sala)
            })
            .catch(() => undefined)
        }
        actual.onerror = () => {
          if (socket === actual) avisar('error')
        }
        actual.onclose = () => {
          if (cerrado || socket !== actual) return
          avisar('desconectado')
          const pausa = Math.min(4000, 300 * 2 ** intento)
          intento += 1
          espera = window.setTimeout(abrir, pausa)
        }
        actual.onmessage = (evento) => {
          if (socket !== actual) return
          const datos = JSON.parse(String(evento.data)) as { sala?: Sala }
          if (datos.sala?.codigo === codigo) {
            avisar('conectado')
            alCambiar(datos.sala)
          }
        }
      }

      const forzar = () => {
        intento = 0
        abrir()
      }
      reabrir = forzar
      abrir()
      return () => {
        cerrado = true
        if (reabrir === forzar) reabrir = null
        if (espera !== undefined) window.clearTimeout(espera)
        if (socket) {
          socket.onclose = null
          socket.close()
        }
      }
    },
  }
}
