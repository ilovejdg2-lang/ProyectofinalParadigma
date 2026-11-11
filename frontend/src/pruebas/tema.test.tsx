import { beforeEach, describe, expect, it } from 'vitest'
import { CONTRASENA_DEMO, CORREO_DEMO } from '../datos/demostracion.ts'
import { almacenMemoria } from '../servicios/almacen.ts'
import { crearServicios } from '../servicios/crearServicios.ts'
import { guardarTema, leerTema } from '../tema.ts'

describe('tema y sesión demo', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.tema = 'oscuro'
  })

  it('persiste la preferencia con guardarTema/leerTema', () => {
    guardarTema('claro')
    expect(localStorage.getItem('profelink.tema')).toBe('claro')
    expect(document.documentElement.dataset.tema).toBe('claro')
    expect(leerTema()).toBe('claro')
    guardarTema('oscuro')
    expect(leerTema()).toBe('oscuro')
  })

  it('incluye el rol teacher en la sesión simulada del docente demo', async () => {
    const servicios = crearServicios({
      almacen: almacenMemoria(),
      entorno: { authUrl: '', actividadesUrl: '', canalUrl: '', simulacion: true },
    })
    const sesion = await servicios.autenticacion.iniciarSesion(CORREO_DEMO, CONTRASENA_DEMO)
    expect(sesion.perfil.rol).toBe('teacher')
  })

  it('fuerza simulación cuando VITE_USAR_SIMULACION equivalente llega por entorno', () => {
    const servicios = crearServicios({
      almacen: almacenMemoria(),
      entorno: {
        authUrl: 'http://localhost:5001',
        actividadesUrl: 'http://localhost:5002',
        canalUrl: 'ws://localhost:5002/canal',
        simulacion: true,
      },
    })
    expect(servicios.simulacion).toBe(true)
  })
})
