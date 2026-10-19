import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'

export function Perfil() {
  const { perfil, salir } = useAutenticacion()
  return (
    <section className="panel">
      <h1>Perfil</h1>
      <p>Este nombre se muestra en la sala y en la clasificación.</p>
      <p>
        <strong>{perfil?.nombre}</strong>
      </p>
      <p className="meta">{perfil?.correo}</p>
      <p className="meta">La cuenta se valida en el servicio de autenticación. Esta pantalla solo muestra la sesión actual.</p>
      <button className="boton-peligro" type="button" onClick={() => void salir()}>
        Cerrar sesión
      </button>
    </section>
  )
}
