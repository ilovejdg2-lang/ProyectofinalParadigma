import { BadRequestException } from '@nestjs/common';
import { convertirSvg } from './convertir-svg';
import { LIMITE_IMAGEN_BYTES } from './limites';
import { MENSAJE_DIMENSIONES, MENSAJE_SVG } from './validar-svg';

const base = (interior: string, atributos = 'width="20" height="10"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${atributos}>${interior}</svg>`;

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function mensaje(xml: string): Promise<string> {
  const rechazo = convertirSvg(xml);
  await expect(rechazo).rejects.toBeInstanceOf(BadRequestException);
  const error = await rechazo.catch((valor: unknown) => valor);
  if (!(error instanceof BadRequestException)) return '';
  const cuerpo = error.getResponse();
  return typeof cuerpo === 'object' && cuerpo && 'mensaje' in cuerpo
    ? String(cuerpo.mensaje)
    : '';
}

describe('Conversión segura de SVG', () => {
  it('rechaza XML malformado, scripts, eventos y foreignObject', async () => {
    expect(
      await mensaje(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect></svg>',
      ),
    ).toBe(MENSAJE_SVG);
    expect(await mensaje(base('<script>alert(1)</script>'))).toBe(MENSAJE_SVG);
    expect(
      await mensaje(base('<rect width="10" height="10" onclick="alert(1)"/>')),
    ).toBe(MENSAJE_SVG);
    expect(
      await mensaje(
        base(
          '<foreignObject width="10" height="10"><p>hola</p></foreignObject>',
        ),
      ),
    ).toBe(MENSAJE_SVG);
  });

  it('rechaza DOCTYPE, entidades y referencias externas o locales', async () => {
    expect(
      await mensaje(
        '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text>&xxe;</text></svg>',
      ),
    ).toBe(MENSAJE_SVG);
    expect(
      await mensaje(
        base(
          '<image href="https://ejemplo.test/a.png" width="10" height="10"/>',
        ),
      ),
    ).toBe(MENSAJE_SVG);
    expect(await mensaje(base('<use href="file:///tmp/icono.svg"/>'))).toBe(
      MENSAJE_SVG,
    );
    expect(
      await mensaje(
        base(
          '<rect width="10" height="10" fill="url(http://ejemplo.test/a.png)"/>',
        ),
      ),
    ).toBe(MENSAJE_SVG);
    expect(
      await mensaje(
        base('<style>rect { fill: url(https://ejemplo.test/a.css); }</style>'),
      ),
    ).toBe(MENSAJE_SVG);
    expect(
      await mensaje(
        base(
          '<rect width="10" height="10" style="fill:expression(alert(1))"/>',
        ),
      ),
    ).toBe(MENSAJE_SVG);
  });

  it('rechaza dimensiones excesivas y un PNG que sigue superando 5 MB', async () => {
    expect(await mensaje(base('', 'width="9000" height="9000"'))).toBe(
      MENSAJE_DIMENSIONES,
    );
    await expect(
      convertirSvg(base('<rect width="20" height="10" fill="#fff"/>'), () =>
        Promise.resolve(Buffer.alloc(LIMITE_IMAGEN_BYTES + 1)),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reduce el PNG cuando el primer render supera el límite y oculta fallos de Sharp', async () => {
    let llamadas = 0;
    const reducido = await convertirSvg(
      base('<rect width="20" height="10" fill="#fff"/>'),
      () => {
        llamadas += 1;
        return Promise.resolve(
          llamadas === 1 ? Buffer.alloc(LIMITE_IMAGEN_BYTES + 1) : png,
        );
      },
    );
    expect(reducido.subarray(0, 8)).toEqual(png.subarray(0, 8));
    expect(llamadas).toBe(2);

    const fallo = convertirSvg(
      base('<rect width="20" height="10" fill="#fff"/>'),
      () => Promise.reject(new Error('vips exploded')),
    );
    await expect(fallo).rejects.toBeInstanceOf(BadRequestException);
    const error = await fallo.catch((valor: unknown) => valor);
    expect(error).toBeInstanceOf(BadRequestException);
    if (error instanceof BadRequestException) {
      expect(error.getResponse()).toEqual({ mensaje: MENSAJE_SVG });
    }
  });
});
