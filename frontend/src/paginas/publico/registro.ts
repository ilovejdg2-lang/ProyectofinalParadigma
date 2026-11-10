export interface Pais {
  codigo: string
  nombre: string
  prefijo: string
  min: number
  max: number
}

export interface DatosRegistroLanding {
  correo: string
  nombre: string
  contrasena: string
  confirmar: string
  pais: string
  telefono: string
}

export interface RequisitoContrasena {
  id: string
  texto: string
  ok: boolean
}

interface DefinicionRequisito {
  id: string
  texto: string
  cumple: (valor: string) => boolean
}

const REQUISITOS: readonly DefinicionRequisito[] = [
  { id: 'largo', texto: 'Mínimo 8 caracteres', cumple: (valor) => valor.length >= 8 },
  { id: 'mayuscula', texto: 'Una mayúscula', cumple: (valor) => /[A-ZÁÉÍÓÚÜÑ]/.test(valor) },
  { id: 'minuscula', texto: 'Una minúscula', cumple: (valor) => /[a-záéíóúüñ]/.test(valor) },
  { id: 'numero', texto: 'Un número', cumple: (valor) => /\d/.test(valor) },
  { id: 'simbolo', texto: 'Un símbolo (!@#$%...)', cumple: (valor) => /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s]/.test(valor) },
]

const LISTA_PAISES: readonly Pais[] = [
  { codigo: 'AR', nombre: 'Argentina', prefijo: '54', min: 10, max: 10 },
  { codigo: 'AU', nombre: 'Australia', prefijo: '61', min: 9, max: 9 },
  { codigo: 'AT', nombre: 'Austria', prefijo: '43', min: 10, max: 13 },
  { codigo: 'BE', nombre: 'Bélgica', prefijo: '32', min: 8, max: 9 },
  { codigo: 'BO', nombre: 'Bolivia', prefijo: '591', min: 8, max: 8 },
  { codigo: 'BR', nombre: 'Brasil', prefijo: '55', min: 10, max: 11 },
  { codigo: 'CA', nombre: 'Canadá', prefijo: '1', min: 10, max: 10 },
  { codigo: 'CL', nombre: 'Chile', prefijo: '56', min: 9, max: 9 },
  { codigo: 'CN', nombre: 'China', prefijo: '86', min: 11, max: 11 },
  { codigo: 'CO', nombre: 'Colombia', prefijo: '57', min: 10, max: 10 },
  { codigo: 'CR', nombre: 'Costa Rica', prefijo: '506', min: 8, max: 8 },
  { codigo: 'CU', nombre: 'Cuba', prefijo: '53', min: 8, max: 8 },
  { codigo: 'DK', nombre: 'Dinamarca', prefijo: '45', min: 8, max: 8 },
  { codigo: 'EC', nombre: 'Ecuador', prefijo: '593', min: 9, max: 9 },
  { codigo: 'EG', nombre: 'Egipto', prefijo: '20', min: 10, max: 10 },
  { codigo: 'SV', nombre: 'El Salvador', prefijo: '503', min: 8, max: 8 },
  { codigo: 'AE', nombre: 'Emiratos Árabes Unidos', prefijo: '971', min: 9, max: 9 },
  { codigo: 'ES', nombre: 'España', prefijo: '34', min: 9, max: 9 },
  { codigo: 'US', nombre: 'Estados Unidos', prefijo: '1', min: 10, max: 10 },
  { codigo: 'PH', nombre: 'Filipinas', prefijo: '63', min: 10, max: 10 },
  { codigo: 'FI', nombre: 'Finlandia', prefijo: '358', min: 9, max: 10 },
  { codigo: 'FR', nombre: 'Francia', prefijo: '33', min: 9, max: 9 },
  { codigo: 'GR', nombre: 'Grecia', prefijo: '30', min: 10, max: 10 },
  { codigo: 'GT', nombre: 'Guatemala', prefijo: '502', min: 8, max: 8 },
  { codigo: 'HN', nombre: 'Honduras', prefijo: '504', min: 8, max: 8 },
  { codigo: 'HU', nombre: 'Hungría', prefijo: '36', min: 9, max: 9 },
  { codigo: 'IN', nombre: 'India', prefijo: '91', min: 10, max: 10 },
  { codigo: 'ID', nombre: 'Indonesia', prefijo: '62', min: 9, max: 12 },
  { codigo: 'IE', nombre: 'Irlanda', prefijo: '353', min: 9, max: 9 },
  { codigo: 'IL', nombre: 'Israel', prefijo: '972', min: 9, max: 9 },
  { codigo: 'IT', nombre: 'Italia', prefijo: '39', min: 9, max: 10 },
  { codigo: 'JM', nombre: 'Jamaica', prefijo: '1', min: 10, max: 10 },
  { codigo: 'JP', nombre: 'Japón', prefijo: '81', min: 10, max: 10 },
  { codigo: 'MA', nombre: 'Marruecos', prefijo: '212', min: 9, max: 9 },
  { codigo: 'MX', nombre: 'México', prefijo: '52', min: 10, max: 10 },
  { codigo: 'NI', nombre: 'Nicaragua', prefijo: '505', min: 8, max: 8 },
  { codigo: 'NO', nombre: 'Noruega', prefijo: '47', min: 8, max: 8 },
  { codigo: 'NZ', nombre: 'Nueva Zelanda', prefijo: '64', min: 8, max: 10 },
  { codigo: 'NL', nombre: 'Países Bajos', prefijo: '31', min: 9, max: 9 },
  { codigo: 'PA', nombre: 'Panamá', prefijo: '507', min: 8, max: 8 },
  { codigo: 'PY', nombre: 'Paraguay', prefijo: '595', min: 9, max: 9 },
  { codigo: 'PE', nombre: 'Perú', prefijo: '51', min: 9, max: 9 },
  { codigo: 'PL', nombre: 'Polonia', prefijo: '48', min: 9, max: 9 },
  { codigo: 'PT', nombre: 'Portugal', prefijo: '351', min: 9, max: 9 },
  { codigo: 'PR', nombre: 'Puerto Rico', prefijo: '1', min: 10, max: 10 },
  { codigo: 'GB', nombre: 'Reino Unido', prefijo: '44', min: 10, max: 10 },
  { codigo: 'DO', nombre: 'República Dominicana', prefijo: '1', min: 10, max: 10 },
  { codigo: 'CZ', nombre: 'República Checa', prefijo: '420', min: 9, max: 9 },
  { codigo: 'RO', nombre: 'Rumanía', prefijo: '40', min: 9, max: 9 },
  { codigo: 'RU', nombre: 'Rusia', prefijo: '7', min: 10, max: 10 },
  { codigo: 'SG', nombre: 'Singapur', prefijo: '65', min: 8, max: 8 },
  { codigo: 'ZA', nombre: 'Sudáfrica', prefijo: '27', min: 9, max: 9 },
  { codigo: 'SE', nombre: 'Suecia', prefijo: '46', min: 9, max: 9 },
  { codigo: 'CH', nombre: 'Suiza', prefijo: '41', min: 9, max: 9 },
  { codigo: 'TH', nombre: 'Tailandia', prefijo: '66', min: 9, max: 9 },
  { codigo: 'TR', nombre: 'Turquía', prefijo: '90', min: 10, max: 10 },
  { codigo: 'UA', nombre: 'Ucrania', prefijo: '380', min: 9, max: 9 },
  { codigo: 'UY', nombre: 'Uruguay', prefijo: '598', min: 8, max: 8 },
  { codigo: 'VE', nombre: 'Venezuela', prefijo: '58', min: 10, max: 10 },
  { codigo: 'VN', nombre: 'Vietnam', prefijo: '84', min: 9, max: 9 },
]

