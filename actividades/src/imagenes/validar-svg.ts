import { BadRequestException } from '@nestjs/common';
import { SaxesParser } from 'saxes';

export const MENSAJE_SVG = 'El SVG no es válido o no se puede usar.';
export const MENSAJE_DIMENSIONES = 'La imagen tiene dimensiones excesivas.';
export const LADO_MAXIMO = 2048;
const LADO_DURO = 8192;
const MAXIMO_ELEMENTOS = 2000;
const MAXIMA_PROFUNDIDAD = 32;

export interface SvgPreparado {
  svg: string;
  ancho: number;
  alto: number;
}

interface ParteTexto {
  texto: string;
}

interface Nodo {
  nombre: string;
  atributos: Record<string, string>;
  partes: Array<ParteTexto | { nodo: Nodo }>;
}

const PRESENTACION = [
  'transform',
  'opacity',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'clip-path',
  'clip-rule',
  'mask',
  'display',
  'visibility',
  'color',
] as const;

const ELEMENTOS: Record<string, readonly string[]> = {
  svg: [
    'xmlns',
    'width',
    'height',
    'viewBox',
    'preserveAspectRatio',
    ...PRESENTACION,
  ],
  g: [...PRESENTACION],
  defs: [],
  title: [],
  desc: [],
  path: ['d', ...PRESENTACION],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry', ...PRESENTACION],
  circle: ['cx', 'cy', 'r', ...PRESENTACION],
  ellipse: ['cx', 'cy', 'rx', 'ry', ...PRESENTACION],
  line: ['x1', 'y1', 'x2', 'y2', ...PRESENTACION],
  polyline: ['points', ...PRESENTACION],
  polygon: ['points', ...PRESENTACION],
  text: [
    'x',
    'y',
    'dx',
    'dy',
    'text-anchor',
    'font-size',
    'font-family',
    'font-weight',
    ...PRESENTACION,
  ],
  tspan: [
    'x',
    'y',
    'dx',
    'dy',
    'text-anchor',
    'font-size',
    'font-family',
    'font-weight',
    ...PRESENTACION,
  ],
  linearGradient: [
    'x1',
    'y1',
    'x2',
    'y2',
    'gradientUnits',
    'gradientTransform',
    'href',
    'spreadMethod',
  ],
  radialGradient: [
    'cx',
    'cy',
    'r',
    'fx',
    'fy',
    'gradientUnits',
    'gradientTransform',
    'href',
    'spreadMethod',
  ],
  stop: ['offset', 'stop-color', 'stop-opacity'],
  clipPath: ['clipPathUnits'],
  mask: ['x', 'y', 'width', 'height', 'maskUnits', 'maskContentUnits'],
  symbol: ['viewBox', 'preserveAspectRatio'],
  use: ['href', 'x', 'y', 'width', 'height', ...PRESENTACION],
};

const CON_TEXTO = new Set(['title', 'desc', 'text', 'tspan']);
const COLORES = new Set([
  'none',
  'currentcolor',
  'transparent',
  'black',
  'white',
  'red',
  'green',
  'blue',
  'gray',
  'grey',
  'silver',
  'orange',
  'yellow',
  'purple',
  'navy',
  'teal',
]);

export function prepararSvg(contenido: string): SvgPreparado {
  const nodo = analizar(contenido);
  const ids = new Map<string, Nodo>();
  validarNodo(nodo, null, ids, 0);
  validarReferencias(nodo, ids, new Set());
  const medidas = medidasDe(nodo);
  nodo.atributos.xmlns = 'http://www.w3.org/2000/svg';
  nodo.atributos.width = String(medidas.ancho);
  nodo.atributos.height = String(medidas.alto);
  if (!nodo.atributos.viewBox) {
    nodo.atributos.viewBox = `0 0 ${medidas.origenAncho} ${medidas.origenAlto}`;
  }
  return { svg: serializar(nodo), ancho: medidas.ancho, alto: medidas.alto };
}

export function redimensionar(
  preparado: SvgPreparado,
  ancho: number,
  alto: number,
): string {
  return preparado.svg.replace(
    /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="[^"]+" height="[^"]+"/,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}"`,
  );
}

