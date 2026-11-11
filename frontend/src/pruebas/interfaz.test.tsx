import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { ProveedorAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { ProveedorServicios } from '../contexto/ProveedorServicios.tsx'
import {
  CONTRASENA_DEMO,
  CORREO_DEMO,
  cuestionariosDemostracion,
} from '../datos/demostracion.ts'
import { opcionesDe } from '../dominio/opciones.ts'
import { filtrarCuestionarios } from '../dominio/filtros.ts'
import { validarEntradaPartida, validarImagen } from '../dominio/validacion.ts'
import type { Cuestionario } from '../dominio/tipos.ts'
import { rutasAplicacion } from '../rutas/Rutas.tsx'
import { almacenMemoria } from '../servicios/almacen.ts'
import { crearServicios, type Servicios } from '../servicios/crearServicios.ts'
import { describe, expect, it, vi } from 'vitest'

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
  sessionStorage.setItem('profelink.espacio', 'cuestionarios')
  return sesion
}

function cuestionarioLocal(id: string): Cuestionario {
  return {
    id,
    titulo: id === 'sql-local' ? 'Consulta SQL' : 'Cuestionario de prueba',
    descripcion: 'Pregunta creada en la prueba',
    categoria: 'General',
    etiquetas: id === 'sql-local' ? ['sql'] : [],
    dificultad: 'facil',
    modo: 'en-vivo',
    autorId: 'perfil-demo',
    autorNombre: 'Docente de prueba',
    esDemostracion: false,
    actualizadoEn: '2026-10-18T12:00:00.000Z',
    preguntas: [1, 2, 3, 4].map((orden) => ({
      id: `${id}-p${orden}`,
      orden,
      enunciado: `Pregunta ${orden}`,
      respuestaCorrecta: true,
      opciones: [
        { id: `${id}-p${orden}:si`, texto: `Respuesta ${orden}`, correcta: true },
        { id: `${id}-p${orden}:no`, texto: `Otra ${orden}`, correcta: false },
      ],
    })),
  }
}

async function guardarCuestionarioDePrueba(servicios: Servicios, token: string) {
  const base = cuestionarioLocal('prueba')
  return servicios.actividades.guardar(token, {
    titulo: base.titulo,
    descripcion: base.descripcion,
    categoria: base.categoria,
    etiquetas: base.etiquetas,
    dificultad: base.dificultad,
    modo: base.modo,
    preguntas: base.preguntas,
  })
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
    await usuario.click(screen.getByRole('button', { name: 'Profesor' }))
    await usuario.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))
    expect(await screen.findByRole('heading', { name: '¿Qué quieres ver?' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: /Cuestionarios/ }))
    expect(await screen.findByRole('heading', { name: 'Evaluaciones en vivo' })).toBeInTheDocument()
  })

  it('recupera la contraseña con el servicio de autenticación', async () => {
    const usuario = userEvent.setup()
    const servicios = crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() })
    renderEn('/iniciar-sesion', servicios)
    await usuario.click(await screen.findByRole('button', { name: '¿Olvidaste tu contraseña?' }))
    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveTextContent('Recuperar contraseña')
    const correoRecuperacion = dialogo.querySelector('input[type="email"]') as HTMLInputElement
    await usuario.clear(correoRecuperacion)
    await usuario.type(correoRecuperacion, CORREO_DEMO)
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByLabelText('Código de recuperación')).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClave2026!')
    await usuario.type(screen.getByLabelText('Confirmar contraseña'), 'NuevaClave2026!')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const sesion = await servicios.autenticacion.iniciarSesion(CORREO_DEMO, 'NuevaClave2026!')
    expect(sesion.perfil.correo).toBe(CORREO_DEMO)
  })
})

