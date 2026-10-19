import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { rutasAplicacion } from './rutas/Rutas.tsx'

const enrutador = createBrowserRouter(rutasAplicacion())

export default function App() {
  return <RouterProvider router={enrutador} />
}
