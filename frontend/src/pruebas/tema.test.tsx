import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProveedorAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { ProveedorServicios } from '../contexto/ProveedorServicios.tsx'
import { CONTRASENA_DEMO, CORREO_DEMO } from '../datos/demostracion.ts'
import { rutasAplicacion } from '../rutas/Rutas.tsx'
import { almacenMemoria } from '../servicios/almacen.ts'
import { crearServicios } from '../servicios/crearServicios.ts'
import { guardarTema, leerTema } from '../tema.ts'

function entornoSimulado() {
  return { authUrl: '', actividadesUrl: '', canalUrl: '', simulacion: true }
}

function renderEn(ruta: string) {
  const servicios = crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() })
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

describe('tema claro/oscuro', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    document.documentElement.dataset.tema = 'oscuro'
  })

  afterEach(() => {
    cleanup()
  })

  it('persiste la preferencia con guardarTema/leerTema', () => {
    guardarTema('claro')
    expect(localStorage.getItem('profelink.tema')).toBe('claro')
    expect(document.documentElement.dataset.tema).toBe('claro')
    expect(leerTema()).toBe('claro')
    guardarTema('oscuro')
    expect(leerTema()).toBe('oscuro')
  })

  it('permite cambiar el tema en la pantalla de acceso', async () => {
    const usuario = userEvent.setup()
    renderEn('/iniciar-sesion')
    const boton = await screen.findByRole('button', { name: /Activar modo claro|Activar modo oscuro/i })
    const etiquetaInicial = boton.getAttribute('aria-label')
    await usuario.click(boton)
    expect(boton.getAttribute('aria-label')).not.toBe(etiquetaInicial)
    expect(['claro', 'oscuro']).toContain(document.documentElement.dataset.tema)
    expect(['claro', 'oscuro']).toContain(localStorage.getItem('profelink.tema'))
  })

  it('mantiene el tema al entrar a la aplicación y expone el rol docente', async () => {
    const usuario = userEvent.setup()
    guardarTema('claro')
    const servicios = renderEn('/iniciar-sesion')
    await usuario.type(await screen.findByLabelText('Correo electrónico'), CORREO_DEMO)
    await usuario.type(screen.getByLabelText('Contraseña'), CONTRASENA_DEMO)
    await usuario.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))
    expect(await screen.findByRole('heading', { name: '¿Qué quieres ver?' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: /Cuestionarios/ }))
    expect(await screen.findByRole('heading', { name: 'Evaluaciones en vivo' })).toBeInTheDocument()
    expect(document.documentElement.dataset.tema).toBe('claro')
    expect(localStorage.getItem('profelink.tema')).toBe('claro')
    const sesion = await servicios.autenticacion.iniciarSesion(CORREO_DEMO, CONTRASENA_DEMO)
    expect(sesion.perfil.rol).toBe('teacher')
    expect(screen.getByText('Docente')).toBeInTheDocument()
  })

  it('abre y cierra el menú móvil sin perder el contenido principal', async () => {
    const usuario = userEvent.setup()
    const servicios = crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() })
    const sesion = await servicios.autenticacion.iniciarSesion(CORREO_DEMO, CONTRASENA_DEMO)
    sessionStorage.setItem('profelink.token', sesion.token)
    sessionStorage.setItem('profelink.espacio', 'cuestionarios')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 })
    const router = createMemoryRouter(rutasAplicacion(), { initialEntries: ['/descubrir'] })
    render(
      <ProveedorServicios servicios={servicios}>
        <ProveedorAutenticacion>
          <RouterProvider router={router} />
        </ProveedorAutenticacion>
      </ProveedorServicios>,
    )
    expect(await screen.findByRole('heading', { name: 'Descubrir' })).toBeInTheDocument()
    const abrir = await screen.findByRole('button', { name: 'Abrir menú' })
    await usuario.click(abrir)
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: /Historial/ })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Cerrar menú' }))
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Descubrir' })).toBeInTheDocument()
  })
})
