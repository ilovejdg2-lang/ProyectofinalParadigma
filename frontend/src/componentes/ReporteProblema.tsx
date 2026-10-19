import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'

const categorias = ['Interfaz', 'Cuestionarios', 'Partida', 'Cuenta', 'Otro']
const prioridades = ['Baja', 'Media', 'Alta']

export function ReporteProblema({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const ubicacion = useLocation()
  const [asunto, setAsunto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [prioridad, setPrioridad] = useState('Media')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cerrar() {
    setAsunto('')
    setDescripcion('')
    setCategoria('')
    setPrioridad('Media')
    setEnviado(false)
    setError(null)
    onCerrar()
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (asunto.trim().length < 3) {
      setError('El asunto necesita al menos 3 caracteres.')
      return
    }
    if (descripcion.trim().length < 10) {
      setError('Describe el problema con al menos 10 caracteres.')
      return
    }
    const guardados = JSON.parse(localStorage.getItem('profelink.reportes') ?? '[]') as unknown[]
    guardados.unshift({
      asunto: asunto.trim(),
      descripcion: descripcion.trim(),
      categoria,
      prioridad,
      ruta: ubicacion.pathname,
      navegador: navigator.userAgent,
      creadoEn: new Date().toISOString(),
    })
    localStorage.setItem('profelink.reportes', JSON.stringify(guardados.slice(0, 20)))
    setError(null)
    setEnviado(true)
  }

  if (!abierto) return null

  return (
    <div className="dialogo" role="dialog" aria-modal="true" aria-labelledby="titulo-reporte">
      <form className="panel reporte" onSubmit={enviar}>
        <div className="reporte-cabeza">
          <span className="reporte-icono" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="13" r="5" />
              <path d="M12 8V5M9 3h6M5 13H3M21 13h-2M7 18l-2 2M17 18l2 2" />
            </svg>
          </span>
          <h2 id="titulo-reporte">Reportar un Problema</h2>
          <button className="reporte-cerrar" type="button" aria-label="Cerrar" onClick={cerrar}>
            ×
          </button>
        </div>
        {enviado ? (
          <p>Reporte enviado. Quedó guardado en este navegador porque el servicio de reportes todavía se simula.</p>
        ) : (
          <>
            <p>Ayúdanos a mejorar ProfeLink reportando cualquier problema que encuentres.</p>
            <label className="campo-grupo">
              <span>Asunto *</span>
              <input
                className="campo"
                value={asunto}
                maxLength={120}
                placeholder="Ej: Error al cargar la lista de estudiantes"
                onChange={(evento) => setAsunto(evento.target.value)}
              />
            </label>
            <label className="campo-grupo">
              <span>Descripción del problema *</span>
              <textarea
                className="area"
                value={descripcion}
                maxLength={5000}
                placeholder="Describe detalladamente qué problema encontraste, qué estabas haciendo cuando ocurrió, y cualquier otro detalle relevante..."
                onChange={(evento) => setDescripcion(evento.target.value)}
              />
              <small className="reporte-cuenta">{descripcion.length}/5000</small>
            </label>
            <div className="reporte-fila">
              <label className="campo-grupo">
                <span>Categoría</span>
                <select className="seleccion" value={categoria} onChange={(evento) => setCategoria(evento.target.value)}>
                  <option value="">Seleccionar...</option>
                  {categorias.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="campo-grupo">
                <span>Prioridad</span>
                <select className="seleccion reporte-prioridad" value={prioridad} onChange={(evento) => setPrioridad(evento.target.value)}>
                  {prioridades.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="reporte-nota">
              La información de tu navegador y la página actual se incluirán automáticamente para ayudarnos a diagnosticar el problema.
            </p>
            {error ? <p className="error-texto">{error}</p> : null}
          </>
        )}
        <div className="reporte-acciones">
          <button className="boton-fantasma" type="button" onClick={cerrar}>
            {enviado ? 'Cerrar' : 'Cancelar'}
          </button>
          {enviado ? null : (
            <button className="boton reporte-enviar" type="submit">
              Enviar Reporte
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
