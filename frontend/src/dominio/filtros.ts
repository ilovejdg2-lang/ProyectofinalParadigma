import type { Cuestionario } from './tipos.ts'

export interface FiltrosCatalogo {
  texto: string
  categoria: string
  dificultad: string
  autor: string
}

export function acentoDeDificultad(dificultad: string) {
  if (dificultad === 'facil') return 'verde'
  if (dificultad === 'dificil') return 'naranja'
  return 'azul'
}

export function etiquetaDificultad(dificultad: string) {
  if (dificultad === 'facil') return 'Fácil'
  if (dificultad === 'dificil') return 'Difícil'
  return 'Medio'
}

export function filtrarCuestionarios(lista: Cuestionario[], filtros: FiltrosCatalogo): Cuestionario[] {
  const texto = filtros.texto.trim().toLowerCase()
  return lista.filter((item) => {
    const contenido = [item.titulo, item.descripcion, item.autorNombre, item.categoria, ...item.etiquetas]
      .join(' ')
      .toLowerCase()
    const coincideTexto = texto.length === 0 || contenido.includes(texto)
    const coincideCategoria = !filtros.categoria || item.categoria === filtros.categoria
    const coincideDificultad = !filtros.dificultad || item.dificultad === filtros.dificultad
    const coincideAutor = !filtros.autor || item.autorNombre === filtros.autor
    return coincideTexto && coincideCategoria && coincideDificultad && coincideAutor
  })
}

export function ordenarClasificacion<T extends { puntaje: number; aciertos: number; nombre: string }>(participantes: T[]): T[] {
  return [...participantes].sort(
    (a, b) => b.puntaje - a.puntaje || b.aciertos - a.aciertos || a.nombre.localeCompare(b.nombre, 'es'),
  )
}
