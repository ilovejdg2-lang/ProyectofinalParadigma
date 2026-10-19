import type { BorradorCuestionario } from './tipos.ts'

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
export const TAMANO_MAXIMO_IMAGEN = 1_500_000

export function validarImagen(archivo: File): string | null {
  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    return 'Usa una imagen JPG, PNG, WEBP, GIF o SVG.'
  }
  if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
    return 'La imagen supera 1.5 MB.'
  }
  if (archivo.size === 0) {
    return 'El archivo de imagen está vacío.'
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

  borrador.preguntas.forEach((pregunta, indice) => {
    const enunciado = pregunta.enunciado.trim()
    if (enunciado.length < 5) {
      errores.push(`La pregunta ${indice + 1} necesita un enunciado de al menos 5 caracteres.`)
    }
    if (enunciado.length > 280) {
      errores.push(`La pregunta ${indice + 1} admite como máximo 280 caracteres.`)
    }
    if (pregunta.respuestaCorrecta === null) {
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