const orden = new Intl.Collator('es')

export const PAISES: readonly Pais[] = LISTA_PAISES.slice().sort((a, b) => orden.compare(a.nombre, b.nombre))

export function buscarPais(codigo: string): Pais | undefined {
  return PAISES.find((pais) => pais.codigo === codigo)
}

export function digitosNacionales(pais: Pais | undefined, valor: string): string {
  const digitos = valor.replace(/\D/g, '')
  if (!pais) return digitos
  if (digitos.startsWith(pais.prefijo) && digitos.length > pais.max) {
    return digitos.slice(pais.prefijo.length)
  }
  return digitos
}

export function telefonoValido(pais: Pais | undefined, valor: string): boolean {
  if (!pais || valor.trim().length === 0) return false
  const nacional = digitosNacionales(pais, valor)
  return nacional.length >= pais.min && nacional.length <= pais.max
}

export function evaluarContrasena(valor: string): {
  requisitos: RequisitoContrasena[]
  cumplidos: number
  etiqueta: '' | 'Débil' | 'Media' | 'Fuerte'
  valida: boolean
} {
  const requisitos = REQUISITOS.map((item) => ({ id: item.id, texto: item.texto, ok: item.cumple(valor) }))
  const cumplidos = requisitos.filter((item) => item.ok).length
  const etiqueta = valor.length === 0 ? '' : cumplidos <= 2 ? 'Débil' : cumplidos <= 4 ? 'Media' : 'Fuerte'
  return { requisitos, cumplidos, etiqueta, valida: cumplidos === requisitos.length }
}

export function validarRegistroLanding(datos: DatosRegistroLanding): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim())) {
    errores.correo = 'Escribe un correo válido.'
  }
  if (datos.nombre.trim().length < 3) {
    errores.nombre = 'El nombre necesita al menos 3 caracteres.'
  }
  if (!evaluarContrasena(datos.contrasena).valida) {
    errores.contrasena = 'La contraseña debe cumplir todos los requisitos.'
  }
  if (datos.confirmar.length === 0 || datos.confirmar !== datos.contrasena) {
    errores.confirmar = 'La confirmación no coincide con la contraseña.'
  }
  const pais = buscarPais(datos.pais)
  if (!pais) errores.pais = 'Selecciona un país.'
  if (!telefonoValido(pais, datos.telefono)) {
    errores.telefono = pais
      ? 'El teléfono no coincide con el formato de ese país.'
      : 'Selecciona un país para validar el teléfono.'
  }
  return errores
}
