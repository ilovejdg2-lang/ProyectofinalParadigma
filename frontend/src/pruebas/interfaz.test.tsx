import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { ProveedorAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { ProveedorServicios } from '../contexto/ProveedorServicios.tsx'
import { CONTRASENA_DEMO, CORREO_DEMO } from '../datos/demostracion.ts'
import { filtrarCuestionarios } from '../dominio/filtros.ts'
import { cuestionariosDemostracion } from '../datos/demostracion.ts'
import { validarImagen } from '../dominio/validacion.ts'
import { rutasAplicacion } from '../rutas/Rutas.tsx'
import { almacenMemoria } from '../servicios/almacen.ts'
import { crearServicios, type Servicios } from '../servicios/crearServicios.ts'
import { describe, expect, it } from 'vitest'

function entornoSimulado() {
  return { authUrl: '', actividadesUrl: '', canalUrl: '', simulacion: true }
}

function renderEn(ruta: string, servicios: Servicios) {
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

async function entrarDemo(servicios: Servicios) {
  const sesion = await servicios.autenticacion.iniciarSesion(CORREO_DEMO, CONTRASENA_DEMO)
  sessionStorage.setItem('profelink.token', sesion.token)
  return sesion
}

describe('acceso', () => {
  it('exige datos válidos antes de iniciar sesión', async () => {
    const usuario = userEvent.setup()
    renderEn('/iniciar-sesion', crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() }))
    await usuario.click(await screen.findByRole('button', { name: 'Iniciar Sesión' }))
    expect(await screen.findByText('Escribe un correo válido.')).toBeInTheDocument()
  })

  it('redirige al inicio de sesión cuando no hay perfil', async () => {
    renderEn('/descubrir', crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() }))
    expect(await screen.findByRole('heading', { name: 'Bienvenido de vuelta' })).toBeInTheDocument()
  })

  it('entra con la cuenta de prueba y muestra el inicio', async () => {
    const usuario = userEvent.setup()
    renderEn('/iniciar-sesion', crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() }))
    await usuario.type(await screen.findByLabelText('Correo electrónico'), CORREO_DEMO)
    await usuario.type(screen.getByLabelText('Contraseña'), CONTRASENA_DEMO)
    await usuario.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))
    expect(await screen.findByRole('heading', { name: 'Evaluaciones en vivo' })).toBeInTheDocument()
  })
})

describe('cuestionarios', () => {
  it('filtra el catálogo por el texto buscado', () => {
    const resultado = filtrarCuestionarios(cuestionariosDemostracion(), {
      texto: 'Prolog',
      categoria: '',
      dificultad: '',
      autor: '',
    })
    expect(resultado.map((item) => item.id)).toEqual(['demo-logico'])
  })

  it('no guarda un cuestionario sin título ni respuesta correcta', async () => {
    const usuario = userEvent.setup()
    const servicios = crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() })
    await entrarDemo(servicios)
    renderEn('/cuestionarios/nuevo', servicios)
    await usuario.click(await screen.findByRole('button', { name: 'Guardar cuestionario' }))
    expect(await screen.findByText('El título necesita al menos 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Indica la respuesta correcta de la pregunta 1.')).toBeInTheDocument()
  })

  it('rechaza un archivo que no es una imagen permitida', () => {
    const archivo = new File(['hola'], 'nota.txt', { type: 'text/plain' })
    expect(validarImagen(archivo)).toMatch(/JPG/)
  })
})

describe('partida y resultados', () => {
  it('acepta una sola respuesta y muestra la clasificación del servicio', async () => {
    const usuario = userEvent.setup()
    const servicios = crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() })
    const anfitrion = await entrarDemo(servicios)
    const estudiante = await servicios.autenticacion.registrar({
      nombre: 'Ana Estudiante',
      correo: 'ana@prueba.test',
      contrasena: 'Demo-2026',
    })
    const sala = await servicios.sala.crear(anfitrion.token, 'demo-funcional')
    await servicios.sala.unirse(estudiante.token, sala.codigo)
    await servicios.sala.iniciar(anfitrion.token, sala.codigo)
    sessionStorage.setItem('profelink.token', estudiante.token)
    renderEn(`/partida/${sala.codigo}`, servicios)

    const verdadero = await screen.findByRole('button', { name: 'Verdadero' })
    await usuario.click(verdadero)
    expect(await screen.findByText('Respuesta enviada. No puedes cambiarla.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verdadero' })).toBeDisabled()
    await expect(servicios.sala.responder(estudiante.token, sala.codigo, false)).rejects.toThrow(/Ya enviaste/)

    await servicios.sala.cerrarPregunta(anfitrion.token, sala.codigo)
    for (let indice = 0; indice < 3; indice += 1) {
      await servicios.sala.avanzar(anfitrion.token, sala.codigo)
      await servicios.sala.cerrarPregunta(anfitrion.token, sala.codigo)
    }
    await servicios.sala.avanzar(anfitrion.token, sala.codigo)
    const final = await servicios.sala.obtener(anfitrion.token, sala.codigo)
    expect(final.estado).toBe('finalizada')
    cleanup()
    sessionStorage.setItem('profelink.token', anfitrion.token)
    renderEn(`/resultados/${sala.codigo}`, servicios)
    expect(await screen.findByText('Ana Estudiante')).toBeInTheDocument()
    expect(screen.getByText(/1 pts/)).toBeInTheDocument()
  })
})
