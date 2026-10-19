import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EstadoCarga, EstadoError, EstadoVacio } from '../componentes/Interfaz.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import { filtrarCuestionarios } from '../dominio/filtros.ts'
import type { Cuestionario } from '../dominio/tipos.ts'
import { TarjetaCuestionario } from './TarjetaCuestionario.tsx'

export function Descubrir() {
  const { actividades } = useServicios()
  const [cuestionarios, setCuestionarios] = useState<Cuestionario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [dificultad, setDificultad] = useState('')
  const [autor, setAutor] = useState('')

  function cargar() {
    setCargando(true)
    actividades
      .listar()
      .then((lista) => {
        setCuestionarios(lista)
        setError(null)
      })
      .catch((err: unknown) => setError(mensajeDe(err)))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [actividades])

  const visibles = filtrarCuestionarios(cuestionarios, { texto, categoria, dificultad, autor })
  const categorias = [...new Set(cuestionarios.map((item) => item.categoria))]
  const autores = [...new Set(cuestionarios.map((item) => item.autorNombre))]

  return (
    <>
      <header className="encabezado-pagina">
        <div>
          <h1>Descubrir</h1>
          <p>Elige un cuestionario y ábrelo para jugar como anfitrión.</p>
        </div>
      </header>
      <div className="descubrir-busca">
        <input
          className="buscador"
          placeholder="Buscar un cuestionario..."
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          aria-label="Buscar un cuestionario"
        />
      </div>
      <div className="filtros">
        <select className="seleccion" aria-label="Categoría" value={categoria} onChange={(evento) => setCategoria(evento.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className="seleccion" aria-label="Dificultad" value={dificultad} onChange={(evento) => setDificultad(evento.target.value)}>
          <option value="">Cualquier dificultad</option>
          <option value="facil">Fácil</option>
          <option value="medio">Medio</option>
          <option value="dificil">Difícil</option>
        </select>
        <select className="seleccion" aria-label="Autor" value={autor} onChange={(evento) => setAutor(evento.target.value)}>
          <option value="">Cualquier autor</option>
          {autores.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      {cargando ? <EstadoCarga /> : null}
      {error ? <EstadoError mensaje={error} onReintentar={cargar} /> : null}
      {!cargando && !error && visibles.length === 0 ? (
        <EstadoVacio titulo="No hay cuestionarios para esta búsqueda" detalle="Prueba con otro texto o quita un filtro." />
      ) : null}
      <div className="rejilla rejilla-descubrir">
        {visibles.map((cuestionario) => (
          <TarjetaCuestionario key={cuestionario.id} cuestionario={cuestionario} />
        ))}
      </div>
      <p className="meta">
        ¿No encuentras el tuyo? <Link to="/cuestionarios/nuevo">Crear cuestionario</Link>
      </p>
    </>
  )
}
