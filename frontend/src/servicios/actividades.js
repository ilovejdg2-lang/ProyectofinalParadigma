import { cuestionariosDemostracion } from '../datos/demostracion.ts';
import { ErrorServicio } from '../dominio/errores.ts';
import { validarImagen } from '../dominio/validacion.ts';
const CLAVE = 'profelink.cuestionarios.v1';
function deduplicarCuestionarios(lista) {
    const vistos = new Set();
    const resultado = [];
    for (const item of lista) {
        if (!item?.id || vistos.has(item.id))
            continue;
        vistos.add(item.id);
        resultado.push(item);
    }
    return resultado;
}
function leer(almacen) {
    const texto = almacen.leer(CLAVE);
    const iniciales = cuestionariosDemostracion();
    if (!texto) {
        almacen.escribir(CLAVE, JSON.stringify(iniciales));
        return iniciales;
    }
    const guardados = JSON.parse(texto);
    const faltantesDemo = iniciales.filter((demo) => !guardados.some((actual) => actual.id === demo.id));
    if (faltantesDemo.length > 0) {
        const combinados = deduplicarCuestionarios([...guardados, ...faltantesDemo]);
        almacen.escribir(CLAVE, JSON.stringify(combinados));
        return combinados;
    }
    return deduplicarCuestionarios(guardados);
}
function guardarLista(almacen, lista) {
    almacen.escribir(CLAVE, JSON.stringify(deduplicarCuestionarios(lista)));
}
async function perfilDe(autenticacion, token) {
    const sesion = await autenticacion.sesionActual(token);
    if (!sesion)
        throw new ErrorServicio('permiso', 'La sesión no es válida.');
    return sesion.perfil;
}
export function crearActividadesSimuladas(almacen, autenticacion) {
    return {
        async listar() {
            return leer(almacen);
        },
        async obtener(id) {
            const cuestionario = leer(almacen).find((item) => item.id === id);
            if (!cuestionario)
                throw new ErrorServicio('no-encontrado', 'No se encontró el cuestionario.');
            return cuestionario;
        },
        async mios(token) {
            const perfil = await perfilDe(autenticacion, token);
            return leer(almacen).filter((item) => item.autorId === perfil.id);
        },
        async guardar(token, entrada) {
            const perfil = await perfilDe(autenticacion, token);
            const lista = leer(almacen);
            const ahora = new Date().toISOString();
            if (entrada.id) {
                const indice = lista.findIndex((item) => item.id === entrada.id);
                const actual = lista[indice];
                if (!actual)
                    throw new ErrorServicio('no-encontrado', 'No se encontró el cuestionario.');
                if (actual.autorId !== perfil.id) {
                    throw new ErrorServicio('permiso', 'Solo quien creó el cuestionario puede editarlo.');
                }
                const actualizado = {
                    ...actual,
                    titulo: entrada.titulo.trim(),
                    descripcion: entrada.descripcion.trim(),
                    categoria: entrada.categoria,
                    etiquetas: entrada.etiquetas,
                    dificultad: entrada.dificultad,
                    modo: entrada.modo ?? actual.modo ?? 'en-vivo',
                    imagenUrl: entrada.imagenUrl,
                    preguntas: entrada.preguntas,
                    actualizadoEn: ahora,
                };
                lista[indice] = actualizado;
                try {
                    guardarLista(almacen, lista);
                }
                catch {
                    throw new ErrorServicio('validacion', 'No se pudo guardar la portada. Prueba con una imagen más liviana.');
                }
                return actualizado;
            }
            const creado = {
                id: crypto.randomUUID(),
                titulo: entrada.titulo.trim(),
                descripcion: entrada.descripcion.trim(),
                categoria: entrada.categoria,
                etiquetas: entrada.etiquetas,
                dificultad: entrada.dificultad,
                modo: entrada.modo ?? 'en-vivo',
                autorId: perfil.id,
                autorNombre: perfil.nombre,
                imagenUrl: entrada.imagenUrl,
                preguntas: entrada.preguntas,
                esDemostracion: false,
                actualizadoEn: ahora,
            };
            lista.unshift(creado);
            try {
                guardarLista(almacen, lista);
            }
            catch {
                throw new ErrorServicio('validacion', 'No se pudo guardar la portada. Prueba con una imagen más liviana.');
            }
            return creado;
        },
        async eliminar(token, id) {
            const perfil = await perfilDe(autenticacion, token);
            const lista = leer(almacen);
            const actual = lista.find((item) => item.id === id);
            if (!actual)
                throw new ErrorServicio('no-encontrado', 'No se encontró el cuestionario.');
            if (actual.autorId !== perfil.id) {
                throw new ErrorServicio('permiso', 'Solo quien creó el cuestionario puede eliminarlo.');
            }
            guardarLista(almacen, lista.filter((item) => item.id !== id));
        },
        async cargarImagen(_token, archivo) {
            await perfilDe(autenticacion, _token);
            const error = validarImagen(archivo);
            if (error)
                throw new ErrorServicio('validacion', error);
            const url = await prepararImagen(archivo);
            return { url, origen: 'simulado' };
        },
    };
}
function leerArchivo(archivo) {
    return new Promise((resolver, rechazar) => {
        const lector = new FileReader();
        lector.onload = () => resolver(String(lector.result));
        lector.onerror = () => rechazar(new ErrorServicio('validacion', 'No se pudo leer la imagen.'));
        lector.readAsDataURL(archivo);
    });
}
function prepararImagen(archivo) {
    return leerArchivo(archivo).then((dataUrl) => {
        if (archivo.type === 'image/svg+xml' || archivo.type === 'image/gif')
            return dataUrl;
        return new Promise((resolver, rechazar) => {
            const imagen = new Image();
            imagen.onload = () => {
                const maximo = 1200;
                const escala = Math.min(1, maximo / Math.max(imagen.width, imagen.height));
                const lienzo = document.createElement('canvas');
                lienzo.width = Math.max(1, Math.round(imagen.width * escala));
                lienzo.height = Math.max(1, Math.round(imagen.height * escala));
                const contexto = lienzo.getContext('2d');
                if (!contexto) {
                    resolver(dataUrl);
                    return;
                }
                contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
                resolver(lienzo.toDataURL('image/jpeg', 0.82));
            };
            imagen.onerror = () => rechazar(new ErrorServicio('validacion', 'No se pudo usar esa imagen.'));
            imagen.src = dataUrl;
        });
    });
}
async function mensaje(respuesta) {
    try {
        const cuerpo = (await respuesta.json());
        return cuerpo.mensaje ?? 'La API de actividades rechazó la solicitud.';
    }
    catch {
        return 'La API de actividades no respondió correctamente.';
    }
}
export function crearActividadesHttp(baseUrl) {
    const raiz = baseUrl.replace(/\/$/, '');
    const autorizacion = (token) => ({ Authorization: `Bearer ${token}` });
    return {
        async listar() {
            const respuesta = await fetch(`${raiz}/cuestionarios`);
            if (!respuesta.ok)
                throw new ErrorServicio('conexion', await mensaje(respuesta));
            return (await respuesta.json());
        },
        async obtener(id) {
            const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('profelink.token') : null;
            const respuesta = await fetch(`${raiz}/cuestionarios/${id}`, {
                headers: token ? autorizacion(token) : undefined,
            });
            if (respuesta.status === 404)
                throw new ErrorServicio('no-encontrado', 'No se encontró el cuestionario.');
            if (!respuesta.ok)
                throw new ErrorServicio('conexion', await mensaje(respuesta));
            return (await respuesta.json());
        },
        async mios(token) {
            const respuesta = await fetch(`${raiz}/mis-cuestionarios`, { headers: autorizacion(token) });
            if (!respuesta.ok)
                throw new ErrorServicio('conexion', await mensaje(respuesta));
            return (await respuesta.json());
        },
        async guardar(token, entrada) {
            const esEdicion = Boolean(entrada.id);
            const { modo: _modo, id: _id, ...cuerpo } = entrada;
            const respuesta = await fetch(esEdicion ? `${raiz}/cuestionarios/${entrada.id}` : `${raiz}/cuestionarios`, {
                method: esEdicion ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', ...autorizacion(token) },
                body: JSON.stringify(cuerpo),
            });
            if (respuesta.status === 403)
                throw new ErrorServicio('permiso', await mensaje(respuesta));
            if (!respuesta.ok)
                throw new ErrorServicio('validacion', await mensaje(respuesta));
            return (await respuesta.json());
        },
        async eliminar(token, id) {
            const respuesta = await fetch(`${raiz}/cuestionarios/${id}`, {
                method: 'DELETE',
                headers: autorizacion(token),
            });
            if (respuesta.status === 403)
                throw new ErrorServicio('permiso', await mensaje(respuesta));
            if (!respuesta.ok)
                throw new ErrorServicio('conexion', await mensaje(respuesta));
        },
        async cargarImagen(token, archivo) {
            const error = validarImagen(archivo);
            if (error)
                throw new ErrorServicio('validacion', error);
            const formulario = new FormData();
            formulario.set('archivo', archivo);
            const respuesta = await fetch(`${raiz}/imagenes`, {
                method: 'POST',
                headers: autorizacion(token),
                body: formulario,
            });
            if (!respuesta.ok)
                throw new ErrorServicio('validacion', await mensaje(respuesta));
            const cuerpo = (await respuesta.json());
            return { url: cuerpo.url, origen: 'remoto' };
        },
    };
}
