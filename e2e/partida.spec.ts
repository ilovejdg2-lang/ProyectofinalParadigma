import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { abrirSala, API, CLAVE, crearCuestionario, entrar, evidencia, registrar, sinScrollHorizontal, unirse } from './ayuda.ts'

test.describe.configure({ mode: 'serial' })

const marca = Date.now().toString(36)

async function alumno(
  browser: Browser,
  datos: { nombre: string; correo: string },
): Promise<{ context: BrowserContext; page: Page; token: string }> {
  const context = await browser.newContext()
  const page = await context.newPage()
  const sesion = await page.request.post('http://localhost:5001/perfiles', {
    data: { nombre: datos.nombre, correo: datos.correo, contrasena: CLAVE },
  })
  expect(sesion.ok(), await sesion.text()).toBeTruthy()
  const cuerpo = (await sesion.json()) as { token: string }
  await entrar(page, datos.correo)
  return { context, page, token: cuerpo.token }
}

test('partida normal: cuestionario, seis estudiantes, puntos y podio', async ({ page, browser, request }) => {
  test.setTimeout(720_000)
  const titulo = `Auditoría viva ${marca}`
  const docente = await registrar(request, {
    nombre: 'Docente Auditoría',
    correo: `auditoria.docente.${marca}@una.cr`,
  })
  expect(docente.perfil.rol).toBe('teacher')
  await entrar(page, docente.perfil.correo)

  await page.goto('/cuestionarios/nuevo')
  await page.getByRole('button', { name: 'Editar información' }).click()
  await page.getByLabel('Título').fill(titulo)
  await page.getByLabel('Descripción').fill('Cuestionario de diez preguntas para una clase real de auditoría.')
  await page.getByRole('button', { name: 'Listo' }).click()

  const segundos = [90, 80, 90, 70, 80, 90, 70, 80, 90, 60]
  const enunciados = segundos.map((_, indice) => `Pregunta de auditoría número ${indice + 1} ${marca}`)
  for (let indice = 0; indice < enunciados.length; indice += 1) {
    if (indice === 0) {
      await page.getByRole('button', { name: 'Editar', exact: true }).click()
    } else {
      await page.getByRole('button', { name: 'Agregar pregunta' }).click()
    }
    const numero = indice + 1
    await page.getByLabel(`Enunciado de la pregunta ${numero}`).fill(enunciados[indice])
    await page.getByLabel(`Segundos de la pregunta ${numero}`).fill(String(segundos[indice]))
    const correcta = indice % 2 === 0 ? 0 : 1
    await page
      .getByRole('radiogroup', { name: `Respuesta correcta de la pregunta ${numero}` })
      .getByRole('button', { name: 'Marcar' })
      .nth(correcta)
      .click()
    await page.getByRole('button', { name: 'Listo' }).click()
  }

  const guardado = page.waitForResponse(
    (respuesta) => respuesta.url().includes('/cuestionarios') && respuesta.request().method() === 'POST',
    { timeout: 90_000 },
  )
  await page.getByRole('button', { name: 'Guardar cuestionario' }).click()
  const respuestaGuardado = await guardado
  expect(respuestaGuardado.ok(), await respuestaGuardado.text()).toBeTruthy()
  await page.waitForURL(/\/cuestionarios\/(?!nuevo)[^/]+$/)
  for (const enunciado of enunciados) {
    await expect(page.getByText(enunciado)).toBeVisible()
  }
  await expect(page.getByText('90 segundos').first()).toBeVisible()
  await expect(page.getByText('60 segundos').first()).toBeVisible()

  const id = page.url().split('/').pop() ?? ''
  await page.goto(`/cuestionarios/${id}/editar`)
  await page.getByRole('button', { name: 'Editar información' }).click()
  await expect(page.getByLabel('Título')).toHaveValue(titulo)
  await page.getByLabel('Descripción').fill('Cuestionario de diez preguntas, editado y conservado para la clase.')
  await page.getByRole('button', { name: 'Listo' }).click()
  await page.getByRole('button', { name: 'Eliminar pregunta 10' }).click()
  await page.getByRole('button', { name: 'Eliminar pregunta', exact: true }).click()
  await page.getByRole('button', { name: 'Agregar pregunta' }).click()
  await page.getByLabel('Enunciado de la pregunta 10').fill(enunciados[9])
  await page.getByLabel('Segundos de la pregunta 10').fill('60')
  await page.getByRole('radiogroup', { name: 'Respuesta correcta de la pregunta 10' }).getByRole('button', { name: 'Marcar' }).nth(1).click()
  await page.getByRole('button', { name: 'Listo' }).click()
  await page.getByRole('button', { name: 'Guardar cuestionario' }).click()
  await expect(page.getByText('editado y conservado')).toBeVisible()

  const desechable = await crearCuestionario(request, docente.token, `Borrador ${marca}`, [
    { enunciado: 'Pregunta temporal de borrado de auditoría.', correcto: 'Verdadero', segundos: 10 },
  ])
  await page.goto('/mis-cuestionarios')
  await page.getByRole('button', { name: `Eliminar Borrador ${marca}` }).click()
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
  await expect(page.getByText(`Borrador ${marca}`)).toHaveCount(0)

  const codigo = await abrirSala(page, id)
  await evidencia(page, '01-sala-docente')

  const planes = [
    { nombre: 'Ana Rapida', plan: enunciados.map(() => 'bien' as const) },
    { nombre: 'Bruno Lento', plan: enunciados.map(() => 'bien' as const), lento: true },
    { nombre: 'Carmen Mixta', plan: enunciados.map((_, indice) => (indice % 2 === 0 ? 'bien' : 'mal') as const) },
    { nombre: 'Diego Fallos', plan: enunciados.map(() => 'mal' as const) },
    { nombre: 'Elena Silencio', plan: enunciados.map((_, indice) => (indice < 3 ? 'bien' : 'salta') as const) },
    { nombre: 'Fabio Cortes', plan: enunciados.map((_, indice) => (indice === 2 ? 'fuera' : 'bien') as const) },
  ]
  const jugadores = []
  for (const [indice, item] of planes.entries()) {
    const sesion = await alumno(browser, {
      nombre: item.nombre,
      correo: `auditoria.e${indice}.${marca}@est.una.ac.cr`,
    })
    await unirse(sesion.page, codigo)
    await expect(sesion.page.getByRole('heading', { name: 'Esperando al anfitrión' })).toBeVisible()
    jugadores.push({ ...item, ...sesion })
  }
  await expect(page.getByRole('heading', { name: 'Participantes (6)' })).toBeVisible()
  for (const item of planes) await expect(page.getByText(item.nombre).first()).toBeVisible()
  await evidencia(page, '02-estudiantes-conectados')
  await evidencia(jugadores[0].page, '03-espera-estudiante')

  const invalido = await alumno(browser, {
    nombre: 'Ines Invalida',
    correo: `auditoria.invalida.${marca}@est.una.ac.cr`,
  })
  await unirse(invalido.page, 'ZZZZZZ')
  await expect(invalido.page.getByRole('alert')).toContainText('No hay una sala')
  await invalido.context.close()

  await expect(page.getByTestId('audio-estado')).toHaveAttribute('data-paisaje', 'espera')
  await page.getByRole('button', { name: 'Silenciar música' }).click()
  await expect(page.getByTestId('audio-estado')).toHaveAttribute('data-silenciado', 'si')
  await page.getByRole('slider', { name: 'Volumen' }).fill('30')
  await page.getByRole('button', { name: 'Activar música' }).click()
  await expect(page.getByTestId('audio-estado')).toHaveAttribute('data-silenciado', 'no')
  await expect(page.getByTestId('audio-estado')).toHaveAttribute('data-contexto', 'running')

  const respuestaInicio = page.waitForResponse((respuesta) => respuesta.url().includes('/iniciar') && respuesta.request().method() === 'POST')
  await page.getByRole('button', { name: 'Comenzar partida' }).click()
  const cuerpoInicio = await (await respuestaInicio).json() as { abreEn: string; cierraEn: string }
  expect(new Date(cuerpoInicio.cierraEn).getTime() - new Date(cuerpoInicio.abreEn).getTime()).toBe(90_000)

  for (let indice = 0; indice < enunciados.length; indice += 1) {
    await expect(page.getByRole('heading', { name: enunciados[indice] })).toBeVisible()
    if (indice === 0) {
      await expect(page.getByTestId('audio-estado')).toHaveAttribute('data-paisaje', 'suspenso')
      await expect(jugadores[0].page.getByText('Respuesta correcta:')).toHaveCount(0)
    }
    if (indice === 0) await evidencia(jugadores[0].page, '04-pregunta-activa')
    const fabio = jugadores[5]
    if (fabio.plan[indice] === 'fuera') await fabio.context.setOffline(true)
    for (const jugador of jugadores) {
      const accion = jugador.plan[indice]
      if (accion === 'salta' || accion === 'fuera') continue
      await expect(jugador.page.getByRole('heading', { name: enunciados[indice] })).toBeVisible()
      if ('lento' in jugador && jugador.lento) await jugador.page.waitForTimeout(350)
      const correcta = indice % 2 === 0 ? 'Verdadero' : 'Falso'
      const texto = accion === 'bien' ? correcta : correcta === 'Verdadero' ? 'Falso' : 'Verdadero'
      const boton = jugador.page.getByRole('button', { name: texto, exact: true })
      await boton.click()
      await expect(jugador.page.getByText('No puedes cambiarla.')).toBeVisible()
      await expect(boton).toBeDisabled()
    }
    if (indice === 0) {
      const repetida = await request.post(`${API}/sesiones-juego/${codigo}/respuestas`, {
        headers: { Authorization: `Bearer ${jugadores[0].token}` },
        data: { valor: true },
      })
      expect(repetida.status(), await repetida.text()).toBe(409)
      const adulterada = await request.post(`${API}/sesiones-juego/${codigo}/respuestas`, {
        headers: { Authorization: `Bearer ${jugadores[0].token}` },
        data: { valor: true, puntos: 99 },
      })
      expect(adulterada.status(), await adulterada.text()).toBe(400)
    }
    await page.getByRole('button', { name: 'Cerrar pregunta' }).click()
    await expect(page.getByText('Respuesta correcta:')).toBeVisible()
    if (indice === 0) await evidencia(page, '05-resultado-parcial')
    const tardia = await request.post(`${API}/sesiones-juego/${codigo}/respuestas`, {
      headers: { Authorization: `Bearer ${jugadores[4].token}` },
      data: { valor: true },
    })
    expect(tardia.status(), await tardia.text()).toBe(409)
    if (fabio.plan[indice] === 'fuera') {
      await fabio.context.setOffline(false)
      await fabio.page.reload()
      await expect(fabio.page.locator('header').getByText(fabio.nombre)).toBeVisible()
    }
    await page.getByRole('button', { name: indice === enunciados.length - 1 ? 'Ver resultados' : 'Siguiente pregunta' }).click()
  }

  await expect(page.locator('.podio-puesto.lugar-1')).toBeVisible()
  await expect(page.getByTestId('audio-estado')).toHaveAttribute('data-paisaje', 'victoria')
  await expect(page.locator('.podio-puesto.lugar-1')).toContainText('Ana Rapida')
  await expect(page.locator('.podio-puesto.lugar-1')).toContainText('10 pts')
  await expect(page.locator('.podio-puesto.lugar-2')).toContainText('Bruno Lento')
  await expect(page.locator('.podio-puesto.lugar-2')).toContainText('10 pts')
  await expect(page.locator('.podio-puesto.lugar-3')).toContainText('Fabio Cortes')
  await expect(page.locator('.podio-puesto.lugar-3')).toContainText('9 pts')
  await expect(page.getByText('orden alfabético')).toBeVisible()
  await evidencia(page, '06-podio-docente')

  for (const jugador of jugadores) {
    await expect(jugador.page.getByRole('heading', { name: 'Partida terminada' })).toBeVisible()
    await expect(jugador.page.locator('.podio-puesto.lugar-1')).toContainText('Ana Rapida')
  }
  await evidencia(jugadores[2].page, '07-podio-estudiante')
  await expect(page.locator('.participante', { hasText: 'Carmen Mixta' })).toContainText('5 pts')
  await expect(page.locator('.participante', { hasText: 'Elena Silencio' })).toContainText('3 pts')
  await expect(page.locator('.participante', { hasText: 'Diego Fallos' })).toContainText('0 pts')

  await page.reload()
  await expect(page.locator('.podio-puesto.lugar-1')).toContainText('Ana Rapida')
  await page.goto(`/resultados/${codigo}`)
  await expect(page.locator('.podio-puesto.lugar-1')).toContainText('10 pts')
  const anchos = [320, 375, 430, 768, 1024, 1366, 1920]
  for (const ancho of anchos) {
    await page.setViewportSize({ width: ancho, height: ancho < 800 ? 800 : 900 })
    await sinScrollHorizontal(page)
  }
  await evidencia(page, '08-podio-320')

  const tarde = await alumno(browser, {
    nombre: 'Llegada Tardia',
    correo: `auditoria.tarde.${marca}@est.una.ac.cr`,
  })
  await unirse(tarde.page, codigo)
  await expect(tarde.page.getByRole('alert')).toContainText('ya finalizó')
  await tarde.context.close()

  for (const jugador of jugadores) await jugador.context.close()
  expect(desechable.id).toBeTruthy()
})