function analizar(contenido: string): Nodo {
  if (/<!DOCTYPE|<!ENTITY|<!ELEMENT|<!ATTLIST|<!NOTATION/i.test(contenido)) {
    throw new BadRequestException({ mensaje: MENSAJE_SVG });
  }
  const parser = new SaxesParser({ xmlns: false });
  let raiz: Nodo | undefined;
  const pila: Nodo[] = [];
  let elementos = 0;
  const rechazar = (): never => {
    throw new BadRequestException({ mensaje: MENSAJE_SVG });
  };
  parser.on('doctype', rechazar);
  parser.on('processinginstruction', rechazar);
  parser.on('cdata', rechazar);
  parser.on('opentag', (etiqueta) => {
    elementos += 1;
    if (elementos > MAXIMO_ELEMENTOS || pila.length > MAXIMA_PROFUNDIDAD)
      rechazar();
    const atributos: Record<string, string> = {};
    for (const [nombre, valor] of Object.entries(etiqueta.attributes)) {
      if (typeof valor !== 'string') rechazar();
      atributos[nombre] = valor;
    }
    const nodo: Nodo = { nombre: etiqueta.name, atributos, partes: [] };
    const padre = pila[pila.length - 1];
    if (!padre) {
      if (raiz) rechazar();
      raiz = nodo;
    } else {
      padre.partes.push({ nodo });
    }
    pila.push(nodo);
  });
  parser.on('text', (texto) => {
    const actual = pila[pila.length - 1];
    if (!actual) {
      if (texto.trim()) rechazar();
      return;
    }
    if (!texto.trim()) return;
    if (!CON_TEXTO.has(actual.nombre)) rechazar();
    actual.partes.push({ texto });
  });
  parser.on('closetag', () => {
    pila.pop();
  });
  try {
    parser.write(contenido);
    parser.close();
  } catch {
    rechazar();
  }
  if (!raiz || raiz.nombre !== 'svg' || pila.length !== 0) {
    throw new BadRequestException({ mensaje: MENSAJE_SVG });
  }
  return raiz;
}

function validarNodo(
  nodo: Nodo,
  padre: string | null,
  ids: Map<string, Nodo>,
  profundidad: number,
): void {
  if (profundidad > MAXIMA_PROFUNDIDAD) rechazarSvg();
  const permitidos = ELEMENTOS[nodo.nombre];
  if (!permitidos) rechazarSvg();
  if (
    nodo.nombre === 'stop' &&
    padre !== 'linearGradient' &&
    padre !== 'radialGradient'
  ) {
    rechazarSvg();
  }
  const recibidos = expandirEstilo(nodo.atributos);
  for (const [nombre, valor] of Object.entries(recibidos)) {
    if (nombre === 'id') {
      if (!/^[A-Za-z_][\w:.-]{0,80}$/.test(valor) || ids.has(valor))
        rechazarSvg();
      ids.set(valor, nodo);
      continue;
    }
    if (!permitidos.includes(nombre) || !valorAceptable(nombre, valor))
      rechazarSvg();
  }
  nodo.atributos = recibidos;
  for (const parte of nodo.partes) {
    if ('texto' in parte) {
      if (parte.texto.length > 2000 || tieneControl(parte.texto)) {
        rechazarSvg();
      }
      continue;
    }
    validarNodo(parte.nodo, nodo.nombre, ids, profundidad + 1);
  }
}

function validarReferencias(
  nodo: Nodo,
  ids: Map<string, Nodo>,
  pila: Set<Nodo>,
): void {
  if (pila.has(nodo) || pila.size > 20) rechazarSvg();
  pila.add(nodo);
  for (const [nombre, valor] of Object.entries(nodo.atributos)) {
    const referencia = referenciaDe(nombre, valor);
    if (referencia && !ids.has(referencia)) rechazarSvg();
  }
  const href = nodo.atributos.href;
  if (href?.startsWith('#')) {
    const destino = ids.get(href.slice(1));
    if (!destino) rechazarSvg();
    validarReferencias(destino, ids, pila);
  }
  for (const parte of nodo.partes) {
    if ('nodo' in parte) validarReferencias(parte.nodo, ids, pila);
  }
  pila.delete(nodo);
}

function expandirEstilo(
  atributos: Record<string, string>,
): Record<string, string> {
  const estilo = atributos.style;
  const copia: Record<string, string> = {};
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (
      nombre.toLowerCase().startsWith('on') ||
      (nombre.includes(':') && nombre !== 'xlink:href')
    ) {
      rechazarSvg();
    }
    if (nombre === 'xlink:href') {
      copia.href = valor;
      continue;
    }
    if (nombre !== 'style') copia[nombre] = valor;
  }
  if (estilo === undefined) return copia;
  if (estilo.length > 500 || contienePeligro(estilo)) rechazarSvg();
  for (const declaracion of estilo.split(';')) {
    const limpia = declaracion.trim();
    if (!limpia) continue;
    const separador = limpia.indexOf(':');
    if (separador <= 0) rechazarSvg();
    const propiedad = limpia.slice(0, separador).trim().toLowerCase();
    const valor = limpia.slice(separador + 1).trim();
    if (!PRESENTACION.includes(propiedad as (typeof PRESENTACION)[number]))
      rechazarSvg();
    if (copia[propiedad] && copia[propiedad] !== valor) rechazarSvg();
    copia[propiedad] = valor;
  }
  return copia;
}

