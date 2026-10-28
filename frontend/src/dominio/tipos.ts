export type Dificultad = 'facil' | 'medio' | 'dificil'

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
}

export interface Cuestionario {
  id: string
  titulo: string
  descripcion: string
  categoria: string
  etiquetas: string[]
  dificultad: Dificultad
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
  titulo: string
  finalizadaEn: string
  anfitrionId: string
  participantes: Participante[]
}
