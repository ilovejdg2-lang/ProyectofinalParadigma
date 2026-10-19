import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EstadoCarga, EstadoError, EstadoVacio } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import { textoCorrecto } from '../dominio/opciones.ts'
import { useSala } from './useSala.ts'

export function SalaAnfitrion() {
  const { codigo = '' } = useParams()
  const { sala: cliente } = useServicios()
  const { token, perfil } = useAutenticacion()
  const { sala, error, cargando, conexion, recargar, setError, setConexion } = useSala(codigo)
  const [copiado, setCopiado] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  async function accion(operacion: () => Promise<unknown>) {
    setOcupado(true)
    try {
      await operacion()
      setError(null)
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setOcupado(false)
    }
  }

  if (cargando) return <EstadoCarga texto="Abriendo la sala…" />
  if (!sala && error) return <EstadoError mensaje={error} onReintentar={() => void recargar()} />
  if (!sala) return <EstadoError mensaje="No se pudo cargar la sala." />
  if (perfil && sala.anfitrionId !== perfil.id) {
    return (
      <EstadoVacio
        titulo="Esta sala la controla otra persona"
        detalle="Puedes entrar como participante, sin iniciar ni avanzar la partida."
      />
    )
  }

  const pregunta = sala.preguntas[sala.preguntaActual]
  const canal = sala.canal === 'simulado' ? 'Canal simulado' : 'Canal en vivo'

  return (
    <section className="sala-espera">
      <header className="sala-banda">
        <div>
          <p>Comparte este código</p>
          <p className="codigo-sala">{sala.codigo}</p>
        </div>
        <p className="sala-conteo">
          {sala.participantes.length} {sala.participantes.length === 1 ? 'participante' : 'participantes'}
        </p>
      </header>
      <p className="meta">
        {sala.titulo} · {canal} · {conexion === 'conectado' ? 'Conectado' : 'Sin conexión'} · {sala.estado}
      </p>
      {sala.estado === 'esperando' ? (
        <div className="sala-mosaico" aria-hidden="true">
          {Array.from({ length: 12 }, (_, indice) => (
            <span key={indice} />
          ))}
        </div>
      ) : null}
      <div className="acciones">
        <button
          className="boton"
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(sala.codigo).then(() => setCopiado(true))
          }}
        >
          {copiado ? 'Código copiado' : 'Copiar código'}
        </button>
        {sala.estado === 'esperando' ? (
          <button
            className="boton grande"
            type="button"
            disabled={ocupado || sala.participantes.length === 0}
            onClick={() => token && void accion(() => cliente.iniciar(token, sala.codigo))}
          >
            Comenzar partida
          </button>
        ) : null}
        {sala.estado === 'pregunta' ? (
          <button className="boton" type="button" disabled={ocupado} onClick={() => token && void accion(() => cliente.cerrarPregunta(token, sala.codigo))}>
            Cerrar pregunta
          </button>
        ) : null}
        {sala.estado === 'cerrada' ? (
          <button className="boton" type="button" disabled={ocupado} onClick={() => token && void accion(() => cliente.avanzar(token, sala.codigo))}>
            {sala.preguntaActual + 1 >= sala.preguntas.length ? 'Ver resultados' : 'Siguiente pregunta'}
          </button>
        ) : null}
        {sala.estado === 'finalizada' ? (
          <Link className="boton" to={`/resultados/${sala.codigo}`}>
            Ver clasificación
          </Link>
        ) : null}
      </div>
      {conexion !== 'conectado' ? (
        <EstadoError
          mensaje={error ?? 'Se perdió la conexión con la sala.'}
          onReintentar={() => {
            cliente.reconectar()
            setConexion(cliente.estadoConexion())
            void recargar()
          }}
        />
      ) : null}
      {error && conexion === 'conectado' ? <p className="error-texto" role="alert">{error}</p> : null}
      {sala.estado !== 'esperando' && pregunta ? (
        <article className="panel">
          <p className="meta">
            Pregunta {sala.preguntaActual + 1} de {sala.preguntas.length}
          </p>
          <h2>{pregunta.enunciado}</h2>
          {pregunta.imagenUrl ? <img className="vista-imagen" src={pregunta.imagenUrl} alt="" /> : null}
          {sala.estado === 'cerrada' ? (
            <p>Respuesta correcta: {textoCorrecto(pregunta)}</p>
          ) : null}
        </article>
      ) : null}
      <h2>Participantes ({sala.participantes.length})</h2>
      {sala.participantes.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay participantes" detalle="La partida empieza cuando alguien entre con el código." />
      ) : (
        <div className="participantes">
          {sala.participantes.map((participante) => {
            const respondio = pregunta
              ? participante.respuestas.some((respuesta) => respuesta.preguntaId === pregunta.id && respuesta.aceptada)
              : false
            return (
              <div className="participante" key={participante.id}>
                <span>
                  <i className="punto" /> {participante.nombre}
                </span>
                <span>{sala.estado === 'esperando' ? 'En la sala' : respondio ? 'Respondió' : 'Esperando'}</span>
              </div>
            )
          })}
        </div>
      )}
      {sala.canal === 'simulado' ? (
        <button
          className="boton-fantasma"
          type="button"
          onClick={() => {
            cliente.desconectar()
            setConexion('desconectado')
            setError('Conexión simulada interrumpida.')
          }}
        >
          Simular desconexión
        </button>
      ) : null}
    </section>
  )
}
