import { useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { Buho } from '../componentes/Buho.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { AVATARES, Avatar, CATEGORIAS_AVATAR, avatarValido, type CategoriaAvatar, type IdAvatar } from './avatares.tsx'
import { CasillasCodigo, LONGITUD_CODIGO } from './CasillasCodigo.tsx'
import { FondoJuego } from './FondoJuego.tsx'

export interface FichaIngreso {
  nombre?: string
  avatarId?: string
}

export function FlujoIngreso({
  codigoInicial = '',
  enviando,
  error,
  onEntrar,
}: {
  codigoInicial?: string
  enviando: boolean
  error: string | null
  onEntrar: (codigo: string, ficha: FichaIngreso) => void
}) {
  const { perfil } = useAutenticacion()
  const [paso, setPaso] = useState<'codigo' | 'avatar' | 'nombre'>(codigoInicial ? 'avatar' : 'codigo')
  const [codigo, setCodigo] = useState(codigoInicial.toUpperCase())
  const [avatarId, setAvatarId] = useState<IdAvatar>(AVATARES[0].id)
  const [categoria, setCategoria] = useState<CategoriaAvatar>('todos')
  const [nombreEscrito, setNombreEscrito] = useState<string | null>(null)
  const nombre = nombreEscrito ?? perfil?.nombre ?? ''
  const [local, setLocal] = useState<string | null>(null)
  const aviso = local ?? error
  const personaje = AVATARES.find((item) => item.id === avatarId) ?? AVATARES[0]
  const visibles = categoria === 'todos' ? AVATARES : AVATARES.filter((item) => item.categoria === categoria)

  function continuarCodigo(evento: FormEvent) {
    evento.preventDefault()
    if (codigo.trim().length < LONGITUD_CODIGO) {
      setLocal('El código de la sala tiene 6 caracteres.')
      return
    }
    setLocal(null)
    setPaso('avatar')
  }

  function continuarAvatar() {
    if (!avatarValido(avatarId)) {
      setLocal('Elige un personaje de la lista.')
      return
    }
    setLocal(null)
    setPaso('nombre')
  }

  function confirmar(evento: FormEvent) {
    evento.preventDefault()
    const limpio = nombre.trim()
    if (limpio.length < 2 || limpio.length > 24) {
      setLocal('El nombre debe tener entre 2 y 24 caracteres.')
      return
    }
    setLocal(null)
    onEntrar(codigo.trim().toUpperCase(), { nombre: limpio, avatarId })
  }

  function moverAvatar(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const columnas = columnasVisibles(evento.currentTarget.parentElement)
    const delta =
      evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : evento.key === 'ArrowDown' ? columnas : evento.key === 'ArrowUp' ? -columnas : 0
    if (!delta) return
    evento.preventDefault()
    const destino = indice + delta
    if (destino < 0 || destino >= visibles.length) return
    const siguiente = visibles[destino]
    setAvatarId(siguiente.id)
    evento.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-avatar="${siguiente.id}"]`)?.focus()
  }

  function volver() {
    setLocal(null)
    if (paso === 'nombre') setPaso('avatar')
    else setPaso('codigo')
  }

  return (
    <main className="ingreso-partida">
      <FondoJuego />
      <section className={paso === 'avatar' ? 'ingreso-tarjeta elige-avatar' : 'ingreso-tarjeta'}>
        <div className="ingreso-regreso">
          {paso === 'codigo' ? (
            <Link className="boton-fantasma" to="/">
              ← Volver
            </Link>
          ) : (
            <button className="boton-fantasma" type="button" onClick={volver}>
              ← Volver
            </button>
          )}
        </div>
        <div className="ingreso-marca">
          <Buho tamano={36} />
          <strong>ProfeLink</strong>
        </div>
        <ol className="ingreso-pasos" aria-label="Progreso">
          <li className={paso === 'codigo' ? 'actual' : 'hecho'}>1 Código</li>
          <li className={paso === 'avatar' ? 'actual' : paso === 'nombre' ? 'hecho' : ''}>2 Avatar</li>
          <li className={paso === 'nombre' ? 'actual' : ''}>3 Nombre</li>
        </ol>
        {paso === 'codigo' ? (
          <form onSubmit={continuarCodigo}>
            <h1>¡Únete a una partida!</h1>
            <p>Ingresa el código de la sala que te compartió tu docente.</p>
            <CasillasCodigo valor={codigo} onChange={setCodigo} disabled={enviando} />
            {aviso ? <p className="error-texto" role="alert">{aviso}</p> : null}
            <button className="boton boton-jugar" type="submit">
              Entrar a la sala →
            </button>
          </form>
        ) : null}
        {paso === 'avatar' ? (
          <div>
            <h1>Elige tu avatar</h1>
            <p>Personaliza tu personaje para la partida.</p>
            <div className="avatar-filtros" role="tablist" aria-label="Categorías de avatares">
              {CATEGORIAS_AVATAR.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={categoria === item.id}
                  className={categoria === item.id ? 'avatar-filtro elegido' : 'avatar-filtro'}
                  onClick={() => setCategoria(item.id)}
                >
                  {item.nombre}
                </button>
              ))}
            </div>
            <p className="avatar-elegido-nota">Elegido: {personaje.nombre}</p>
            <div className="rejilla-avatares" role="group" aria-label="Avatares">
              {visibles.map((item, indice) => {
                const elegido = item.id === avatarId
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={elegido ? 'avatar-opcion elegido' : 'avatar-opcion'}
                    aria-pressed={elegido}
                    data-avatar={item.id}
                    style={{ '--anillo': item.anillo } as CSSProperties}
                    onClick={() => setAvatarId(item.id)}
                    onKeyDown={(evento) => moverAvatar(evento, indice)}
                  >
                    <Avatar id={item.id} tamano={112} />
                    <span className="avatar-nombre">{item.nombre}</span>
                    {elegido ? (
                      <span className="avatar-check" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
            {aviso ? <p className="error-texto" role="alert">{aviso}</p> : null}
            <button className="boton boton-jugar" type="button" onClick={continuarAvatar}>
              Continuar →
            </button>
          </div>
        ) : null}
        {paso === 'nombre' ? (
          <form onSubmit={confirmar}>
            <div className="avatar-hero" style={{ '--anillo': personaje.anillo } as CSSProperties}>
              <Avatar id={avatarId} tamano={120} />
            </div>
            <h1>¿Cómo te llamas?</h1>
            <p>Este será tu nombre en la partida. {personaje.nombre} te representa.</p>
            <label className="campo-grupo">
              <span>Nombre</span>
              <input className="campo" value={nombre} maxLength={24} onChange={(evento) => setNombreEscrito(evento.target.value)} />
            </label>
            {aviso ? <p className="error-texto" role="alert">{aviso}</p> : null}
            <button className="boton boton-jugar" type="submit" disabled={enviando}>
              {enviando ? 'Entrando…' : '¡Listo!'}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  )
}

function columnasVisibles(rejilla: HTMLElement | null) {
  if (!rejilla) return 4
  const columnas = getComputedStyle(rejilla).gridTemplateColumns.split(' ').filter(Boolean).length
  return columnas > 0 ? columnas : 4
}
