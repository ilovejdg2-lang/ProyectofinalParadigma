import { leerEntorno, type Entorno } from '../configuracion/entorno.ts'
import { almacenLocal, type Almacen } from './almacen.ts'
import { crearAutenticacionHttp, crearAutenticacionSimulada, type ClienteAutenticacion } from './autenticacion.ts'

export interface Servicios {
  autenticacion: ClienteAutenticacion
  simulacion: boolean
}

export function crearServicios(opciones?: { entorno?: Entorno; almacen?: Almacen }): Servicios {
  const entorno = opciones?.entorno ?? leerEntorno()
  const usarSimulacion = opciones?.almacen !== undefined || entorno.simulacion || !entorno.authUrl
  if (usarSimulacion) {
    const almacen = opciones?.almacen ?? almacenLocal()
    return {
      autenticacion: crearAutenticacionSimulada(almacen),
      simulacion: true,
    }
  }
  return {
    autenticacion: crearAutenticacionHttp(entorno.authUrl),
    simulacion: false,
  }
}