describe('cuestionarios', () => {
  it('filtra el catálogo por el texto buscado', () => {
    const resultado = filtrarCuestionarios([cuestionarioLocal('sql-local'), cuestionarioLocal('otro')], {
      texto: 'SQL',
      categoria: '',
      dificultad: '',
      autor: '',
    })
    expect(resultado.map((item) => item.id)).toEqual(['sql-local'])
  })

  it('no trae cuestionarios fijos en el código de demostración', () => {
    expect(cuestionariosDemostracion()).toEqual([])
  })

  it('no guarda un cuestionario sin título ni respuesta correcta', async () => {
    const usuario = userEvent.setup()
    const servicios = crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() })
    await entrarDemo(servicios)
    renderEn('/cuestionarios/nuevo', servicios)
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }))
    await usuario.click(screen.getByRole('button', { name: 'Varias opciones' }))
    await usuario.click(await screen.findByRole('button', { name: 'Guardar cuestionario' }))
    expect(await screen.findByText('El título necesita al menos 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Indica la respuesta correcta de la pregunta 1.')).toBeInTheDocument()
  })

  it('guarda una partida de práctica con la respuesta elegida', async () => {
    const usuario = userEvent.setup()
    const servicios = crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() })
    const sesion = await entrarDemo(servicios)
    const cuestionario = await guardarCuestionarioDePrueba(servicios, sesion.token)
    const pregunta = cuestionario.preguntas[0]
    const opcion = opcionesDe(pregunta)[0]
    const guardar = vi.spyOn(servicios.sala, 'guardarPartida')
    renderEn(`/cuestionarios/${cuestionario.id}`, servicios)
    await usuario.click(await screen.findByRole('button', { name: 'Practicar cuestionario' }))
    await usuario.click(screen.getAllByRole('button', { name: opcion.texto })[0])
    await usuario.click(screen.getByRole('button', { name: 'Guardar partida' }))
    expect(guardar).toHaveBeenCalledWith(sesion.token, expect.objectContaining({
      cuestionarioId: cuestionario.id,
      respuestas: [{ preguntaId: pregunta.id, opcionId: opcion.id }],
    }))
  })

  it('rechaza un archivo que no es una imagen permitida', () => {
    const archivo = new File(['hola'], 'nota.txt', { type: 'text/plain' })
    expect(validarImagen(archivo)).toMatch(/JPG/)
  })

  it('acepta una extensión de imagen permitida cuando el navegador informa un MIME genérico', () => {
    const png = new File(['contenido'], 'imagen.png', { type: 'application/octet-stream' })
    const archivoDesconocido = new File(['contenido'], 'nota.txt', { type: 'application/octet-stream' })

    expect(validarImagen(png)).toBeNull()
    expect(validarImagen(archivoDesconocido)).toMatch(/JPG/)
  })
})

