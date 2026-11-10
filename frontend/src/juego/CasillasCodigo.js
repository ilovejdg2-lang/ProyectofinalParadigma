import { jsx as _jsx } from "react/jsx-runtime";
import { useRef } from 'react';
const LONGITUD = 6;
export function CasillasCodigo({ valor, onChange, disabled, }) {
    const refs = useRef([]);
    const letras = Array.from({ length: LONGITUD }, (_, indice) => valor[indice] ?? '');
    function escribir(indice, texto) {
        const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!limpio) {
            const siguiente = letras.map((letra, posicion) => (posicion === indice ? '' : letra)).join('');
            onChange(siguiente.replace(/\s/g, ''));
            return;
        }
        const chars = limpio.slice(0, LONGITUD - indice).split('');
        const copia = [...letras];
        chars.forEach((letra, desplazamiento) => {
            copia[indice + desplazamiento] = letra;
        });
        onChange(copia.join('').replace(/\s/g, ''));
        const foco = Math.min(indice + chars.length, LONGITUD - 1);
        refs.current[foco]?.focus();
    }
    return (_jsx("div", { className: "casillas-codigo", role: "group", "aria-label": "C\u00F3digo de la sala", children: letras.map((letra, indice) => (_jsx("input", { ref: (nodo) => {
                refs.current[indice] = nodo;
            }, className: "casilla-codigo", inputMode: "text", autoCapitalize: "characters", autoComplete: "off", maxLength: LONGITUD, "aria-label": `Letra ${indice + 1}`, value: letra, disabled: disabled, onChange: (evento) => escribir(indice, evento.target.value), onKeyDown: (evento) => {
                if (evento.key === 'Backspace' && !letra && indice > 0) {
                    refs.current[indice - 1]?.focus();
                }
            }, onPaste: (evento) => {
                evento.preventDefault();
                escribir(indice, evento.clipboardData.getData('text'));
            } }, indice))) }));
}
export const LONGITUD_CODIGO = LONGITUD;
