import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx'
import { Podio } from '../componentes/Podio.tsx'
import { ControlesAudio } from '../juego/ControlesAudio.tsx'
import { FondoJuego } from '../juego/FondoJuego.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import { ordenarClasificacion } from '../dominio/filtros.ts'
import type { ResumenResultado } from '../dominio/tipos.ts'

export function Resultados() {
  const { codigo = '' } = useParams()
  const { sala } = useServicios()
  const { token, perfil } = useAutenticacion()
  const [resultado, setResultado] = useState<ResumenResultado | null>(null)
  const [error, setError] = useState<string | null>(null)

  function cargar() {
    if (!token) return
    sala
      .obtenerResultado(token, codigo)
      .then((dato) => {
        setResultado(dato)
        setError(null)
      })
      .catch((err: unknown) => setError(mensajeDe(err)))
  }

  useEffect(() => {
    cargar()
  }, [codigo, sala, token])

  if (error) return <EstadoError mensaje={error} onReintentar={cargar} />
  if (!resultado) return <EstadoCarga texto="Cargando resultados…" />
  const orden = ordenarClasificacion(resultado.participantes)
  const mio = orden.find((participante) => participante.perfilId === perfil?.id)
  const puesto = mio ? orden.indexOf(mio) + 1 : null

  return (
    <section className="escenario">
      <FondoJuego />
      <ControlesAudio paisaje="victoria" />
      <header className="encabezado-pagina">
        <div>
          <h1>{resultado.titulo}</h1>
          <p>Clasificación de la sesión {resultado.codigo}. Cada acierto vale de 500 a 1,000 puntos según la rapidez. Un error o una respuesta ausente vale 0.</p>
        </div>
      </header>
      {puesto && mio ? (
        <article className="panel">
          <p>Tu puesto: {puesto}</p>
          <p>
            {mio.puntaje} puntos · {mio.aciertos} aciertos
          </p>
        </article>
      ) : null}
      <Podio participantes={orden} perfilId={perfil?.id} />
      <div className="acciones">
        <Link className="boton" to="/">
          Volver al inicio
        </Link>
        <Link className="boton-fantasma" to="/historial">
          Ver historial
        </Link>
      </div>
    </section>
  )
}
