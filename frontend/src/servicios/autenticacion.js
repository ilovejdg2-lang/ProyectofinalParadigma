import { ErrorServicio } from '../dominio/errores.ts';
import { CONTRASENA_DEMO, CORREO_DEMO, ID_DEMO, NOMBRE_DEMO } from '../datos/demostracion.ts';
const CLAVE = 'profelink.auth.v1';
function crearId() {
    return crypto.randomUUID();
}
function leer(almacen) {
    const texto = almacen.leer(CLAVE);
    if (!texto) {
        const inicial = {
            usuarios: [
                {
                    id: ID_DEMO,
                    nombre: NOMBRE_DEMO,
                    correo: CORREO_DEMO,
                    contrasena: CONTRASENA_DEMO,
                    rol: 'teacher',
                },
            ],
            sesiones: [],
            recuperaciones: [],
        };
        almacen.escribir(CLAVE, JSON.stringify(inicial));
        return inicial;
    }
    const estado = JSON.parse(texto);
    if (!Array.isArray(estado.recuperaciones))
        estado.recuperaciones = [];
    return estado;
}
function guardar(almacen, estado) {
    almacen.escribir(CLAVE, JSON.stringify(estado));
}
function sesionDe(estado, token) {
    const sesion = estado.sesiones.find((item) => item.token === token);
    const usuario = estado.usuarios.find((item) => item.id === sesion?.perfilId);
    if (!sesion || !usuario)
        return null;
    return { token, perfil: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol ?? (usuario.correo.endsWith('@una.cr') ? 'teacher' : 'student') } };
}
export function crearAutenticacionSimulada(almacen) {
    return {
        async registrar(datos) {
            const estado = leer(almacen);
            const correo = datos.correo.trim().toLowerCase();
            if (estado.usuarios.some((usuario) => usuario.correo === correo)) {
                throw new ErrorServicio('validacion', 'Ya existe un perfil con ese correo.');
            }
            const usuario = {
                id: crearId(),
                nombre: datos.nombre.trim(),
                correo,
                contrasena: datos.contrasena,
            };
            const token = crearId();
            estado.usuarios.push(usuario);
            estado.sesiones.push({ token, perfilId: usuario.id });
            guardar(almacen, estado);
            return { token, perfil: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo } };
        },
        async iniciarSesion(correo, contrasena) {
            const estado = leer(almacen);
            const usuario = estado.usuarios.find((item) => item.correo === correo.trim().toLowerCase());
            if (!usuario || usuario.contrasena !== contrasena) {
                throw new ErrorServicio('credenciales', 'Correo o contraseña incorrectos.');
            }
            const token = crearId();
            estado.sesiones.push({ token, perfilId: usuario.id });
            guardar(almacen, estado);
            return { token, perfil: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo } };
        },
        async cerrarSesion(token) {
            const estado = leer(almacen);
            estado.sesiones = estado.sesiones.filter((item) => item.token !== token);
            guardar(almacen, estado);
        },
        async sesionActual(token) {
            return sesionDe(leer(almacen), token);
        },
        async cambiarContrasena(token, actual, nueva) {
            const estado = leer(almacen);
            const sesion = estado.sesiones.find((item) => item.token === token);
            const usuario = estado.usuarios.find((item) => item.id === sesion?.perfilId);
            if (!usuario || usuario.contrasena !== actual) {
                throw new ErrorServicio('validacion', 'La contraseña actual es incorrecta.');
            }
            if (nueva.length < 8) {
                throw new ErrorServicio('validacion', 'La nueva contraseña debe tener al menos 8 caracteres.');
            }
            usuario.contrasena = nueva;
            guardar(almacen, estado);
        },
        async solicitarRecuperacion(correo) {
            const estado = leer(almacen);
            const usuario = estado.usuarios.find((item) => item.correo === correo.trim().toLowerCase());
            const mensaje = 'Si el correo está registrado, usa el código de recuperación para definir una nueva contraseña.';
            if (!usuario)
                return { mensaje };
            const codigo = crearId().replace(/-/g, '').slice(0, 12);
            estado.recuperaciones = estado.recuperaciones.filter((item) => item.perfilId !== usuario.id);
            estado.recuperaciones.push({
                codigo,
                perfilId: usuario.id,
                expira: Date.now() + 30 * 60 * 1000,
            });
            guardar(almacen, estado);
            return { mensaje, codigo };
        },
        async restablecerContrasena(codigo, nueva) {
            const estado = leer(almacen);
            const recuperacion = estado.recuperaciones.find((item) => item.codigo === codigo.trim());
            if (!recuperacion || recuperacion.expira < Date.now()) {
                throw new ErrorServicio('validacion', 'El código de recuperación no es válido o ha expirado.');
            }
            if (nueva.length < 8) {
                throw new ErrorServicio('validacion', 'La nueva contraseña debe tener al menos 8 caracteres.');
            }
            const usuario = estado.usuarios.find((item) => item.id === recuperacion.perfilId);
            if (!usuario) {
                throw new ErrorServicio('validacion', 'El código de recuperación no es válido o ha expirado.');
            }
            usuario.contrasena = nueva;
            estado.sesiones = estado.sesiones.filter((item) => item.perfilId !== usuario.id);
            estado.recuperaciones = estado.recuperaciones.filter((item) => item.codigo !== recuperacion.codigo);
            guardar(almacen, estado);
        },
    };
}
async function leerMensaje(respuesta) {
    try {
        const cuerpo = (await respuesta.json());
        const texto = Array.isArray(cuerpo.message) ? cuerpo.message[0] : cuerpo.message;
        return cuerpo.mensaje ?? texto ?? 'El servicio de autenticación rechazó la solicitud.';
    }
    catch {
        return 'El servicio de autenticación no respondió correctamente.';
    }
}
export function crearAutenticacionHttp(baseUrl) {
    const raiz = baseUrl.replace(/\/$/, '');
    return {
        async registrar(datos) {
            const respuesta = await fetch(`${raiz}/perfiles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos),
            });
            if (!respuesta.ok)
                throw new ErrorServicio('validacion', await leerMensaje(respuesta));
            return (await respuesta.json());
        },
        async iniciarSesion(correo, contrasena) {
            let respuesta;
            try {
                respuesta = await fetch(`${raiz}/sesiones`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo, contrasena }),
                });
            }
            catch {
                throw new ErrorServicio('conexion', 'No se pudo conectar con el servicio de autenticación.');
            }
            if (!respuesta.ok)
                throw new ErrorServicio('credenciales', await leerMensaje(respuesta));
            return (await respuesta.json());
        },
        async cerrarSesion(token) {
            const respuesta = await fetch(`${raiz}/sesiones/actual`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!respuesta.ok)
                throw new ErrorServicio('conexion', await leerMensaje(respuesta));
        },
        async sesionActual(token) {
            const respuesta = await fetch(`${raiz}/sesiones/actual`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (respuesta.status === 401)
                return null;
            if (!respuesta.ok)
                throw new ErrorServicio('conexion', await leerMensaje(respuesta));
            return (await respuesta.json());
        },
        async cambiarContrasena(token, actual, nueva) {
            const respuesta = await fetch(`${raiz}/perfiles/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    contrasenaActual: actual,
                    nuevaContrasena: nueva,
                }),
            });
            if (!respuesta.ok)
                throw new ErrorServicio('validacion', await leerMensaje(respuesta));
        },
        async solicitarRecuperacion(correo) {
            let respuesta;
            try {
                respuesta = await fetch(`${raiz}/recuperacion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo }),
                });
            }
            catch {
                throw new ErrorServicio('conexion', 'No se pudo conectar con el servicio de autenticación.');
            }
            if (!respuesta.ok)
                throw new ErrorServicio('validacion', await leerMensaje(respuesta));
            return (await respuesta.json());
        },
        async restablecerContrasena(codigo, nueva) {
            let respuesta;
            try {
                respuesta = await fetch(`${raiz}/recuperacion/restablecer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ codigo, nuevaContrasena: nueva }),
                });
            }
            catch {
                throw new ErrorServicio('conexion', 'No se pudo conectar con el servicio de autenticación.');
            }
            if (!respuesta.ok)
                throw new ErrorServicio('validacion', await leerMensaje(respuesta));
        },
    };
}
