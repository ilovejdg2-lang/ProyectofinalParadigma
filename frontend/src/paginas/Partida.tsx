import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import { opcionesDe, textoCorrecto } from '../dominio/opciones.ts'
import { useSala } from './useSala.ts'

export function Partida() {
  const { codigo = '' } = useParams()
  const { sala: cliente } = useServicios()
  const { token, perfil } = useAutenticacion()
  const { sala, error, cargando, conexion, recargar, setError } = useSala(codigo)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ahora, setAhora] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!sala || !token || !perfil) return
    if (sala.anfitrionId === perfil.id) return
    if (sala.participantes.some((participante) => participante.perfilId === perfil.id)) return
    cliente.unirse(token, sala.codigo).catch((err: unknown) => setError(mensajeDe(err)))
  }, [cliente, perfil, sala, setError, token])

  if (cargando) return <EstadoCarga texto="Entrando a la partida…" />
  if (!sala) return <EstadoError mensaje={error ?? 'No se pudo entrar a la sala.'} onReintentar={() => void recargar()} />

  const pregunta = sala.preguntas[sala.preguntaActual]
  const participante = sala.participantes.find((item) => item.perfilId === perfil?.id)
  const respuesta = pregunta
    ? participante?.respuestas.find((item) => item.preguntaId === pregunta.id && item.aceptada)
    : undefined
  const restante = sala.cierraEn ? Math.max(0, new Date(sala.cierraEn).getTime() - ahora) : 0
  const tiempoAgotado = sala.estado === 'pregunta' && sala.cierraEn !== null && restante === 0
  const bloqueada = Boolean(respuesta) || sala.estado !== 'pregunta' || enviando || tiempoAgotado
  const porcentaje = sala.cierraEn && sala.estado === 'pregunta' ? Math.min(100, (restante / (sala.segundos * 1000)) * 100) : 0

  async function elegir(opcionId: string) {
    if (!token || bloqueada) return
    setEnviando(true)
    try {
      await cliente.responder(token, sala!.codigo, opcionId)
      setAviso('Respuesta enviada. Espera a que el anfitrión avance.')
    } catch (err) {
      setAviso(mensajeDe(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="partida">
      <header className="fila">
        <strong>{sala.titulo}</strong>
        <span className="meta">Código {sala.codigo}</span>
        <span className="meta">{perfil?.nombre}</span>
        <Link to="/">Salir</Link>
      </header>
      {conexion !== 'conectado' || error ? (
        <EstadoError mensaje={error ?? 'Se perdió la conexión.'} onReintentar={() => {
          cliente.reconectar()
          void recargar()
        }} />
      ) : null}
      {sala.estado === 'esperando' ? (
        <section className="panel">
          <h1>Esperando al anfitrión</h1>
          <p>Ya estás en la sala. La pregunta aparecerá aquí cuando comience la partida.</p>
        </section>
      ) : null}
      {sala.estado === 'finalizada' ? (
        <section className="panel">
          <h1>Partida terminada</h1>
          <Link className="boton" to={`/resultados/${sala.codigo}`}>
            Ver clasificación
          </Link>
        </section>
      ) : null}
      {pregunta && (sala.estado === 'pregunta' || sala.estado === 'cerrada') ? (
        <section className="panel">
          <p className="meta">
            Pregunta {sala.preguntaActual + 1} de {sala.preguntas.length}
          </p>
          {sala.estado === 'pregunta' ? (
            <div className="temporizador" aria-label="Tiempo restante">
              <span style={{ width: `${porcentaje}%` }} />
            </div>
          ) : null}
          <h1 className="enunciado">{pregunta.enunciado}</h1>
          {pregunta.imagenUrl ? <img className="vista-imagen" src={pregunta.imagenUrl} alt="" /> : null}
          <div className="respuestas">
            {opcionesDe(pregunta).map((opcion, numero) => (
              <button
                className={`respuesta tono-${numero % 4}${respuesta?.opcionId === opcion.id ? ' elegida' : ''}`}
                type="button"
                key={opcion.id}
                disabled={bloqueada}
                onClick={() => void elegir(opcion.id)}
              >
                {opcion.texto}
              </button>
            ))}
          </div>
          {respuesta ? <p role="status">Respuesta enviada. No puedes cambiarla.</p> : null}
          {tiempoAgotado && !respuesta ? <p role="status">El tiempo terminó. Si envías ahora, la respuesta se rechaza.</p> : null}
          {sala.estado === 'cerrada' ? (
            <div className="panel">
              <p>Respuesta correcta: {textoCorrecto(pregunta)}</p>
              <p>
                Tu resultado: {participante?.respuestas.find((item) => item.preguntaId === pregunta.id)?.puntos ?? 0} punto
              </p>
              <p>Espera a que el anfitrión avance.</p>
            </div>
          ) : null}
          {aviso ? <p role="status">{aviso}</p> : null}
        </section>
      ) : null}
    </main>
  )
}
