import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'

export function Inicio() {
  const { perfil } = useAutenticacion()
  return (
    <section className="banner">
      <h1>Evaluaciones en vivo</h1>
      <p>Hola, {perfil?.nombre}. Desde aquí vas a descubrir cuestionarios y abrir una sala en vivo.</p>
    </section>
  )
}