test('desconexiones: el estudiante recupera puntaje y el docente retoma la sala', async ({ page, browser, request }) => {
  const docente = await registrar(request, {
    nombre: 'Docente Reconexion',
    correo: `auditoria.reconexion.${marca}@una.cr`,
  })
  const preguntas = [0, 1, 2, 3].map((indice) => ({
    enunciado: `Reconexión ${indice + 1} ${marca} está vigente.`,
    correcto: 'Verdadero' as const,
    segundos: 30,
  }))
  const cuestionario = await crearCuestionario(request, docente.token, `Reconexión ${marca}`, preguntas)
  await entrar(page, docente.perfil.correo)
  const codigo = await abrirSala(page, cuestionario.id)
  const presentes = [
    { nombre: 'Olga Sigue', correo: `auditoria.olga.${marca}@est.una.ac.cr` },
    { nombre: 'Pablo Corta', correo: `auditoria.pablo.${marca}@est.una.ac.cr` },
  ]
  const sesiones = []
  for (const item of presentes) {
    const sesion = await alumno(browser, item)
    await unirse(sesion.page, codigo)
    await expect(sesion.page.getByRole('heading', { name: 'Esperando al anfitrión' })).toBeVisible()
    sesiones.push(sesion)
  }
  await page.getByRole('button', { name: 'Comenzar partida' }).click()
  await expect(page.getByRole('heading', { name: preguntas[0].enunciado })).toBeVisible()
  await sesiones[0].page.getByRole('button', { name: 'Verdadero', exact: true }).click()
  await sesiones[1].page.getByRole('button', { name: 'Verdadero', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: preguntas[0].enunciado })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar pregunta' }).click()
  await page.getByRole('button', { name: 'Siguiente pregunta' }).click()

  await expect(sesiones[1].page.getByRole('heading', { name: preguntas[1].enunciado })).toBeVisible()
  await sesiones[1].page.goto('about:blank')
  await sesiones[0].page.getByRole('button', { name: 'Verdadero', exact: true }).click()
  await page.getByRole('button', { name: 'Cerrar pregunta' }).click()
  await expect(page.locator('.participante', { hasText: 'Pablo Corta' })).toContainText('Desconectado')
  await page.getByRole('button', { name: 'Siguiente pregunta' }).click()
  await sesiones[1].page.goto(`/partida/${codigo}`)
  await expect(sesiones[1].page.getByRole('heading', { name: preguntas[2].enunciado })).toBeVisible()
  await sesiones[0].page.getByRole('button', { name: 'Verdadero', exact: true }).click()
  await sesiones[1].page.getByRole('button', { name: 'Verdadero', exact: true }).click()
  await page.getByRole('button', { name: 'Cerrar pregunta' }).click()
  await page.getByRole('button', { name: 'Siguiente pregunta' }).click()
  await sesiones[0].page.getByRole('button', { name: 'Verdadero', exact: true }).click()
  await sesiones[1].page.getByRole('button', { name: 'Verdadero', exact: true }).click()
  await page.getByRole('button', { name: 'Cerrar pregunta' }).click()
  await expect(page.locator('.participante', { hasText: 'Pablo Corta' })).toContainText('3 pts')
  await page.getByRole('button', { name: 'Ver resultados' }).click()
  await expect(page.locator('.podio-puesto.lugar-1')).toContainText('Olga Sigue')
  await expect(page.locator('.podio-puesto.lugar-1')).toContainText('4 pts')
  await expect(page.locator('.podio-puesto.lugar-2')).toContainText('Pablo Corta')
  await expect(page.locator('.podio-puesto')).toHaveCount(2)
  await expect(page.getByText('Pablo Corta')).toHaveCount(3)
  await evidencia(page, '09-podio-reconexion')
  for (const sesion of sesiones) await sesion.context.close()
})

