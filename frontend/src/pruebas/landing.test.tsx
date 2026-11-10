import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ProveedorAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { ProveedorServicios } from '../contexto/ProveedorServicios.tsx'
import { evaluarContrasena, telefonoValido, validarRegistroLanding, buscarPais } from '../paginas/publico/registro.ts'
import { rutasAplicacion } from '../rutas/Rutas.tsx'
import { almacenMemoria } from '../servicios/almacen.ts'
import { crearServicios } from '../servicios/crearServicios.ts'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.removeItem('profelink.tema')
  delete document.documentElement.dataset.tema
})

function renderPublico(ruta = '/') {
  const servicios = crearServicios({
    almacen: almacenMemoria(),
    entorno: { authUrl: '', actividadesUrl: '', canalUrl: '', simulacion: true },
  })
  const router = createMemoryRouter(rutasAplicacion(), { initialEntries: [ruta] })
  render(
    <ProveedorServicios servicios={servicios}>
      <ProveedorAutenticacion>
        <RouterProvider router={router} />
      </ProveedorAutenticacion>
    </ProveedorServicios>,
  )
  return servicios
}

describe('landing pública', () => {
  it('muestra la portada y no deja pasar a una ruta privada', async () => {
    renderPublico('/')
    expect(await screen.findByRole('heading', { name: /administrar tu academia/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Iniciar Sesión' })).toHaveAttribute('href', '/iniciar-sesion')
    cleanup()
    renderPublico('/descubrir')
    expect(await screen.findByRole('heading', { name: 'Bienvenido de vuelta' })).toBeInTheDocument()
  })

  it('cambia el tema y lo recuerda', async () => {
    const usuario = userEvent.setup()
    renderPublico('/')
    await usuario.click(await screen.findByRole('button', { name: 'Activar modo claro' }))
    expect(document.documentElement.dataset.tema).toBe('claro')
    expect(localStorage.getItem('profelink.tema')).toBe('claro')
  })

  it('rechaza una contraseña incompleta y un teléfono que no corresponde al país', () => {
    const clave = evaluarContrasena('Abcdefg1')
    expect(clave.valida).toBe(false)
    expect(clave.etiqueta).toBe('Media')
    expect(evaluarContrasena('Abcdefg1!').valida).toBe(true)
    const costaRica = buscarPais('CR')
    const mexico = buscarPais('MX')
    expect(telefonoValido(costaRica, '8888-8888')).toBe(true)
    expect(telefonoValido(costaRica, '888')).toBe(false)
    expect(telefonoValido(mexico, '5512345678')).toBe(true)
    const errores = validarRegistroLanding({
      correo: 'no-es-correo',
      nombre: 'Ana',
      contrasena: 'Abcdefg1',
      confirmar: 'OtraClave1!',
      pais: '',
      telefono: '123',
    })
    expect(errores.correo).toBeTruthy()
    expect(errores.contrasena).toBeTruthy()
    expect(errores.confirmar).toBeTruthy()
    expect(errores.pais).toBeTruthy()
  })

  it('registra con el servicio real de la sesión y entra al inicio', async () => {
    const servicios = renderPublico('/')
    fireEvent.input(await screen.findByLabelText(/^Email/), { target: { value: 'academia.fundadora@example.com' } })
    fireEvent.input(screen.getByLabelText(/^Nombre Completo/), { target: { value: 'Academia Fundadora' } })
    fireEvent.input(screen.getByLabelText(/^Contraseña/), { target: { value: 'Academia2026!' } })
    fireEvent.input(screen.getByLabelText(/^Confirmar Contraseña/), { target: { value: 'Academia2026!' } })
    fireEvent.change(screen.getByLabelText(/^País/), { target: { value: 'MX' } })
    fireEvent.input(screen.getByLabelText(/^Teléfono/), { target: { value: '5512345678' } })
    expect(screen.getByText('Fuerte')).toBeInTheDocument()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Unirme a ProfeLink →' }))
    expect(await screen.findByRole('heading', { name: '¿Qué quieres ver?' }, { timeout: 4000 })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: /Cuestionarios/ }))
    expect(await screen.findByRole('heading', { name: 'Evaluaciones en vivo' })).toBeInTheDocument()
    const sesion = await servicios.autenticacion.iniciarSesion('academia.fundadora@example.com', 'Academia2026!')
    expect(sesion.perfil.nombre).toBe('Academia Fundadora')
  }, 12000)
})
