import type { Pregunta, Sala } from '../dominio/tipos.ts'
import { resumenDePregunta } from './estadisticas.ts'
import { formatoSegundos } from './puntuacion.ts'

export function GraficaGrupo({ sala, pregunta }: { sala: Pick<Sala, 'participantes' | 'elegibles'>; pregunta: Pregunta }) {
  const resumen = resumenDePregunta(sala, pregunta)
  const maximo = Math.max(1, ...resumen.barras.map((barra) => barra.cantidad))
  return (
    <section className="grafica-grupo" aria-label="Respuestas del grupo">
      <h2>Respuestas del grupo</h2>
      <ul className="grafica-columnas">
        {resumen.barras.map((barra) => (
          <li key={barra.id}>
            <strong className="grafica-cantidad">{barra.cantidad}</strong>
            <div className={`grafica-columna tono-${barra.tono}${barra.correcta ? ' correcta' : ''}`}>
              <span style={{ height: `${(barra.cantidad / maximo) * 100}%` }} />
            </div>
            <span className="grafica-etiqueta">
              {barra.texto}
              {barra.correcta ? ' ✓' : ''}
            </span>
            <span className="grafica-porcentaje">
              {barra.cantidad} {barra.cantidad === 1 ? 'estudiante' : 'estudiantes'} · {barra.porcentaje} %
            </span>
          </li>
        ))}
      </ul>
      <p className="grafica-acierto">{resumen.porcentajeAciertos} % de respuestas correctas</p>
      <dl className="grafica-resumen">
        <div>
          <dt>Correctas</dt>
          <dd>{resumen.correctas}</dd>
        </div>
        <div>
          <dt>Incorrectas</dt>
          <dd>{resumen.incorrectas}</dd>
        </div>
        <div>
          <dt>Sin respuesta</dt>
          <dd>{resumen.sinRespuesta}</dd>
        </div>
        <div>
          <dt>Aciertos</dt>
          <dd>{resumen.porcentajeAciertos} %</dd>
        </div>
        <div>
          <dt>Tiempo promedio</dt>
          <dd>{resumen.promedioMs === null ? '—' : `${formatoSegundos(resumen.promedioMs)} s`}</dd>
        </div>
        <div>
          <dt>Respuestas</dt>
          <dd>
            {resumen.respuestas} de {resumen.total}
          </dd>
        </div>
      </dl>
    </section>
  )
}