describe('partida y resultados', () => {
  it('acepta una sola respuesta y muestra la clasificación del servicio', async () => {
    const usuario = userEvent.setup()
    const servicios = crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() })
    const anfitrion = await entrarDemo(servicios)
    const cuestionario = await guardarCuestionarioDePrueba(servicios, anfitrion.token)
    const estudiante = await servicios.autenticacion.registrar({
      nombre: 'Ana Estudiante',
      correo: 'ana@prueba.test',
      contrasena: 'Demo-2026',
    })
    const sala = await servicios.sala.crear(anfitrion.token, cuestionario.id)
    await servicios.sala.unirse(estudiante.token, sala.codigo)
    await servicios.sala.iniciar(anfitrion.token, sala.codigo)
    sessionStorage.setItem('profelink.token', estudiante.token)
    renderEn(`/partida/${sala.codigo}`, servicios)

    const correcta = await screen.findByRole('button', { name: 'Respuesta 1' }, { timeout: 6000 })
    await usuario.click(correcta)
    expect(await screen.findByText(/¡Correcto!|Respuesta enviada/)).toBeInTheDocument()
    await expect(servicios.sala.responder(estudiante.token, sala.codigo, false)).rejects.toThrow(/Ya enviaste|cerrada/)

    for (let indice = 0; indice < 12; indice += 1) {
      const actual = await servicios.sala.obtener(anfitrion.token, sala.codigo)
      if (actual.estado === 'finalizada') break
      if (actual.estado === 'pregunta') await servicios.sala.cerrarPregunta(anfitrion.token, sala.codigo)
      else await servicios.sala.avanzar(anfitrion.token, sala.codigo)
    }
    const final = await servicios.sala.obtener(anfitrion.token, sala.codigo)
    expect(final.estado).toBe('finalizada')
    cleanup()
    sessionStorage.setItem('profelink.token', anfitrion.token)
    renderEn(`/resultados/${sala.codigo}`, servicios)
    expect(await screen.findAllByText('Ana Estudiante')).not.toHaveLength(0)
    expect(screen.getAllByText(/pts/).length).toBeGreaterThan(0)
  }, 20_000)

  it('valida resultados guardados, evita duplicados y asocia el progreso al usuario autenticado', async () => {
    const servicios = crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() })
    const estudiante = await servicios.autenticacion.registrar({
      nombre: 'Sofía Kanban',
      correo: 'sofia@kanban.test',
      contrasena: 'Demo-2026',
    })
    const otro = await servicios.autenticacion.registrar({
      nombre: 'Pedro Otro',
      correo: 'pedro@kanban.test',
      contrasena: 'Demo-2026',
    })

    const docente = await servicios.autenticacion.iniciarSesion(CORREO_DEMO, CONTRASENA_DEMO)
    const cuestionario = await guardarCuestionarioDePrueba(servicios, docente.token)
    const [primera, segunda, tercera, cuarta] = cuestionario.preguntas
    expect(() =>
      validarEntradaPartida(cuestionario, {
        cuestionarioId: cuestionario.id,
        respuestas: [
          { preguntaId: primera.id, opcionId: primera.opciones![0].id },
          { preguntaId: primera.id, opcionId: primera.opciones![1].id },
        ],
      }),
    ).toThrow(/No se permiten respuestas duplicadas/)

    const guardado = await servicios.sala.guardarPartida(estudiante.token, {
      codigo: 'PARA99',
      cuestionarioId: cuestionario.id,
      modo: 'practica',
      respuestas: [primera, segunda, tercera, cuarta].map((pregunta) => ({
        preguntaId: pregunta.id,
        opcionId: pregunta.opciones![0].id,
      })),
    })
    expect(guardado.participantes[0]?.puntaje).toBe(4)

    await expect(
      servicios.sala.guardarPartida(otro.token, {
        codigo: 'PARA99',
        cuestionarioId: cuestionario.id,
        respuestas: [{ preguntaId: primera.id, opcionId: primera.opciones![0].id }],
      }),
    ).rejects.toThrow(/Ya existe una partida registrada/)

    const progreso = await servicios.sala.progreso(estudiante.token)
    expect(progreso.usuarioId).toBe(estudiante.perfil.id)
    expect(progreso.partidasJugadas).toBe(1)
    expect(progreso.totalAciertos).toBe(4)
  })

  it('muestra un QR que abre la partida con el código', async () => {
    const servicios = crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() })
    const anfitrion = await entrarDemo(servicios)
    const cuestionario = await guardarCuestionarioDePrueba(servicios, anfitrion.token)
    const sala = await servicios.sala.crear(anfitrion.token, cuestionario.id)
    renderEn(`/sala/${sala.codigo}`, servicios)

    const qr = await screen.findByTestId('codigo-qr')
    expect(qr).toHaveAttribute('data-enlace', `https://profelink.sinkro.dev/iniciar-sesion?partida=${sala.codigo}`)
    expect(await screen.findByRole('img', { name: `Código QR para entrar a la partida ${sala.codigo}` })).toBeInTheDocument()
    expect(screen.getByText('Tus estudiantes pueden unirse escaneando el QR o ingresando el código en ProfeLink.')).toBeInTheDocument()
  })

  it('entra a la partida del enlace después de iniciar sesión, sin escribir el código', async () => {
    const usuario = userEvent.setup()
    const servicios = crearServicios({ almacen: almacenMemoria(), entorno: entornoSimulado() })
    const anfitrion = await servicios.autenticacion.iniciarSesion(CORREO_DEMO, CONTRASENA_DEMO)
    const cuestionario = await guardarCuestionarioDePrueba(servicios, anfitrion.token)
    const sala = await servicios.sala.crear(anfitrion.token, cuestionario.id)
    const estudiante = await servicios.autenticacion.registrar({
      nombre: 'Ana Invitada',
      correo: 'ana.invitada@prueba.test',
      contrasena: 'Demo-2026',
    })
    renderEn(`/partida/${sala.codigo}`, servicios)

    expect(await screen.findByRole('heading', { name: 'Bienvenido de vuelta' })).toBeInTheDocument()
    expect(screen.getByText(`Inicia sesión para entrar a la partida ${sala.codigo}. No necesitas escribir el código.`)).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Correo electrónico'), estudiante.perfil.correo)
    await usuario.type(screen.getByLabelText('Contraseña'), 'Demo-2026')
    await usuario.click(screen.getByRole('button', { name: 'Estudiante' }))
    await usuario.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    expect(await screen.findByRole('heading', { name: 'Elige tu avatar' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { pressed: false }).length).toBeGreaterThan(10)
    await usuario.click(screen.getByRole('button', { name: 'Chica maga' }))
    expect(screen.getByRole('button', { name: 'Chica maga' })).toHaveAttribute('aria-pressed', 'true')
    await usuario.click(screen.getByRole('button', { name: 'Continuar →' }))
    await usuario.click(screen.getByRole('button', { name: '¡Listo!' }))
    expect(await screen.findByRole('heading', { name: 'Esperando al docente' })).toBeInTheDocument()
    expect(await screen.findByText(/Ana Invitada/)).toBeInTheDocument()
    const actual = await servicios.sala.obtener(anfitrion.token, sala.codigo)
    expect(actual.participantes.map((item) => item.nombre)).toContain('Ana Invitada')
    expect(actual.participantes.find((item) => item.nombre === 'Ana Invitada')?.avatarId).toBe('maga-rosa')
  })
})
