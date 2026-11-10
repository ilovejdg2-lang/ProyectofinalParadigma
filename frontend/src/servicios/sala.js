import { resultadosDemostracion } from '../datos/demostracion.ts';
import { ErrorServicio } from '../dominio/errores.ts';
import { opcionesDe } from '../dominio/opciones.ts';
import { calcularProgresoLocal, deduplicarResultados, normalizarYValidarResultado, validarEntradaPartida, } from '../dominio/validacion.ts';
const CLAVE_SALAS = 'profelink.salas.v1';
const CLAVE_RESULTADOS = 'profelink.resultados.v1';
const SEGUNDOS = 20;
const registros = new WeakMap();
function leerSalas(almacen) {
    const texto = almacen.leer(CLAVE_SALAS);
    if (!texto)
        return { salas: {} };
    return JSON.parse(texto);
}
function guardarSalas(almacen, estado) {
    almacen.escribir(CLAVE_SALAS, JSON.stringify(estado));
}
function leerResultados(almacen) {
    const texto = almacen.leer(CLAVE_RESULTADOS);
    const iniciales = resultadosDemostracion();
    if (!texto) {
        const validos = deduplicarResultados(iniciales);
        almacen.escribir(CLAVE_RESULTADOS, JSON.stringify(validos));
        return validos;
    }
    const guardados = JSON.parse(texto);
    const faltantes = iniciales.filter((demo) => !guardados.some((actual) => actual.codigo === demo.codigo));
    const combinados = deduplicarResultados([...guardados, ...faltantes]);
    if (faltantes.length > 0) {
        almacen.escribir(CLAVE_RESULTADOS, JSON.stringify(combinados));
    }
    return combinados;
}
function guardarResultados(almacen, lista) {
    almacen.escribir(CLAVE_RESULTADOS, JSON.stringify(deduplicarResultados(lista)));
}
function notificar(almacen, codigo, sala) {
    registros.get(almacen)?.get(codigo)?.forEach((oyente) => oyente(sala));
    if (typeof BroadcastChannel === 'undefined')
        return;
    const canal = new BroadcastChannel('profelink-salas');
    canal.postMessage({ codigo });
    canal.close();
}
function codigoNuevo(salas, existentes) {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codigosUsados = new Set(existentes?.map((r) => r.codigo.toUpperCase()) ?? []);
    let codigo = '';
    do {
        codigo = Array.from({ length: 6 }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join('');
    } while (salas[codigo] || codigosUsados.has(codigo));
    return codigo;
}
async function exigirPerfil(autenticacion, token) {
    const sesion = await autenticacion.sesionActual(token);
    if (!sesion)
        throw new ErrorServicio('permiso', 'La sesión no es válida.');
    return sesion.perfil;
}
function exigirSala(estado, codigo) {
    const sala = estado.salas[codigo.toUpperCase()];
    if (!sala)
        throw new ErrorServicio('no-encontrado', 'No hay una sala con ese código.');
    return sala;
}
function cuentaSimulada(sala) {
    return Boolean(sala.estado === 'pregunta' &&
        sala.preguntaActual === 0 &&
        sala.abreEn &&
        Date.now() < new Date(sala.abreEn).getTime());
}
function copiarPreguntas(preguntas) {
    return preguntas.map((pregunta) => ({
        ...pregunta,
        opciones: pregunta.opciones?.map((opcion) => ({ ...opcion })),
    }));
}
function acierto(pregunta, respuesta) {
    if (respuesta.opcionId) {
        return opcionesDe(pregunta).some((opcion) => opcion.correcta && opcion.id === respuesta.opcionId);
    }
    return respuesta.valor === pregunta.respuestaCorrecta;
}
export function crearSalaSimulada(almacen, autenticacion, actividades) {
    let conexion = 'conectado';
    function exigirConexion() {
        if (conexion !== 'conectado') {
            throw new ErrorServicio('conexion', 'No hay conexión con la sala. Recupera la conexión para ver el estado vigente.');
        }
    }
    function publicar(codigo, sala) {
        guardarSalas(almacen, leerSalas(almacen));
        notificar(almacen, codigo, sala);
    }
    return {
        canal: 'simulado',
        estadoConexion: () => conexion,
        desconectar() {
            conexion = 'desconectado';
        },
        reconectar() {
            conexion = 'conectado';
        },
        async crear(token, cuestionarioId) {
            exigirConexion();
            const perfil = await exigirPerfil(autenticacion, token);
            const cuestionario = await actividades.obtener(cuestionarioId);
            if (cuestionario.preguntas.length === 0) {
                throw new ErrorServicio('validacion', 'El cuestionario no tiene preguntas.');
            }
            const estado = leerSalas(almacen);
            const codigo = codigoNuevo(estado.salas, leerResultados(almacen));
            const sala = {
                codigo,
                cuestionarioId,
                titulo: cuestionario.titulo,
                modo: cuestionario.modo ?? 'en-vivo',
                anfitrionId: perfil.id,
                anfitrionNombre: perfil.nombre,
                estado: 'esperando',
                preguntaActual: 0,
                segundos: SEGUNDOS,
                cierraEn: null,
                abreEn: null,
                participantes: [],
                preguntas: copiarPreguntas(cuestionario.preguntas),
                canal: 'simulado',
            };
            estado.salas[codigo] = sala;
            guardarSalas(almacen, estado);
            publicar(codigo, sala);
            return sala;
        },
        async unirse(token, codigo, ficha) {
            exigirConexion();
            const perfil = await exigirPerfil(autenticacion, token);
            const estado = leerSalas(almacen);
            const sala = exigirSala(estado, codigo);
            if (sala.estado === 'finalizada') {
                throw new ErrorServicio('estado', 'Esta partida ya finalizó.');
            }
            const nombre = ficha?.nombre?.trim() || perfil.nombre;
            const existente = sala.participantes.find((item) => item.perfilId === perfil.id);
            if (existente) {
                existente.conectado = true;
                existente.nombre = nombre;
                if (ficha?.avatarId)
                    existente.avatarId = ficha.avatarId;
            }
            else {
                const participante = {
                    id: crypto.randomUUID(),
                    perfilId: perfil.id,
                    nombre,
                    avatarId: ficha?.avatarId,
                    conectado: true,
                    puntaje: 0,
                    aciertos: 0,
                    respuestas: [],
                };
                sala.participantes.push(participante);
            }
            guardarSalas(almacen, estado);
            publicar(sala.codigo, sala);
            return sala;
        },
        async obtener(token, codigo) {
            exigirConexion();
            await exigirPerfil(autenticacion, token);
            return exigirSala(leerSalas(almacen), codigo);
        },
        suscribir(codigo, _token, alCambiar) {
            const normalizado = codigo.toUpperCase();
            let mapa = registros.get(almacen);
            if (!mapa) {
                mapa = new Map();
                registros.set(almacen, mapa);
            }
            const conjunto = mapa.get(normalizado) ?? new Set();
            conjunto.add(alCambiar);
            mapa.set(normalizado, conjunto);
            let canal = null;
            if (typeof BroadcastChannel !== 'undefined') {
                canal = new BroadcastChannel('profelink-salas');
                canal.onmessage = (evento) => {
                    if (evento.data?.codigo !== normalizado || conexion !== 'conectado')
                        return;
                    const sala = leerSalas(almacen).salas[normalizado];
                    if (sala)
                        alCambiar(sala);
                };
            }
            return () => {
                conjunto.delete(alCambiar);
                canal?.close();
            };
        },
        async iniciar(token, codigo) {
            exigirConexion();
            const perfil = await exigirPerfil(autenticacion, token);
            const estado = leerSalas(almacen);
            const sala = exigirSala(estado, codigo);
            if (sala.anfitrionId !== perfil.id) {
                throw new ErrorServicio('permiso', 'Solo el anfitrión puede iniciar la partida.');
            }
            if (sala.participantes.length === 0) {
                throw new ErrorServicio('estado', 'Todavía no hay participantes.');
            }
            if (sala.estado !== 'esperando') {
                throw new ErrorServicio('estado', 'La partida ya fue iniciada.');
            }
            sala.estado = 'pregunta';
            sala.preguntaActual = 0;
            const abre = Date.now() + 4_500;
            sala.abreEn = new Date(abre).toISOString();
            sala.cierraEn = new Date(abre + sala.segundos * 1000).toISOString();
            guardarSalas(almacen, estado);
            publicar(sala.codigo, sala);
            return sala;
        },
        async responder(token, codigo, valor) {
            exigirConexion();
            const perfil = await exigirPerfil(autenticacion, token);
            const estado = leerSalas(almacen);
            const sala = exigirSala(estado, codigo);
            const pregunta = sala.preguntas[sala.preguntaActual];
            if (!pregunta || sala.estado !== 'pregunta') {
                throw new ErrorServicio('tarde', 'La pregunta ya está cerrada. La respuesta no se acepta.');
            }
            if (cuentaSimulada(sala)) {
                throw new ErrorServicio('estado', 'La cuenta regresiva todavía no termina.');
            }
            if (sala.cierraEn && Date.now() > new Date(sala.cierraEn).getTime()) {
                throw new ErrorServicio('tarde', 'El tiempo de respuesta terminó.');
            }
            const participante = sala.participantes.find((item) => item.perfilId === perfil.id);
            if (!participante)
                throw new ErrorServicio('permiso', 'No estás unido a esta sala.');
            if (participante.respuestas.some((respuesta) => respuesta.preguntaId === pregunta.id && respuesta.aceptada)) {
                throw new ErrorServicio('estado', 'Ya enviaste una respuesta para esta pregunta.');
            }
            participante.respuestas.push({
                preguntaId: pregunta.id,
                valor: typeof valor === 'boolean' ? valor : null,
                opcionId: typeof valor === 'string' ? valor : undefined,
                aceptada: true,
                tardia: false,
                puntos: 0,
            });
            guardarSalas(almacen, estado);
            publicar(sala.codigo, sala);
            return sala;
        },
        async cerrarPregunta(token, codigo) {
            exigirConexion();
            const perfil = await exigirPerfil(autenticacion, token);
            const estado = leerSalas(almacen);
            const sala = exigirSala(estado, codigo);
            if (sala.anfitrionId !== perfil.id) {
                throw new ErrorServicio('permiso', 'Solo el anfitrión puede cerrar la pregunta.');
            }
            if (sala.estado !== 'pregunta') {
                throw new ErrorServicio('estado', 'No hay una pregunta abierta.');
            }
            if (cuentaSimulada(sala)) {
                throw new ErrorServicio('estado', 'La cuenta regresiva todavía no termina.');
            }
            const pregunta = sala.preguntas[sala.preguntaActual];
            if (!pregunta)
                throw new ErrorServicio('estado', 'No hay una pregunta activa.');
            for (const participante of sala.participantes) {
                const respuesta = participante.respuestas.find((item) => item.preguntaId === pregunta.id && item.aceptada);
                if (!respuesta) {
                    participante.respuestas.push({
                        preguntaId: pregunta.id,
                        valor: null,
                        aceptada: false,
                        tardia: false,
                        puntos: 0,
                    });
                    continue;
                }
                if (respuesta.puntos > 0)
                    continue;
                if (acierto(pregunta, respuesta)) {
                    respuesta.puntos = 1;
                    participante.puntaje += 1;
                    participante.aciertos += 1;
                }
                else {
                    respuesta.puntos = 0;
                }
            }
            sala.estado = 'cerrada';
            sala.cierraEn = null;
            guardarSalas(almacen, estado);
            publicar(sala.codigo, sala);
            return sala;
        },
        async avanzar(token, codigo) {
            exigirConexion();
            const perfil = await exigirPerfil(autenticacion, token);
            const estado = leerSalas(almacen);
            const sala = exigirSala(estado, codigo);
            if (sala.anfitrionId !== perfil.id) {
                throw new ErrorServicio('permiso', 'Solo el anfitrión puede avanzar la partida.');
            }
            if (sala.estado !== 'cerrada') {
                throw new ErrorServicio('estado', 'Cierra la pregunta antes de avanzar.');
            }
            if (sala.preguntaActual + 1 >= sala.preguntas.length) {
                sala.estado = 'finalizada';
                const resumen = normalizarYValidarResultado({
                    codigo: sala.codigo,
                    cuestionarioId: sala.cuestionarioId,
                    titulo: sala.titulo,
                    modo: sala.modo ?? 'en-vivo',
                    finalizadaEn: new Date().toISOString(),
                    anfitrionId: sala.anfitrionId,
                    participantes: sala.participantes.map((item) => ({ ...item, respuestas: [...item.respuestas] })),
                });
                const resultados = leerResultados(almacen).filter((item) => item.codigo !== sala.codigo);
                resultados.unshift(resumen);
                guardarResultados(almacen, resultados);
            }
            else {
                sala.preguntaActual += 1;
                sala.estado = 'pregunta';
                sala.cierraEn = new Date(Date.now() + sala.segundos * 1000).toISOString();
            }
            guardarSalas(almacen, estado);
            publicar(sala.codigo, sala);
            return sala;
        },
        async guardarPartida(token, entrada) {
            exigirConexion();
            const perfil = await exigirPerfil(autenticacion, token);
            const cuestionario = await actividades.obtener(entrada.cuestionarioId);
            const existentes = leerResultados(almacen);
            const codigoSolicitado = entrada.codigo?.trim().toUpperCase().slice(0, 6);
            if (codigoSolicitado) {
                const previo = existentes.find((item) => item.codigo === codigoSolicitado);
                if (previo) {
                    const pertenece = previo.anfitrionId === perfil.id ||
                        previo.participantes.some((p) => p.perfilId === perfil.id);
                    if (!pertenece) {
                        throw new ErrorServicio('estado', 'Ya existe una partida registrada con ese código.');
                    }
                    return normalizarYValidarResultado(previo);
                }
            }
            let validado;
            try {
                validado = validarEntradaPartida(cuestionario, entrada);
            }
            catch (err) {
                throw new ErrorServicio('validacion', err instanceof Error ? err.message : 'Resultados inválidos.');
            }
            const estado = leerSalas(almacen);
            const codigo = codigoSolicitado && /^[A-Z0-9]{6}$/.test(codigoSolicitado)
                ? codigoSolicitado
                : codigoNuevo(estado.salas, existentes);
            const resumen = normalizarYValidarResultado({
                codigo,
                cuestionarioId: cuestionario.id,
                titulo: cuestionario.titulo,
                modo: entrada.modo ?? cuestionario.modo ?? 'practica',
                finalizadaEn: new Date().toISOString(),
                anfitrionId: perfil.id,
                participantes: [
                    {
                        id: crypto.randomUUID(),
                        perfilId: perfil.id,
                        nombre: perfil.nombre,
                        conectado: true,
                        puntaje: validado.puntaje,
                        aciertos: validado.aciertos,
                        respuestas: validado.respuestas,
                    },
                ],
            });
            existentes.unshift(resumen);
            guardarResultados(almacen, existentes);
            return resumen;
        },
        async historial(token) {
            exigirConexion();
            const perfil = await exigirPerfil(autenticacion, token);
            const idsEquivalentes = new Set(perfil.id === 'perfil-demo' || perfil.id === 'perfil-demo-docente'
                ? ['perfil-demo', 'perfil-demo-docente']
                : [perfil.id]);
            return deduplicarResultados(leerResultados(almacen)).filter((resultado) => idsEquivalentes.has(resultado.anfitrionId) ||
                resultado.participantes.some((participante) => idsEquivalentes.has(participante.perfilId)));
        },
        async progreso(token) {
            exigirConexion();
            const perfil = await exigirPerfil(autenticacion, token);
            const resultados = leerResultados(almacen);
            const cuestionarios = await actividades.listar();
            return calcularProgresoLocal(perfil.id, perfil.nombre, resultados, cuestionarios);
        },
        async obtenerResultado(token, codigo) {
            exigirConexion();
            await exigirPerfil(autenticacion, token);
            const resultado = leerResultados(almacen).find((item) => item.codigo === codigo.toUpperCase());
            if (!resultado)
                throw new ErrorServicio('no-encontrado', 'Esta sesión todavía no tiene resultados guardados.');
            return normalizarYValidarResultado(resultado);
        },
    };
}
async function mensaje(respuesta) {
    try {
        const cuerpo = (await respuesta.json());
        return cuerpo.mensaje ?? 'La API de sesiones rechazó la solicitud.';
    }
    catch {
        return 'La API de sesiones no respondió correctamente.';
    }
}
export function crearSalaHttp(baseUrl, canalUrl) {
    const raiz = baseUrl.replace(/\/$/, '');
    let conexion = 'conectado';
    let pausado = false;
    let reabrir = null;
    const autorizacion = (token) => ({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    });
    async function enviar(token, ruta, metodo, cuerpo) {
        if (pausado) {
            throw new ErrorServicio('conexion', 'No hay conexión con la sala.');
        }
        const respuesta = await fetch(`${raiz}${ruta}`, {
            method: metodo,
            headers: autorizacion(token),
            body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        });
        if (respuesta.status === 403)
            throw new ErrorServicio('permiso', await mensaje(respuesta));
        if (respuesta.status === 404)
            throw new ErrorServicio('no-encontrado', await mensaje(respuesta));
        if (respuesta.status === 409)
            throw new ErrorServicio('tarde', await mensaje(respuesta));
        if (!respuesta.ok)
            throw new ErrorServicio('conexion', await mensaje(respuesta));
        return (await respuesta.json());
    }
    return {
        canal: 'remoto',
        estadoConexion: () => conexion,
        desconectar() {
            pausado = true;
            conexion = 'desconectado';
        },
        reconectar() {
            pausado = false;
            conexion = 'conectado';
            reabrir?.();
        },
        crear: (token, cuestionarioId) => enviar(token, '/sesiones-juego', 'POST', { cuestionarioId }),
        unirse: (token, codigo, ficha) => enviar(token, `/sesiones-juego/${codigo}/participantes`, 'POST', {
            nombre: ficha?.nombre,
            avatarId: ficha?.avatarId,
        }),
        obtener: (token, codigo) => enviar(token, `/sesiones-juego/${codigo}`, 'GET'),
        iniciar: (token, codigo) => enviar(token, `/sesiones-juego/${codigo}/iniciar`, 'POST', {}),
        responder: (token, codigo, valor) => enviar(token, `/sesiones-juego/${codigo}/respuestas`, 'POST', {
            valor: typeof valor === 'boolean' ? valor : null,
            opcionId: typeof valor === 'string' ? valor : undefined,
        }),
        cerrarPregunta: (token, codigo) => enviar(token, `/sesiones-juego/${codigo}/cerrar`, 'POST', {}),
        avanzar: (token, codigo) => enviar(token, `/sesiones-juego/${codigo}/avanzar`, 'POST', {}),
        async guardarPartida(token, entrada) {
            const respuesta = await fetch(`${raiz}/resultados/partidas`, {
                method: 'POST',
                headers: autorizacion(token),
                body: JSON.stringify(entrada),
            });
            if (respuesta.status === 400)
                throw new ErrorServicio('validacion', await mensaje(respuesta));
            if (respuesta.status === 404)
                throw new ErrorServicio('no-encontrado', await mensaje(respuesta));
            if (respuesta.status === 409)
                throw new ErrorServicio('estado', await mensaje(respuesta));
            if (!respuesta.ok)
                throw new ErrorServicio('conexion', await mensaje(respuesta));
            return normalizarYValidarResultado((await respuesta.json()));
        },
        async historial(token) {
            const respuesta = await fetch(`${raiz}/resultados`, { headers: { Authorization: `Bearer ${token}` } });
            if (!respuesta.ok)
                throw new ErrorServicio('conexion', await mensaje(respuesta));
            return deduplicarResultados((await respuesta.json()));
        },
        async progreso(token) {
            const respuesta = await fetch(`${raiz}/resultados/progreso`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!respuesta.ok)
                throw new ErrorServicio('conexion', await mensaje(respuesta));
            return (await respuesta.json());
        },
        async obtenerResultado(token, codigo) {
            const respuesta = await fetch(`${raiz}/resultados/${codigo}`, { headers: { Authorization: `Bearer ${token}` } });
            if (respuesta.status === 404)
                throw new ErrorServicio('no-encontrado', 'Esta sesión todavía no tiene resultados guardados.');
            if (!respuesta.ok)
                throw new ErrorServicio('conexion', await mensaje(respuesta));
            return normalizarYValidarResultado((await respuesta.json()));
        },
        suscribir(codigo, token, alCambiar, alConexion) {
            if (typeof WebSocket === 'undefined' || !canalUrl)
                return () => undefined;
            let cerrado = false;
            let socket = null;
            let espera;
            let intento = 0;
            const avisar = (estado) => {
                conexion = estado;
                alConexion?.(estado);
            };
            const abrir = () => {
                if (cerrado)
                    return;
                if (espera !== undefined) {
                    window.clearTimeout(espera);
                    espera = undefined;
                }
                if (socket) {
                    socket.onclose = null;
                    socket.close();
                }
                const actual = new WebSocket(`${canalUrl}?codigo=${encodeURIComponent(codigo)}`, ['profelink', `profelink-bearer.${token}`]);
                socket = actual;
                actual.onopen = () => {
                    if (socket !== actual)
                        return;
                    intento = 0;
                    avisar('conectado');
                    void enviar(token, `/sesiones-juego/${encodeURIComponent(codigo)}`, 'GET')
                        .then((sala) => {
                        if (socket === actual)
                            alCambiar(sala);
                    })
                        .catch(() => undefined);
                };
                actual.onerror = () => {
                    if (socket === actual)
                        avisar('error');
                };
                actual.onclose = () => {
                    if (cerrado || socket !== actual)
                        return;
                    avisar('desconectado');
                    const pausa = Math.min(4000, 300 * 2 ** intento);
                    intento += 1;
                    espera = window.setTimeout(abrir, pausa);
                };
                actual.onmessage = (evento) => {
                    if (socket !== actual)
                        return;
                    const datos = JSON.parse(String(evento.data));
                    if (datos.sala?.codigo === codigo) {
                        avisar('conectado');
                        alCambiar(datos.sala);
                    }
                };
            };
            const forzar = () => {
                intento = 0;
                abrir();
            };
            reabrir = forzar;
            abrir();
            return () => {
                cerrado = true;
                if (reabrir === forzar)
                    reabrir = null;
                if (espera !== undefined)
                    window.clearTimeout(espera);
                if (socket) {
                    socket.onclose = null;
                    socket.close();
                }
            };
        },
    };
}
