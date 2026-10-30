export type Dificultad = 'facil' | 'medio' | 'dificil'

export type ModoJuego = 'en-vivo' | 'practica' | 'evaluacion' | 'desafio'

export interface DefinicionModo {
  id: ModoJuego
  nombre: string
  descripcion: string
  segundosPorPregunta: number
  permiteIndividual: boolean
  mostrarExplicacionInmediata: boolean
}

export interface Perfil {
  id: string
  nombre: string
  correo: string
  rol?: 'teacher' | 'student' | 'admin' | string
}

export interface Sesion {
  token: string
  perfil: Perfil
}

export interface OpcionRespuesta {
  id: string
  texto: string
  correcta: boolean
}

export interface Pregunta {
  id: string
  enunciado: string
  respuestaCorrecta: boolean
  opciones?: OpcionRespuesta[]
  imagenUrl?: string
  orden: number
  segundos?: number
  categoria?: string
  subtema?: string
  dificultad?: Dificultad
  explicacion?: string
  modoRecomendado?: ModoJuego
}

export interface Cuestionario {
  id: string
  titulo: string
  descripcion: string
  categoria: string
  etiquetas: string[]
  dificultad: Dificultad
  modo?: ModoJuego
  autorId: string
  autorNombre: string
  preguntas: Pregunta[]
  imagenUrl?: string
  esDemostracion: boolean
  actualizadoEn: string
}

export interface BorradorOpcion {
  id: string
  texto: string
}

export interface BorradorPregunta {
  id: string
  enunciado: string
  respuestaCorrecta: boolean | null
  opciones: BorradorOpcion[]
  opcionCorrectaId: string | null
  imagenUrl?: string
  imagenSimulada: boolean
}

export interface BorradorCuestionario {
  titulo: string
  descripcion: string
  categoria: string
  etiquetas: string
  dificultad: Dificultad
  imagenUrl?: string
  imagenSimulada: boolean
  preguntas: BorradorPregunta[]
}

export type EstadoSala = 'esperando' | 'pregunta' | 'cerrada' | 'finalizada'

export interface RespuestaParticipante {
  preguntaId: string
  valor: boolean | null
  opcionId?: string
  aceptada: boolean
  tardia: boolean
  puntos: number
}

export interface Participante {
  id: string
  perfilId: string
  nombre: string
  conectado: boolean
  puntaje: number
  aciertos: number
  respuestas: RespuestaParticipante[]
}

export interface Sala {
  codigo: string
  cuestionarioId: string
  titulo: string
  modo?: ModoJuego
  anfitrionId: string
  anfitrionNombre: string
  estado: EstadoSala
  preguntaActual: number
  segundos: number
  cierraEn: string | null
  participantes: Participante[]
  preguntas: Pregunta[]
  canal: 'simulado' | 'remoto'
}

export interface ResultadoImagen {
  url: string
  origen: 'simulado' | 'remoto'
}

export interface ResumenResultado {
  codigo: string
  cuestionarioId?: string
  titulo: string
  modo?: ModoJuego
  finalizadaEn: string
  anfitrionId: string
  participantes: Participante[]
}

export interface EntradaGuardarPartida {
  codigo?: string
  cuestionarioId: string
  modo?: ModoJuego
  respuestas: Array<{
    preguntaId: string
    opcionId?: string
    valor?: boolean | null
    tardia?: boolean
  }>
  puntuacionReportada?: number
}

export interface ProgresoCategoria {
  categoria: string
  partidasCompletadas: number
  aciertos: number
  preguntasRespondidas: number
  porcentajeDominio: number
}

export interface ProgresoUsuario {
  usuarioId: string
  nombre: string
  partidasJugadas: number
  partidasComoAnfitrion: number
  puntajeTotal: number
  totalAciertos: number
  totalIncorrectas: number
  totalPreguntasRespondidas: number
  promedioPorcentaje: number
  mejorPuntaje: number
  modosJugados: ModoJuego[]
  cuestionariosCompletados: string[]
  dominioKanban: ProgresoCategoria
  progresoPorCategoria: ProgresoCategoria[]
  actualizadoEn: string
}
