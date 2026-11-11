import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

export const AUTH = process.env.AUTH_URL ?? 'http://localhost:5001'
export const API = process.env.ACTIVIDADES_URL ?? 'http://localhost:5002'
export const CLAVE = 'AuditoriaClase2026'

export async function evidencia(pagina: Page, nombre: string) {
  await mkdir('evidencias', { recursive: true })
  await pagina.screenshot({ path: `evidencias/${nombre}.png`, fullPage: true })
}

export async function registrar(
  request: APIRequestContext,
  datos: { nombre: string; correo: string; contrasena?: string },
) {
  const contrasena = datos.contrasena ?? CLAVE
  const respuesta = await request.post(`${AUTH}/perfiles`, {
    data: { nombre: datos.nombre, correo: datos.correo, contrasena },
  })
  expect(respuesta.ok(), await respuesta.text()).toBeTruthy()
  return (await respuesta.json()) as {
    token: string
    perfil: { id: string; nombre: string; correo: string; rol: string }
  }
}

export async function entrar(pagina: Page, correo: string, contrasena = CLAVE) {
  await pagina.goto('/iniciar-sesion')
  await pagina.locator('input[type="email"]').fill(correo)
  await pagina.locator('input[type="password"]').fill(contrasena)
  await pagina.getByRole('button', { name: 'Iniciar Sesión' }).click()
  await expect(pagina).not.toHaveURL(/iniciar-sesion/)
  if (new URL(pagina.url()).pathname === '/elegir') {
    await pagina.getByRole('button', { name: /Cuestionarios/ }).click()
    await expect(pagina).not.toHaveURL(/\/elegir$/)
  }
  await expect(pagina.getByText('todavía se simulan en este navegador')).toHaveCount(0)
}

export async function crearCuestionario(
  request: APIRequestContext,
  token: string,
  titulo: string,
  preguntas: Array<{ enunciado: string; correcto: 'Verdadero' | 'Falso'; segundos: number }>,
) {
  const respuesta = await request.post(`${API}/cuestionarios`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      titulo,
      descripcion: 'Cuestionario de auditoría multijugador con tiempos distintos.',
      categoria: 'General',
      etiquetas: ['auditoria'],
      dificultad: 'medio',
      preguntas: preguntas.map((pregunta, indice) => ({
        enunciado: pregunta.enunciado,
        respuestaCorrecta: pregunta.correcto === 'Verdadero',
        orden: indice + 1,
        segundos: pregunta.segundos,
        opciones: [
          { texto: 'Verdadero', correcta: pregunta.correcto === 'Verdadero' },
          { texto: 'Falso', correcta: pregunta.correcto === 'Falso' },
        ],
      })),
    },
  })
  expect(respuesta.ok(), await respuesta.text()).toBeTruthy()
  return (await respuesta.json()) as {
    id: string
    preguntas: Array<{ id: string; opciones: Array<{ id: string; texto: string; correcta: boolean }> }>
  }
}

export async function abrirSala(pagina: Page, cuestionarioId: string) {
  await pagina.goto(`/cuestionarios/${cuestionarioId}`)
  await pagina.getByRole('button', { name: 'Juego anfitrión' }).click()
  await expect(pagina.getByTestId('codigo-sala')).toBeVisible()
  await expect(pagina.getByText('Canal en vivo')).toBeVisible()
  return ((await pagina.getByTestId('codigo-sala').textContent()) ?? '').trim()
}

export async function unirse(pagina: Page, codigo: string) {
  await pagina.goto('/unirse')
  await pagina.getByLabel('Código de la sala').fill(codigo)
  await pagina.getByRole('button', { name: 'Entrar' }).click()
}

export async function sinScrollHorizontal(pagina: Page) {
  const desborda = await pagina.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(desborda).toBeFalsy()
}