test('errores, tiempo agotado y empate ordenan el podio', async ({ page, browser, request }) => {
  const docente = await registrar(request, {
    nombre: 'Docente Empates',
    correo: `auditoria.empate.${marca}@una.cr`,
  })
  const enunciados = [0, 1, 2, 3].map((indice) => `Empate ${indice + 1} ${marca} se responde ahora.`)
  const cuestionario = await crearCuestionario(
    request,
    docente.token,
    `Empates ${marca}`,
    enunciados.map((enunciado) => ({ enunciado, correcto: 'Falso' as const, segundos: 45 })),
  )
  await entrar(page, docente.perfil.correo)
  const codigo = await abrirSala(page, cuestionario.id)
  const planes = [
    { nombre: 'Ana Empate', correo: `auditoria.anae.${marca}@est.una.ac.cr`, modo: 'bien' },
    { nombre: 'Bruno Empate', correo: `auditoria.brunoe.${marca}@est.una.ac.cr`, modo: 'bien' },
    { nombre: 'Carmen Cero', correo: `auditoria.carmen0.${marca}@est.una.ac.cr`, modo: 'salta' },
    { nombre: 'Diego Mal', correo: `auditoria.diegom.${marca}@est.una.ac.cr`, modo: 'mal' },
  ]
  const sesiones = []
  for (const item of planes) {
    const sesion = await alumno(browser, item)
    await unirse(sesion.page, codigo)
    await expect(sesion.page.getByRole('heading', { name: 'Esperando al anfitrión' })).toBeVisible()
    sesiones.push({ ...item, ...sesion })
  }
  const gemelo = await alumno(browser, {
    nombre: 'Gemelo',
    correo: `auditoria.gemelo1.${marca}@est.una.ac.cr`,
  })
  const gemeloDos = await alumno(browser, {
    nombre: 'Gemelo',
    correo: `auditoria.gemelo2.${marca}@est.una.ac.cr`,
  })
  await unirse(gemelo.page, codigo)
  await unirse(gemeloDos.page, codigo)
  await expect(page.getByRole('heading', { name: 'Participantes (6)' })).toBeVisible()
  await expect(page.getByText('Gemelo', { exact: true })).toHaveCount(2)

  await page.getByRole('button', { name: 'Comenzar partida' }).click()
  for (let indice = 0; indice < enunciados.length; indice += 1) {
    await expect(page.getByRole('heading', { name: enunciados[indice] })).toBeVisible()
    for (const sesion of sesiones) {
      if (sesion.modo === 'salta') continue
      await expect(sesion.page.getByRole('heading', { name: enunciados[indice] })).toBeVisible()
      await sesion.page.getByRole('button', { name: sesion.modo === 'bien' ? 'Falso' : 'Verdadero', exact: true }).click()
    }
    if (indice === 0) {
      const adulterada = await request.post(`${API}/sesiones-juego/${codigo}/respuestas`, {
        headers: { Authorization: `Bearer ${gemelo.token}` },
        data: { valor: false, puntos: 100, tardia: false },
      })
      expect(adulterada.status(), await adulterada.text()).toBe(400)
    }
    await page.getByRole('button', { name: 'Cerrar pregunta' }).click()
    await expect(page.getByText('Respuesta correcta:')).toBeVisible()
    await page.getByRole('button', { name: indice === enunciados.length - 1 ? 'Ver resultados' : 'Siguiente pregunta' }).click()
  }

  await expect(page.locator('.podio-puesto.lugar-1')).toContainText('Ana Empate')
  await expect(page.locator('.podio-puesto.lugar-1')).toContainText('4 pts')
  await expect(page.locator('.podio-puesto.lugar-2')).toContainText('Bruno Empate')
  await expect(page.locator('.podio-puesto.lugar-3')).toContainText('Carmen Cero')
  await expect(page.locator('.podio-puesto.lugar-3')).toContainText('0 pts')
  await expect(page.locator('.participante', { hasText: 'Diego Mal' })).toContainText('0 pts')
  await expect(page.locator('.participante', { hasText: 'Gemelo' }).first()).toContainText('0 pts')
  await expect(page.locator('.participante', { hasText: 'Gemelo' }).nth(1)).toContainText('0 pts')
  await expect(page.getByText('orden alfabético')).toBeVisible()
  await evidencia(page, '10-podio-empate')
  await page.goto(`/resultados/${codigo}`)
  await expect(page.locator('.podio-puesto.lugar-1')).toContainText('Ana Empate')

  const anchosMovil = [320, 375, 430]
  for (const ancho of anchosMovil) {
    await sesiones[0].page.setViewportSize({ width: ancho, height: 780 })
    await sesiones[0].page.goto(`/partida/${codigo}`)
    await expect(sesiones[0].page.locator('.podio-puesto.lugar-1')).toBeVisible()
    await sinScrollHorizontal(sesiones[0].page)
  }

  for (const sesion of [...sesiones, gemelo, gemeloDos]) await sesion.context.close()
})
