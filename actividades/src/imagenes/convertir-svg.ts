import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { LIMITE_IMAGEN_BYTES, MENSAJE_TAMANO_IMAGEN } from './limites';
import { MENSAJE_SVG, prepararSvg, redimensionar } from './validar-svg';

const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type RenderizadorSvg = (
  svg: string,
  ancho: number,
  alto: number,
) => Promise<Buffer>;

export async function convertirSvg(
  contenido: string,
  renderizar: RenderizadorSvg = renderizarConSharp,
): Promise<Buffer> {
  const preparado = prepararSvg(contenido);
  let ancho = preparado.ancho;
  let alto = preparado.alto;
  let png = await intentar(
    renderizar,
    redimensionar(preparado, ancho, alto),
    ancho,
    alto,
  );
  for (let paso = 0; paso < 2 && png.length > LIMITE_IMAGEN_BYTES; paso += 1) {
    ancho = Math.max(1, Math.floor(ancho / 2));
    alto = Math.max(1, Math.floor(alto / 2));
    png = await intentar(
      renderizar,
      redimensionar(preparado, ancho, alto),
      ancho,
      alto,
    );
  }
  if (png.length > LIMITE_IMAGEN_BYTES) {
    throw new BadRequestException({ mensaje: MENSAJE_TAMANO_IMAGEN });
  }
  if (!png.subarray(0, 8).equals(FIRMA_PNG)) {
    throw new BadRequestException({ mensaje: MENSAJE_SVG });
  }
  return png;
}

async function intentar(
  renderizar: RenderizadorSvg,
  svg: string,
  ancho: number,
  alto: number,
): Promise<Buffer> {
  try {
    return await renderizar(svg, ancho, alto);
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException({ mensaje: MENSAJE_SVG });
  }
}

export function renderizarConSharp(
  svg: string,
  ancho: number,
  alto: number,
): Promise<Buffer> {
  return sharp(Buffer.from(svg), {
    unlimited: false,
    limitInputPixels: 2048 * 2048,
    density: 72,
    sequentialRead: true,
    animated: false,
  })
    .resize(ancho, alto, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
}
