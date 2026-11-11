import { leerEntorno } from '../configuracion/entorno.ts';
import { crearActividadesHttp, crearActividadesSimuladas } from './actividades.ts';
import { almacenLocal } from './almacen.ts';
import { crearAutenticacionHttp, crearAutenticacionSimulada } from './autenticacion.ts';
import { crearSalaHttp, crearSalaSimulada } from './sala.ts';
export function crearServicios(opciones) {
    const entorno = opciones?.entorno ?? leerEntorno();
    const modoPrueba = opciones?.almacen !== undefined;
    const apisListas = Boolean(entorno.authUrl && entorno.actividadesUrl);
    // Si hay API configurada, se usa siempre (auth, actividades y canal en vivo).
    // Simulación solo en pruebas unitarias o cuando faltan las URLs.
    const usarSimulacion = modoPrueba || !apisListas;
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
