import { useEffect, useState } from 'react'
import { toString as qrATexto } from 'qrcode'

const PLATAFORMA = 'https://profelink.sinkro.dev'

export function enlaceDePartida(codigo: string) {
  const consulta = new URLSearchParams({ partida: codigo })
  return `${PLATAFORMA}/iniciar-sesion?${consulta}`
}

export function codigoDeInvitacion(ruta: string) {
  return /^\/partida\/([A-Za-z0-9]{4,12})$/.exec(ruta)?.[1] ?? null
}

export function CodigoQr({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  const [svg, setSvg] = useState('')
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    let vivo = true
    setFallo(false)
    setSvg('')
    void qrATexto(valor, {
      type: 'svg',
      margin: 1,
      width: 148,
      errorCorrectionLevel: 'M',
      color: { dark: '#102033', light: '#ffffff' },
    })
      .then((markup) => {
        if (!vivo) return
        setSvg(markup.replace(/<\?xml[^>]*>/, '').trim())
      })
      .catch(() => {
        if (vivo) setFallo(true)
      })
    return () => {
      vivo = false
    }
  }, [valor])

  return (
    <figure className="sala-qr" data-testid="codigo-qr" data-enlace={valor}>
      <div className="sala-qr-imagen" role="img" aria-label={etiqueta}>
        {fallo ? <p>No se pudo crear el QR.</p> : <span dangerouslySetInnerHTML={{ __html: svg }} />}
      </div>
      <figcaption>Escanea para entrar</figcaption>
    </figure>
  )
}
