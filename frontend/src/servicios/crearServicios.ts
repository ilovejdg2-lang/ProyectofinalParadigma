import { leerEntorno, type Entorno } from '../configuracion/entorno.ts'
import { crearActividadesHttp, crearActividadesSimuladas, type ClienteActividades } from './actividades.ts'
import { almacenLocal, type Almacen } from './almacen.ts'
import { crearAutenticacionHttp, crearAutenticacionSimulada, type ClienteAutenticacion } from './autenticacion.ts'
import { crearSalaHttp, crearSalaSimulada, type ClienteSala } from './sala.ts'

export interface Servicios {
  autenticacion: ClienteAutenticacion
  actividades: ClienteActividades
  sala: ClienteSala
  simulacion: boolean
}

export function crearServicios(opciones?: { entorno?: Entorno; almacen?: Almacen }): Servicios {
  const entorno = opciones?.entorno ?? leerEntorno()
  const modoPrueba = opciones?.almacen !== undefined
  const apisListas = Boolean(entorno.authUrl && entorno.actividadesUrl)
  // Simulación: pruebas unitarias, flag explícito, o APIs sin configurar.
  // VITE_USAR_SIMULACION=true fuerza la simulación aunque existan URLs en .env.
  const usarSimulacion = modoPrueba || entorno.simulacion || !apisListas
  if (usarSimulacion) {
    const almacen = opciones?.almacen ?? almacenLocal()
    const autenticacion = crearAutenticacionSimulada(almacen)
    const actividades = crearActividadesSimuladas(almacen, autenticacion)
    return {
      autenticacion,
      actividades,
      sala: crearSalaSimulada(almacen, autenticacion, actividades),
      simulacion: true,
    }
  }
  return {
    autenticacion: crearAutenticacionHttp(entorno.authUrl),
    actividades: crearActividadesHttp(entorno.actividadesUrl),
    sala: crearSalaHttp(entorno.actividadesUrl, entorno.canalUrl),
    simulacion: false,
  }
}
