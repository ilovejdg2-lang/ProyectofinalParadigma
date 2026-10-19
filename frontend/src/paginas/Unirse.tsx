import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'

export function Unirse() {
  const { sala } = useServicios()
  const { token, perfil } = useAutenticacion()
  const navegar = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!token) return
    if (codigo.trim().length < 4) {
      setError('Escribe el código de la sala.')
      return
    }
    setEnviando(true)
    try {
      const encontrada = await sala.unirse(token, codigo.trim())
      const destino = encontrada.anfitrionId === perfil?.id ? `/sala/${encontrada.codigo}` : `/partida/${encontrada.codigo}`
      navegar(destino)
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="panel formulario" onSubmit={(evento) => void enviar(evento)}>
      <h1>Unirse a una partida</h1>
      <p className="meta">Entrarás como {perfil?.nombre}. El código lo comparte el anfitrión.</p>
      <label className="campo-grupo">
        <span>Código de la sala</span>
        <input className="campo" value={codigo} onChange={(evento) => setCodigo(evento.target.value.toUpperCase())} />
      </label>
      {error ? <p className="error-texto" role="alert">{error}</p> : null}
      <button className="boton grande" type="submit" disabled={enviando}>
        Entrar
      </button>
    </form>
  )
}
