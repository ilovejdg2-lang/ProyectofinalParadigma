import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CodigoQr, enlaceDePartida } from '../componentes/CodigoQr.tsx'
import { EstadoCarga, EstadoError, EstadoVacio } from '../componentes/Interfaz.tsx'
import { Podio } from '../componentes/Podio.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import { audio } from '../juego/audio.ts'
import { Avatar, avatarVisible } from '../juego/avatares.tsx'
import { ClasificacionPantalla } from '../juego/ClasificacionPantalla.tsx'
import { ControlesAudio } from '../juego/ControlesAudio.tsx'
import { CuentaRegresiva } from '../juego/CuentaRegresiva.tsx'
import { EscenarioPartida } from '../juego/EscenarioPartida.tsx'
import { EscenaMinijuego } from '../juego/Minijuegos.tsx'
import { FondoJuego } from '../juego/FondoJuego.tsx'
import { GraficaGrupo } from '../juego/GraficaGrupo.tsx'
import { OpcionesJuego } from '../juego/OpcionesJuego.tsx'
import { cuentaRespuestas } from '../juego/estadisticas.ts'
import { cuentaActiva, paisajeDe } from '../juego/ronda.ts'
import { Temporizador } from '../juego/Temporizador.tsx'
import { useSala } from './useSala.ts'