function valorAceptable(nombre: string, valor: string): boolean {
  if (nombre === 'xmlns') return valor === 'http://www.w3.org/2000/svg';
  if (valor.length > 100_000 || contienePeligro(valor)) return false;
  if (nombre === 'href') return /^#[A-Za-z_][\w:.-]{0,80}$/.test(valor);
  if (nombre === 'd')
    return (
      /^[MmZzLlHhVvCcSsQqTtAa0-9eE+\-.,\s]+$/.test(valor) &&
      numerosAcotados(valor)
    );
  if (nombre === 'points')
    return /^[\d\s,eE.+-]+$/.test(valor) && numerosAcotados(valor);
  if (nombre === 'viewBox') return viewBoxValido(valor);
  if (nombre === 'preserveAspectRatio') {
    return /^(?:none|(?:xMin|xMid|xMax)Y(?:Min|Mid|Max)(?:\s+(?:meet|slice))?)$/.test(
      valor,
    );
  }
  if (nombre === 'transform' || nombre === 'gradientTransform')
    return transformValido(valor);
  if (
    nombre === 'fill' ||
    nombre === 'stroke' ||
    nombre === 'color' ||
    nombre === 'stop-color'
  ) {
    return colorValido(valor);
  }
  if (nombre === 'clip-path' || nombre === 'mask')
    return valor === 'none' || referenciaLocal(valor);
  if (nombre === 'display')
    return valor === 'none' || valor === 'inline' || valor === 'block';
  if (nombre === 'visibility') return valor === 'visible' || valor === 'hidden';
  if (nombre === 'fill-rule' || nombre === 'clip-rule')
    return valor === 'nonzero' || valor === 'evenodd';
  if (nombre === 'stroke-linecap')
    return valor === 'butt' || valor === 'round' || valor === 'square';
  if (nombre === 'stroke-linejoin')
    return valor === 'miter' || valor === 'round' || valor === 'bevel';
  if (nombre === 'text-anchor')
    return valor === 'start' || valor === 'middle' || valor === 'end';
  if (nombre === 'font-weight') return /^(?:normal|bold|[1-9]00)$/.test(valor);
  if (nombre === 'font-family') return /^[A-Za-z0-9 ,.'"-]{1,80}$/.test(valor);
  if (nombre === 'font-size') return longitudPx(valor, 512);
  if (
    nombre === 'gradientUnits' ||
    nombre === 'clipPathUnits' ||
    nombre === 'maskUnits' ||
    nombre === 'maskContentUnits'
  ) {
    return valor === 'userSpaceOnUse' || valor === 'objectBoundingBox';
  }
  if (nombre === 'spreadMethod')
    return valor === 'pad' || valor === 'reflect' || valor === 'repeat';
  if (nombre === 'offset') return /^(?:0|1|0?\.\d{1,4}|\d{1,3}%)$/.test(valor);
  if (nombre === 'id') return true;
  return longitudPx(valor, 1_000_000) || numeroAcotado(valor);
}

function contienePeligro(valor: string): boolean {
  const sinReferenciaLocal = valor.replace(
    /url\(\s*#[A-Za-z_][\w:.-]*\s*\)/gi,
    '',
  );
  return /url\s*\(|javascript:|data:|https?:|file:|ftp:|blob:|expression\s*\(|@import|-moz-binding|\/\/|<|>|\\/i.test(
    sinReferenciaLocal,
  );
}

function colorValido(valor: string): boolean {
  if (COLORES.has(valor.toLowerCase()) || referenciaLocal(valor)) return true;
  if (/^#[0-9a-fA-F]{3,8}$/.test(valor)) return true;
  const rgb =
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/.exec(
      valor,
    );
  if (!rgb) return false;
  return [rgb[1], rgb[2], rgb[3]].every((canal) => Number(canal) <= 255);
}

function referenciaDe(nombre: string, valor: string): string | undefined {
  if (nombre === 'href' && valor.startsWith('#')) return valor.slice(1);
  const local = /^url\(\s*#([A-Za-z_][\w:.-]*)\s*\)$/.exec(valor);
  return local?.[1];
}

function viewBoxValido(valor: string): boolean {
  const partes = valor.trim().split(/[\s,]+/);
  if (partes.length !== 4 || !partes.every(numeroAcotado)) return false;
  return (
    Number(partes[2]) > 0 &&
    Number(partes[3]) > 0 &&
    Number(partes[2]) <= LADO_DURO &&
    Number(partes[3]) <= LADO_DURO
  );
}

function transformValido(valor: string): boolean {
  const funciones = valor.trim().split(/\)\s*/).filter(Boolean);
  if (funciones.length === 0 || funciones.length > 8) return false;
  return funciones.every((funcion) => {
    const coincidencia =
      /^(matrix|translate|scale|rotate|skewX|skewY)\(\s*([^)]*)$/.exec(
        funcion.trim(),
      );
    if (!coincidencia) return false;
    const numeros = coincidencia[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean);
    const limite = coincidencia[1] === 'matrix' ? 6 : 3;
    return (
      numeros.length >= 1 &&
      numeros.length <= limite &&
      numeros.every(numeroAcotado)
    );
  });
}

function numerosAcotados(valor: string): boolean {
  const numeros = valor.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi) ?? [];
  return numeros.every(numeroAcotado);
}

function numeroAcotado(valor: string): boolean {
  if (!/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(valor)) return false;
  const numero = Number(valor);
  return Number.isFinite(numero) && Math.abs(numero) <= 1_000_000;
}

function longitudPx(valor: string, maximo: number): boolean {
  const coincidencia = /^(\d+(?:\.\d+)?)(px)?$/.exec(valor.trim());
  if (!coincidencia) return false;
  const numero = Number(coincidencia[1]);
  return numero >= 0 && numero <= maximo;
}

function medidasDe(nodo: Nodo): {
  ancho: number;
  alto: number;
  origenAncho: number;
  origenAlto: number;
} {
  const anchoAtributo = dimension(nodo.atributos.width);
  const altoAtributo = dimension(nodo.atributos.height);
  const caja = cajaDe(nodo.atributos.viewBox);
  let ancho = anchoAtributo ?? caja?.ancho;
  let alto = altoAtributo ?? caja?.alto;
  if ((ancho === undefined || alto === undefined) && caja && anchoAtributo) {
    ancho = anchoAtributo;
    alto = (anchoAtributo * caja.alto) / caja.ancho;
  }
  if ((ancho === undefined || alto === undefined) && caja && altoAtributo) {
    alto = altoAtributo;
    ancho = (altoAtributo * caja.ancho) / caja.alto;
  }
  if (ancho === undefined || alto === undefined || ancho <= 0 || alto <= 0)
    rechazarSvg();
  if (ancho > LADO_DURO || alto > LADO_DURO) {
    throw new BadRequestException({ mensaje: MENSAJE_DIMENSIONES });
  }
  const origenAncho = ancho;
  const origenAlto = alto;
  if (ancho > LADO_MAXIMO || alto > LADO_MAXIMO) {
    const escala = Math.min(LADO_MAXIMO / ancho, LADO_MAXIMO / alto);
    ancho = Math.max(1, Math.floor(ancho * escala));
    alto = Math.max(1, Math.floor(alto * escala));
  } else {
    ancho = Math.max(1, Math.round(ancho));
    alto = Math.max(1, Math.round(alto));
  }
  return { ancho, alto, origenAncho, origenAlto };
}

function dimension(valor: string | undefined): number | undefined {
  if (!valor) return undefined;
  if (!/^(\d+(?:\.\d+)?)(px)?$/.test(valor.trim())) rechazarSvg();
  return Number.parseFloat(valor);
}

function cajaDe(
  valor: string | undefined,
): { ancho: number; alto: number } | undefined {
  if (!valor || !viewBoxValido(valor)) return undefined;
  const partes = valor
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return { ancho: partes[2], alto: partes[3] };
}

function referenciaLocal(valor: string): boolean {
  return /^url\(\s*#[A-Za-z_][\w:.-]{0,80}\s*\)$/.test(valor);
}

function serializar(nodo: Nodo): string {
  const atributos = entradas(nodo)
    .map(([nombre, valor]) => `${nombre}="${escapar(valor)}"`)
    .join(' ');
  const apertura = atributos
    ? `<${nodo.nombre} ${atributos}`
    : `<${nodo.nombre}`;
  if (nodo.partes.length === 0) return `${apertura}/>`;
  const interior = nodo.partes
    .map((parte) =>
      'texto' in parte ? escapar(parte.texto) : serializar(parte.nodo),
    )
    .join('');
  return `${apertura}>${interior}</${nodo.nombre}>`;
}

function entradas(nodo: Nodo): [string, string][] {
  if (nodo.nombre !== 'svg') return Object.entries(nodo.atributos);
  const primero = ['xmlns', 'width', 'height', 'viewBox'];
  const usadas = new Set(primero);
  return [
    ...primero
      .filter((nombre) => nodo.atributos[nombre] !== undefined)
      .map((nombre) => [nombre, nodo.atributos[nombre]] as [string, string]),
    ...Object.entries(nodo.atributos).filter(([nombre]) => !usadas.has(nombre)),
  ];
}

function escapar(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function tieneControl(texto: string): boolean {
  for (const caracter of texto) {
    const codigo = caracter.charCodeAt(0);
    if (codigo < 32 && codigo !== 9 && codigo !== 10 && codigo !== 13)
      return true;
  }
  return false;
}

function rechazarSvg(): never {
  throw new BadRequestException({ mensaje: MENSAJE_SVG });
}
