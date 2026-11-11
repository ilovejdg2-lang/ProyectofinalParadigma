import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx'
import { Podio } from '../componentes/Podio.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import { textoCorrecto } from '../dominio/opciones.ts'
import { audio } from '../juego/audio.ts'
import { Avatar, avatarValido, avatarVisible, guardarFichaLocal } from '../juego/avatares.tsx'
import { ClasificacionPantalla } from '../juego/ClasificacionPantalla.tsx'
import { EscenarioPartida } from '../juego/EscenarioPartida.tsx'
import { FeedbackEstudiante } from '../juego/FeedbackEstudiante.tsx'
import { FlujoIngreso, type FichaIngreso } from '../juego/FlujoIngreso.tsx'
import { CuentaRegresiva } from '../juego/CuentaRegresiva.tsx'
import { FondoJuego } from '../juego/FondoJuego.tsx'
import { OpcionesJuego } from '../juego/OpcionesJuego.tsx'
import { rachaDe } from '../juego/racha.ts'
import { cuentaActiva, paisajeDe } from '../juego/ronda.ts'
import { Temporizador } from '../juego/Temporizador.tsx'
import { useSala } from './useSala.ts'

export function Partida() {
  const { codigo = '' } = useParams()
  const { sala: cliente } = useServicios()
  const { token, perfil } = useAutenticacion()
  const { sala, error, cargando, conexion, recargar, setError } = useSala(codigo)
  const [enviando, setEnviando] = useState(false)
  const [uniendo, setUniendo] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())
  const fase = useRef<string | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [])

  const marcaFase = sala ? `${sala.estado}:${sala.preguntaActual}` : ''
  useEffect(() => {
    if (!sala || !perfil) return
    if (fase.current === marcaFase) return
    const anterior = fase.current
    fase.current = marcaFase
    if (!anterior) return
    if (sala.estado === 'pregunta') audio.efecto('jugar', `jugar-${sala.preguntaActual}`)
    if (sala.estado === 'clasificacion') audio.efecto('clasificacion', `clasif-${sala.preguntaActual}`)
    if (sala.estado !== 'cerrada') return
    const pregunta = sala.preguntas[sala.preguntaActual]
    const yo = sala.participantes.find((item) => item.perfilId === perfil.id)
    const respuesta = pregunta ? yo?.respuestas.find((item) => item.preguntaId === pregunta.id && item.aceptada) : undefined
    if (!respuesta) audio.efecto('tiempo', `tiempo-${sala.preguntaActual}`)
    else if (respuesta.puntos > 0) {
      const racha = rachaDe(yo, sala.preguntas)
      audio.efecto(racha >= 3 ? 'racha' : 'correcto', `resultado-${sala.preguntaActual}`)
    } else audio.efecto('incorrecto', `resultado-${sala.preguntaActual}`)
  }, [marcaFase, perfil, sala])

  if (cargando) return <EstadoCarga texto="Entrando a la partida…" />
  if (!sala) return <EstadoError mensaje={error ?? 'No se pudo entrar a la sala.'} onReintentar={() => void recargar()} />
  if (perfil && sala.anfitrionId === perfil.id) return <Navigate to={`/sala/${sala.codigo}`} replace />
  if (perfil && !sala.participantes.some((item) => item.perfilId === perfil.id)) {
    return (
      <FlujoIngreso
        codigoInicial={sala.codigo}
        enviando={uniendo}
        error={error}
        onEntrar={(_codigo, ficha) => void entrar(ficha)}
      />
    )
  }

  const pregunta = sala.preguntas[sala.preguntaActual]
  const participante = sala.participantes.find((item) => item.perfilId === perfil?.id)
  const respuesta = pregunta
    ? participante?.respuestas.find((item) => item.preguntaId === pregunta.id && item.aceptada)
    : undefined
  const enCuenta = cuentaActiva(sala, ahora)
  const restante = sala.cierraEn ? Math.max(0, new Date(sala.cierraEn).getTime() - ahora) : 0
  const tiempoAgotado = sala.estado === 'pregunta' && !enCuenta && sala.cierraEn !== null && restante === 0
  const bloqueada = Boolean(respuesta) || sala.estado !== 'pregunta' || enviando || tiempoAgotado || enCuenta
  const paisaje = paisajeDe(sala, ahora, restante)
  const tension = paisaje === 'suspenso' && restante > 0 && restante <= 10_000
  const enJuego = sala.estado !== 'esperando'

  async function entrar(ficha: FichaIngreso) {
    if (!token || !perfil) return
    setUniendo(true)
    try {
      if (avatarValido(ficha.avatarId)) guardarFichaLocal(perfil.id, ficha.avatarId)
      await cliente.unirse(token, codigo, ficha)
      setError(null)
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setUniendo(false)
    }
  }

  async function elegir(opcionId: string) {
    if (!token || bloqueada) return
    void audio.desbloquear()
    setEnviando(true)
    try {
      await cliente.responder(token, sala!.codigo, opcionId)
      setAviso('Respuesta enviada. No puedes cambiarla.')
    } catch (err) {
      setAviso(mensajeDe(err))
    } finally {
      setEnviando(false)
    }
  }

  const cuerpo = (
    <>
      {conexion !== 'conectado' || error ? (
        <p className="aviso-sala" role="alert">
          <span>{error ?? 'Se perdió la conexión.'}</span>
          <button className="boton" type="button" onClick={() => { cliente.reconectar(); void recargar() }}>
            Reintentar
          </button>
        </p>
      ) : null}
      {sala.estado === 'esperando' ? (
        <section className="lobby-estudiante">
          {participante ? <Avatar id={avatarVisible(participante.perfilId, participante.avatarId)} tamano={120} /> : null}
          <h1>Esperando al docente</h1>
          <p>{participante?.nombre} · {sala.titulo}</p>
          <p className="codigo-sala">{sala.codigo}</p>
          <p aria-live="polite">{sala.participantes.length} {sala.participantes.length === 1 ? 'estudiante en la sala' : 'estudiantes en la sala'}</p>
        </section>
      ) : null}
      {enCuenta && sala.abreEn ? <CuentaRegresiva abreEn={sala.abreEn} ahora={ahora} /> : null}
      {sala.estado === 'finalizada' ? (
        <section className="final-partida">
          <header className="final-encabezado">
            <p className="meta">Clasificación final</p>
            <h1>{sala.titulo}</h1>
          </header>
          <Podio participantes={sala.participantes} perfilId={perfil?.id} />
          <div className="final-acciones">
            <Link className="boton" to={`/resultados/${sala.codigo}`}>Ver reporte</Link>
            <Link className="boton-fantasma" to="/">Salir</Link>
          </div>
        </section>
      ) : null}
      {pregunta && !enCuenta && sala.estado === 'pregunta' ? (
        <section className="pregunta-inmersiva">
          {respuesta ? (
            <div className="espera-respuesta" role="status">
              <span className="espera-pulso" aria-hidden="true" />
              <h2>Respuesta enviada</h2>
              <p>Respuesta enviada. No puedes cambiarla.</p>
            </div>
          ) : null}
          <Temporizador restante={restante} total={sala.segundos} activo />
          <h1 className="enunciado">{pregunta.enunciado}</h1>
          {pregunta.imagenUrl ? <img className="vista-imagen" src={pregunta.imagenUrl} alt="" /> : null}
          <OpcionesJuego pregunta={pregunta} elegida={respuesta?.opcionId} bloqueada={bloqueada} onElegir={(opcionId) => void elegir(opcionId)} />
          {tiempoAgotado && !respuesta ? <p role="status">El tiempo terminó.</p> : null}
          {aviso && !respuesta ? <p role="status">{aviso}</p> : null}
        </section>
      ) : null}
      {pregunta && sala.estado === 'cerrada' ? (
        <FeedbackEstudiante
          respuesta={respuesta}
          total={participante?.puntaje ?? 0}
          correcta={textoCorrecto(pregunta)}
          racha={rachaDe(participante, sala.preguntas)}
        />
      ) : null}
      {pregunta && sala.estado === 'clasificacion' ? (
        <>
          <ClasificacionPantalla participantes={sala.participantes} preguntaId={pregunta.id} perfilId={perfil?.id} />
          <p className="espera-docente">El docente inicia la siguiente pregunta cuando todos estén preparados.</p>
        </>
      ) : null}
    </>
  )

  if (!enJuego) {
    return (
      <main className="partida escenario">
        <FondoJuego />
        <header className="fila juego-barra">
          <strong>{sala.titulo}</strong>
          <span className="meta">Código {sala.codigo}</span>
          <Link to="/">Salir</Link>
        </header>
        {cuerpo}
      </main>
    )
  }

  const faseTexto =
    sala.estado === 'pregunta' ? 'Pregunta' : sala.estado === 'cerrada' ? 'Resultados' : sala.estado === 'clasificacion' ? 'Clasificación' : 'Podio'

  return (
    <EscenarioPartida
      fase={faseTexto}
      preguntaActual={sala.preguntaActual}
      total={sala.preguntas.length}
      paisaje={paisaje}
      tension={tension}
    >
      {cuerpo}
    </EscenarioPartida>
  )
}
