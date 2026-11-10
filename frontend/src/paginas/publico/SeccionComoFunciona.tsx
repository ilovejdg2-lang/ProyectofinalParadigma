import { useRevelar } from './revelar.ts'

export function SeccionComoFunciona() {
  const caja = useRevelar<HTMLDivElement>()
  return (
    <section className="landing-funcion" id="como-funciona" aria-labelledby="titulo-funcion">
      <div className="landing-funcion-caja revelar" ref={caja}>
        <h2 id="titulo-funcion">Cómo funciona</h2>
        <p>
          ProfeLink hoy reúne evaluaciones en vivo, el catálogo de cuestionarios y el historial de cada partida. Estas
          son las piezas que ya puedes usar al crear tu cuenta.
        </p>
        <ol>
          <li>
            <strong>Arma o descubre un cuestionario.</strong>
            <span>Un docente crea preguntas con varias respuestas, con imagen si hace falta. El grupo las encuentra en Descubrir.</span>
          </li>
          <li>
            <strong>Abre una sala en vivo.</strong>
            <span>La sesión genera un código y un QR. Quien participa entra con su cuenta, sin compartir contraseñas.</span>
          </li>
          <li>
            <strong>Revisa el resultado.</strong>
            <span>El servicio asigna un punto por acierto. Docentes y estudiantes consultan después el historial de la partida.</span>
          </li>
        </ol>
      </div>
    </section>
  )
}
