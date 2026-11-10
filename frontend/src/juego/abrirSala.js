export function prepararPestanaSala() {
    const ventana = window.open('about:blank', '_blank');
    if (!ventana)
        return null;
    try {
        ventana.opener = null;
    }
    catch {
        /* El navegador puede impedir limpiar opener. */
    }
    ventana.document.title = 'ProfeLink';
    ventana.document.body.innerHTML =
        '<p style="margin:0;padding:32px;background:#050B18;color:#F8FAFC;font-family:Segoe UI,sans-serif;min-height:100vh">Preparando la sala…</p>';
    return ventana;
}
export function publicarSala(ventana, codigo) {
    const url = `${window.location.origin}/sala/${codigo}`;
    if (ventana && !ventana.closed) {
        ventana.location.replace(url);
        return { url, abierta: true };
    }
    return { url, abierta: false };
}