export function SalaAnfitrion() {
  const { codigo = '' } = useParams()
  const { sala: cliente } = useServicios()
  const { token, perfil } = useAutenticacion()
  const { sala, error, cargando, conexion, recargar, setError, setConexion } = useSala(codigo)
  const [copiado, setCopiado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())
  const previos = useRef(0)
  const fase = useRef<string | null>(null)
  const cierrePedido = useRef('')

  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!sala || sala.estado !== 'esperando') return
    if (sala.participantes.length > previos.current) audio.efecto('ingreso')
    previos.current = sala.participantes.length
  }, [sala])

  useEffect(() => {
    if (!sala || !token || sala.estado !== 'pregunta' || !sala.cierraEn || cuentaActiva(sala, ahora)) return
    if (new Date(sala.cierraEn).getTime() > ahora) return
    const marca = `${sala.codigo}:${sala.preguntaActual}:${sala.cierraEn}`
    if (cierrePedido.current === marca) return
    cierrePedido.current = marca
    void cliente.cerrarPregunta(token, sala.codigo).catch(() => {
      cierrePedido.current = ''
    })
  }, [ahora, cliente, sala, token])

  const marcaFase = sala ? `${sala.estado}:${sala.preguntaActual}` : ''
  useEffect(() => {
    if (!sala || fase.current === marcaFase) return
    const anterior = fase.current
    fase.current = marcaFase
    if (!anterior) return
    if (sala.estado === 'pregunta') audio.efecto('jugar', `host-jugar-${sala.preguntaActual}`)
    if (sala.estado === 'cerrada') audio.efecto('clasificacion', `host-cierre-${sala.preguntaActual}`)
    if (sala.estado === 'clasificacion') audio.efecto('clasificacion', `host-clasif-${sala.preguntaActual}`)
    if (sala.estado === 'minijuego') audio.efecto('suspenso', `host-mini-${sala.juego?.ronda ?? sala.preguntaActual}`)
  }, [marcaFase, sala])

  async function accion(operacion: () => Promise<unknown>) {
    void audio.desbloquear()
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
  const enCuenta = cuentaActiva(sala, ahora)
  const restante = sala.cierraEn ? Math.max(0, new Date(sala.cierraEn).getTime() - ahora) : 0
  const conteo = pregunta ? cuentaRespuestas(sala.participantes, pregunta.id, sala.elegibles) : { recibidas: 0, esperadas: sala.participantes.length }
  const academico = Boolean(sala.evaluacion) || sala.juego?.modalidad === 'academico'
  const paisaje = paisajeDe(sala, ahora, restante)
  const tension = paisaje === 'suspenso' && restante > 0 && restante <= 10_000
  const enlace = enlaceDePartida(sala.codigo)
  const ultima = sala.preguntaActual + 1 >= sala.preguntas.length

  if (sala.estado !== 'esperando') {
    const faseTexto =
      sala.estado === 'pregunta' ? 'Pregunta' : sala.estado === 'cerrada' ? 'Resultados' : sala.estado === 'clasificacion' ? 'Clasificación' : sala.estado === 'minijuego' ? 'Minijuego' : 'Podio'
    return (
      <EscenarioPartida fase={faseTexto} preguntaActual={sala.preguntaActual} total={sala.preguntas.length} paisaje={paisaje} tension={tension} codigo={sala.codigo} anfitrion={sala.anfitrionNombre} pie={
        <>
          {sala.estado === 'cerrada' ? (
            <button className="boton grande" type="button" disabled={ocupado} onClick={() => token && void accion(() => cliente.avanzar(token, sala.codigo, 'cerrada'))}>
              Siguiente
            </button>
          ) : null}
          {sala.estado === 'clasificacion' ? (
            <button className="boton grande" type="button" disabled={ocupado} onClick={() => token && void accion(() => cliente.avanzar(token, sala.codigo, 'clasificacion'))}>
              {ultima ? 'Ver podio' : 'Siguiente pregunta'}
            </button>
          ) : null}
          {sala.estado === 'minijuego' ? (
            <button className="boton grande" type="button" disabled={ocupado} onClick={() => token && void accion(() => cliente.avanzar(token, sala.codigo, 'minijuego'))}>
              Continuar
            </button>
          ) : null}
          {sala.estado === 'finalizada' ? <Link className="boton" to={`/resultados/${sala.codigo}`}>Ver reporte</Link> : null}
          {sala.estado === 'finalizada' && sala.evaluacion ? <Link className="boton" to={`/evaluaciones/${sala.codigo}`}>Resultados de la evaluación</Link> : null}
          {sala.estado === 'pregunta' && !enCuenta ? (
            <button className="boton-fantasma" type="button" disabled={ocupado} onClick={() => token && void accion(() => cliente.cerrarPregunta(token, sala.codigo))}>
              Cerrar pregunta
            </button>
          ) : null}
        </>
      }>
        {enCuenta && sala.abreEn ? <CuentaRegresiva abreEn={sala.abreEn} ahora={ahora} /> : null}
        {error ? <p className="error-texto" role="alert">{error}</p> : null}
        {pregunta && !enCuenta && sala.estado === 'pregunta' ? (
          <section className="pregunta-inmersiva">
            <Temporizador restante={restante} total={sala.segundos} activo />
            <p className="contador-respuestas" aria-live="polite">{conteo.recibidas} de {conteo.esperadas} respuestas</p>
            <h1 className="enunciado">{pregunta.enunciado}</h1>
            {pregunta.imagenUrl ? <img className="vista-imagen" src={pregunta.imagenUrl} alt="" /> : null}
            <OpcionesJuego pregunta={pregunta} />
          </section>
        ) : null}
        {pregunta && sala.estado === 'cerrada' ? <GraficaGrupo sala={sala} pregunta={pregunta} /> : null}
        {pregunta && sala.estado === 'clasificacion' ? (
          <ClasificacionPantalla participantes={sala.participantes} preguntaId={pregunta.id} perfilId={perfil?.id} />
        ) : null}
        {sala.estado === 'minijuego' ? (
          <EscenaMinijuego sala={sala} ahora={ahora} academico={academico} anfitrion onJugar={async () => undefined} />
        ) : null}
        {sala.estado === 'finalizada' ? (
          <section className="final-partida">
            <header className="final-encabezado">
              <p className="meta">Clasificación final</p>
              <h1>{sala.titulo}</h1>
            </header>
            <Podio participantes={sala.participantes} perfilId={perfil?.id} academico={academico} total={sala.preguntas.length} />
          </section>
        ) : null}
      </EscenarioPartida>
    )
  }

  return (
    <section className="sala-espera escenario">
      <FondoJuego />
        <div className="sala-lobby">
          <article className="sala-panel">
            <div>
              <div className="sala-kicker">
                <h1>Sala en vivo</h1>
                <span className="pastilla viva">{canal}</span>
              </div>
              <p className="pastilla">{sala.titulo}</p>
              {sala.evaluacion ? <p className="pastilla">Evaluación · {sala.evaluacion.cursoNombre} · vale {sala.evaluacion.valorPorcentaje}%</p> : null}
              {sala.evaluacion ? <p>Solo entra quien pertenece a {sala.evaluacion.cursoNombre}.</p> : null}
              <p>{sala.anfitrionNombre} · comparte este código. Sigue a la vista cuando la partida ya empezó.</p>
              <p className="pin-gigante" data-testid="codigo-sala">
                {sala.codigo.split('').map((letra, indice) => (
                  <span key={`${sala.codigo}-${indice}`}>{letra}</span>
                ))}
              </p>
              <p className="sala-qr-ayuda">Tus estudiantes pueden unirse escaneando el QR o ingresando el código en ProfeLink.</p>
            </div>
            <CodigoQr valor={enlace} etiqueta={`Código QR para entrar a la partida ${sala.codigo}`} />
            <aside className="sala-conteo-grande" aria-live="polite">
              <span>Estudiantes en la sala</span>
              <strong>{sala.participantes.length}</strong>
              {sala.participantes.length === 0 ? (
                <span className="pastilla">Todavía no entra nadie</span>
              ) : (
                <ul className="sala-roster" aria-label="Estudiantes y sus avatares">
                  {sala.participantes.map((participante) => (
                    <li key={participante.id}>
                      <Avatar id={avatarVisible(participante.perfilId, participante.avatarId)} tamano={56} />
                      <strong>{participante.nombre}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </article>
        </div>
      <div className="fila juego-barra">
        <p className="meta">
          {sala.titulo} · {canal} · {conexion === 'conectado' ? 'Conectado' : 'Sin conexión'} · {sala.estado}
        </p>
        <ControlesAudio paisaje={paisaje} tension={tension} />
      </div>
      <div className="acciones controles-sala">
        <button
          className="boton"
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(sala.codigo).then(() => setCopiado(true))
          }}
        >
          {copiado ? 'Código copiado' : 'Copiar código'}
        </button>
        <button
          className="boton grande boton-jugar"
          type="button"
          disabled={ocupado || sala.participantes.length === 0}
          onClick={() => token && void accion(() => cliente.iniciar(token, sala.codigo))}
        >
          Comenzar partida
        </button>
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
      <h2>Participantes ({sala.participantes.length})</h2>
      {sala.participantes.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay participantes" detalle="La partida empieza cuando alguien escanee el QR o entre con el código." />
      ) : (
        <div className="participantes-juego">
          {sala.participantes.map((participante) => (
              <div className="participante-juego" key={participante.id}>
                <Avatar id={avatarVisible(participante.perfilId, participante.avatarId)} tamano={48} />
                <span>
                  <strong>{participante.nombre}</strong>
                  <span>
                    <i className={participante.conectado ? 'punto vivo' : 'punto fuera'} />{' '}
                    {participante.conectado ? 'Conectado' : 'Desconectado'}
                  </span>
                </span>
              </div>
            ))}
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
