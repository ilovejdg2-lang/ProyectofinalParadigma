import { leerEntorno } from '../configuracion/entorno.ts';
import { crearActividadesHttp, crearActividadesSimuladas } from './actividades.ts';
import { almacenLocal } from './almacen.ts';
import { crearAutenticacionHttp, crearAutenticacionSimulada } from './autenticacion.ts';
import { crearSalaHttp, crearSalaSimulada } from './sala.ts';
export function crearServicios(opciones) {
    const entorno = opciones?.entorno ?? leerEntorno();
    const usarSimulacion = opciones?.almacen !== undefined || entorno.simulacion || !entorno.authUrl || !entorno.actividadesUrl;
    if (usarSimulacion) {
        const almacen = opciones?.almacen ?? almacenLocal();
        const autenticacion = crearAutenticacionSimulada(almacen);
        const actividades = crearActividadesSimuladas(almacen, autenticacion);
        return {
            autenticacion,
            actividades,
            sala: crearSalaSimulada(almacen, autenticacion, actividades),
            simulacion: true,
        };
    }
    return {
        autenticacion: crearAutenticacionHttp(entorno.authUrl),
        actividades: crearActividadesHttp(entorno.actividadesUrl),
        sala: crearSalaHttp(entorno.actividadesUrl, entorno.canalUrl),
        simulacion: false,
    };
}
