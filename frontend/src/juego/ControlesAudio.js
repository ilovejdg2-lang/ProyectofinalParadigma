import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { audio } from './audio.ts';
export function ControlesAudio({ paisaje, tension = false }) {
    const [estado, setEstado] = useState(() => audio.snapshot());
    useEffect(() => {
        audio.instalar();
        const cancelar = audio.suscribir(() => setEstado(audio.snapshot()));
        return () => {
            cancelar();
        };
    }, []);
    useEffect(() => {
        audio.ambiente(paisaje, tension);
    }, [paisaje, tension]);
    useEffect(() => () => audio.ambiente('silencio', false), []);
    return (_jsxs("div", { className: "audio-controles", "data-testid": "audio-estado", "data-paisaje": estado.paisaje, "data-contexto": estado.contexto, "data-silenciado": estado.silenciado ? 'si' : 'no', children: [_jsx("button", { className: "boton-fantasma", type: "button", "aria-pressed": estado.silenciado, onClick: () => {
                    void audio.desbloquear();
                    audio.silenciar(!estado.silenciado);
                }, children: estado.silenciado ? 'Activar música' : 'Silenciar música' }), _jsxs("label", { className: "volumen", children: ["Volumen", _jsx("input", { type: "range", min: 0, max: 100, value: Math.round(estado.volumen * 100), "aria-label": "Volumen", onChange: (evento) => {
                            void audio.desbloquear();
                            audio.volumen(Number(evento.target.value) / 100);
                        } })] })] }));
}
