# Audio y efectos audiovisuales — licencias

ProfeLink genera toda la música y los efectos de sonido de partida de forma
**procedural** con la Web Audio API (osciladores, ruido filtrado y envolventes).

## Origen

| Recurso | Origen | Licencia |
| --- | --- | --- |
| Música de lobby (`espera`) | Sintetizada en `audio.ts` | Original · ProfeLink |
| Música de pregunta (`suspenso`) ~136 BPM | Sintetizada en `audio.ts` | Original · ProfeLink |
| Música de victoria (`victoria`) | Sintetizada en `audio.ts` | Original · ProfeLink |
| Beeps de cuenta regresiva, clicks, acierto, error, whoosh, fanfarria y podio | Sintetizados en `audio.ts` | Original · ProfeLink |
| Confeti canvas | Implementación propia en `Confeti.tsx` | Original · ProfeLink |

No se incluyen muestras de Kahoot, Blooket ni ningún otro juego con copyright.
No hay dependencias de CDN de audio externas.

## Preferencias

Las preferencias de volumen/silencio se guardan en `localStorage` bajo la clave
`profelink.audio` (música y efectos por separado).
