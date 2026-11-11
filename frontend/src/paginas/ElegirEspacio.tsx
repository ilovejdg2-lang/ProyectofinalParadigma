import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Buho } from '../componentes/Buho.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { guardarTema, leerTema, type Tema } from '../tema.ts'
import { guardarEspacio, type Espacio } from './espacio.ts'

export function ElegirEspacio() {
  const { perfil, salir } = useAutenticacion()
  const navegar = useNavigate()
  const [tema, setTema] = useState<Tema>(() => leerTema())

  useEffect(() => {
    guardarTema(tema)
  }, [tema])

  function elegir(espacio: Espacio) {
    guardarEspacio(espacio)
    navegar(espacio === 'cursos' ? '/cursos' : '/', { replace: true })
  }

  return (
    <main className={`elegir${tema === 'claro' ? ' claro' : ''}`}>
      <button
        className="elegir-tema"
        type="button"
        aria-label={tema === 'oscuro' ? 'Activar modo claro' : 'Activar modo oscuro'}
        onClick={() => setTema((actual) => (actual === 'claro' ? 'oscuro' : 'claro'))}
      >
        {tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
      </button>
      <section className="elegir-panel">
        <div className="elegir-marca">
          <span className="elegir-logo">
            <Buho tamano={48} />
          </span>
          <strong>ProfeLink</strong>
        </div>
        <p className="elegir-saludo">Hola, {perfil?.nombre}</p>
        <h1>¿Qué quieres ver?</h1>
        <p className="elegir-ayuda">Elige un espacio. El menú aparece después de esta elección.</p>
        <div className="elegir-opciones">
          <button className="elegir-opcion" type="button" onClick={() => elegir('cursos')}>
            <span className="elegir-icono" aria-hidden="true">Curso</span>
            <strong>Cursos</strong>
            <span>Paradigmas de Programación, actividades y lo que sigue hoy.</span>
          </button>
          <button className="elegir-opcion" type="button" onClick={() => elegir('cuestionarios')}>
            <span className="elegir-icono" aria-hidden="true">Quiz</span>
            <strong>Cuestionarios</strong>
            <span>Evaluaciones en vivo, práctica y las salas con código.</span>
          </button>
        </div>
        <button className="elegir-salir" type="button" onClick={() => void salir()}>
          Cerrar sesión
        </button>
      </section>
    </main>
  )
}
