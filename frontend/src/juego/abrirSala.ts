export function prepararPestanaSala(): Window | null {
  const ventana = window.open('about:blank', '_blank')
  if (!ventana) return null
  try {
    ventana.document.title = 'ProfeLink'
    ventana.document.body.innerHTML =
      '<p style="margin:0;padding:32px;background:#050B18;color:#F8FAFC;font-family:Segoe UI,sans-serif;min-height:100vh">Preparando la sala…</p>'
  } catch {
    /* La pestaña sigue abierta; la navegación ocurre al publicar. */
  }
  return ventana
}

export function publicarSala(ventana: Window | null, codigo: string) {
  const url = `${window.location.origin}/sala/${codigo}`
  if (!ventana) return { url, abierta: false }
  try {
    if (ventana.closed) return { url, abierta: false }
    ventana.location.replace(url)
    ventana.opener = null
    return { url, abierta: true }
  } catch {
    return { url, abierta: false }
  }
}
