import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx'
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
    <section>
      <header className="encabezado-pagina">
        <div>
          <h1>{resultado.titulo}</h1>
          <p>Clasificación de la sesión {resultado.codigo}. El puntaje lo informa el servicio: 1 por acierto y 0 por error o falta de respuesta.</p>
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
      <div className="clasificacion">
        {orden.map((participante, indice) => (
          <article className={participante.perfilId === perfil?.id ? 'puesto mio' : 'puesto'} key={participante.id}>
            <span className="lugar">{indice + 1}</span>
            <strong>{participante.nombre}</strong>
            <span>
              {participante.puntaje} pts · {participante.aciertos} aciertos
            </span>
          </article>
        ))}
      </div>
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
