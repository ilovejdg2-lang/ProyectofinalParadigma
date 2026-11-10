import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { toString as qrATexto } from 'qrcode';
export function enlaceDePartida(codigo, origen = window.location.origin) {
    return `${origen.replace(/\/$/, '')}/partida/${encodeURIComponent(codigo)}`;
}
export function codigoDeInvitacion(ruta) {
    return /^\/partida\/([A-Za-z0-9]{4,12})$/.exec(ruta)?.[1] ?? null;
}
export function CodigoQr({ valor, etiqueta }) {
    const [svg, setSvg] = useState('');
    const [fallo, setFallo] = useState(false);
    useEffect(() => {
        let vivo = true;
        setFallo(false);
        setSvg('');
        void qrATexto(valor, {
            type: 'svg',
            margin: 1,
            width: 148,
            errorCorrectionLevel: 'M',
            color: { dark: '#102033', light: '#ffffff' },
        })
            .then((markup) => {
            if (!vivo)
                return;
            setSvg(markup.replace(/<\?xml[^>]*>/, '').trim());
        })
            .catch(() => {
            if (vivo)
                setFallo(true);
        });
        return () => {
            vivo = false;
        };
    }, [valor]);
    return (_jsxs("figure", { className: "sala-qr", "data-testid": "codigo-qr", "data-enlace": valor, children: [_jsx("div", { className: "sala-qr-imagen", role: "img", "aria-label": etiqueta, children: fallo ? _jsx("p", { children: "No se pudo crear el QR." }) : _jsx("span", { dangerouslySetInnerHTML: { __html: svg } }) }), _jsx("figcaption", { children: "Escanea para entrar" })] }));
}
