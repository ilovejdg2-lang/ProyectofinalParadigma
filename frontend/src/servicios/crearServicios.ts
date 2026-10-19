import { leerEntorno, type Entorno } from '../configuracion/entorno.ts'
import { crearActividadesHttp, crearActividadesSimuladas, type ClienteActividades } from './actividades.ts'
import { almacenLocal, type Almacen } from './almacen.ts'
import { crearAutenticacionHttp, crearAutenticacionSimulada, type ClienteAutenticacion } from './autenticacion.ts'

export interface Servicios {
  autenticacion: ClienteAutenticacion
  actividades: ClienteActividades
  simulacion: boolean
}

export function crearServicios(opciones?: { entorno?: Entorno; almacen?: Almacen }): Servicios {
  const entorno = opciones?.entorno ?? leerEntorno()
  const usarSimulacion = opciones?.almacen !== undefined || entorno.simulacion || !entorno.authUrl || !entorno.actividadesUrl
  if (usarSimulacion) {
    const almacen = opciones?.almacen ?? almacenLocal()
    const autenticacion = crearAutenticacionSimulada(almacen)
    return {
      autenticacion,
      actividades: crearActividadesSimuladas(almacen, autenticacion),
      simulacion: true,
    }
  }
  return {
    autenticacion: crearAutenticacionHttp(entorno.authUrl),
    actividades: crearActividadesHttp(entorno.actividadesUrl),
    simulacion: false,
  }
}
