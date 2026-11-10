import type { CSSProperties } from 'react'

export const CATEGORIAS_AVATAR = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'personajes', nombre: 'Personajes' },
  { id: 'animales', nombre: 'Animales' },
  { id: 'fantasia', nombre: 'Fantasía' },
  { id: 'espacio', nombre: 'Espacio' },
  { id: 'profesiones', nombre: 'Profesiones' },
] as const

export type CategoriaAvatar = (typeof CATEGORIAS_AVATAR)[number]['id']

export const AVATARES = [
  { id: 'robot-cyan', nombre: 'Robot azul', archivo: 'robot-cyan.png', anillo: '#01aaf6', categoria: 'espacio' },
  { id: 'gamer-azul', nombre: 'Chico gamer azul', archivo: 'gamer-azul.png', anillo: '#026df8', categoria: 'personajes' },
  { id: 'gamer-morada', nombre: 'Chica gamer morada', archivo: 'gamer-morada.png', anillo: '#9f3af6', categoria: 'personajes' },
  { id: 'gato-naranja', nombre: 'Gato naranja', archivo: 'gato-naranja.png', anillo: '#faa107', categoria: 'animales' },
  { id: 'perro-rojo', nombre: 'Perro rojo', archivo: 'perro-rojo.png', anillo: '#f02e49', categoria: 'animales' },
  { id: 'astronauta', nombre: 'Robot astronauta', archivo: 'astronauta.png', anillo: '#186fec', categoria: 'espacio' },
  { id: 'ninja-verde', nombre: 'Ninja verde', archivo: 'ninja-verde.png', anillo: '#21ce5c', categoria: 'personajes' },
  { id: 'maga-rosa', nombre: 'Chica maga', archivo: 'maga-rosa.png', anillo: '#e42a8c', categoria: 'fantasia' },
  { id: 'vikingo-rojo', nombre: 'Vikingo', archivo: 'vikingo-rojo.png', anillo: '#ee443c', categoria: 'personajes' },
  { id: 'gamer-rosa', nombre: 'Chica gamer rosa', archivo: 'gamer-rosa.png', anillo: '#f44299', categoria: 'personajes' },
  { id: 'panda-verde', nombre: 'Panda verde', archivo: 'panda-verde.png', anillo: '#5bca54', categoria: 'animales' },
  { id: 'dinosaurio-verde', nombre: 'Chico dinosaurio', archivo: 'dinosaurio-verde.png', anillo: '#57c253', categoria: 'personajes' },
  { id: 'doctora', nombre: 'Doctora', archivo: 'doctora.png', anillo: '#e23b8c', categoria: 'profesiones' },
  { id: 'doctor', nombre: 'Doctor', archivo: 'doctor.png', anillo: '#2f6bff', categoria: 'profesiones' },
  { id: 'cientifico', nombre: 'Científico', archivo: 'cientifico.png', anillo: '#8a3adf', categoria: 'profesiones' },
  { id: 'cientifica', nombre: 'Científica', archivo: 'cientifica.png', anillo: '#a14adf', categoria: 'profesiones' },
  { id: 'chef', nombre: 'Chef', archivo: 'chef.png', anillo: '#f1b10b', categoria: 'profesiones' },
  { id: 'exploradora', nombre: 'Exploradora', archivo: 'exploradora.png', anillo: '#f2a311', categoria: 'profesiones' },
  { id: 'musico', nombre: 'Músico', archivo: 'musico.png', anillo: '#1d6dff', categoria: 'profesiones' },
  { id: 'cantante', nombre: 'Cantante', archivo: 'cantante.png', anillo: '#e23a8c', categoria: 'profesiones' },
  { id: 'caballero', nombre: 'Caballero', archivo: 'caballero.png', anillo: '#e23b4a', categoria: 'personajes' },
  { id: 'pirata', nombre: 'Pirata', archivo: 'pirata.png', anillo: '#e23a3a', categoria: 'personajes' },
  { id: 'monje', nombre: 'Monje', archivo: 'monje.png', anillo: '#f6a902', categoria: 'personajes' },
  { id: 'samurai', nombre: 'Samurái', archivo: 'samurai.png', anillo: '#e23a3a', categoria: 'personajes' },
  { id: 'rey', nombre: 'Rey', archivo: 'rey.png', anillo: '#e23a3a', categoria: 'personajes' },
  { id: 'reina', nombre: 'Reina', archivo: 'reina.png', anillo: '#e23a8c', categoria: 'personajes' },
  { id: 'vikingo-martillo', nombre: 'Vikingo con martillo', archivo: 'vikingo-martillo.png', anillo: '#e07a2d', categoria: 'personajes' },
  { id: 'girasol', nombre: 'Girasol', archivo: 'girasol.png', anillo: '#3fe24b', categoria: 'personajes' },
  { id: 'fresa', nombre: 'Fresa', archivo: 'fresa.png', anillo: '#f24f6a', categoria: 'personajes' },
  { id: 'gato-gamer', nombre: 'Gato gamer', archivo: 'gato-gamer.png', anillo: '#8a3adf', categoria: 'animales' },
  { id: 'shiba', nombre: 'Shiba', archivo: 'shiba.png', anillo: '#2a6bff', categoria: 'animales' },
  { id: 'mapache', nombre: 'Mapache', archivo: 'mapache.png', anillo: '#2a8cff', categoria: 'animales' },
  { id: 'mono', nombre: 'Mono', archivo: 'mono.png', anillo: '#7a3ad4', categoria: 'animales' },
  { id: 'toro', nombre: 'Toro', archivo: 'toro.png', anillo: '#e23a3a', categoria: 'animales' },
  { id: 'loro-pirata', nombre: 'Loro pirata', archivo: 'loro-pirata.png', anillo: '#e23a3a', categoria: 'animales' },
  { id: 'buho', nombre: 'Búho', archivo: 'buho.png', anillo: '#1b6bff', categoria: 'animales' },
  { id: 'oso', nombre: 'Oso', archivo: 'oso.png', anillo: '#8934c4', categoria: 'animales' },
  { id: 'tiburon', nombre: 'Tiburón', archivo: 'tiburon.png', anillo: '#02a7f2', categoria: 'animales' },
  { id: 'bulldog', nombre: 'Bulldog', archivo: 'bulldog.png', anillo: '#9a3adf', categoria: 'animales' },
  { id: 'pug', nombre: 'Pug', archivo: 'pug.png', anillo: '#e07a2d', categoria: 'animales' },
  { id: 'mago-azul', nombre: 'Mago azul', archivo: 'mago-azul.png', anillo: '#9b4dff', categoria: 'fantasia' },
  { id: 'muerte', nombre: 'Muerte', archivo: 'muerte.png', anillo: '#7a3ad4', categoria: 'fantasia' },
  { id: 'kitsune', nombre: 'Kitsune', archivo: 'kitsune.png', anillo: '#e23a5a', categoria: 'fantasia' },
  { id: 'elfa', nombre: 'Elfa', archivo: 'elfa.png', anillo: '#21c45a', categoria: 'fantasia' },
  { id: 'fuego', nombre: 'Espíritu de fuego', archivo: 'fuego.png', anillo: '#f8342f', categoria: 'fantasia' },
  { id: 'fantasma', nombre: 'Fantasma', archivo: 'fantasma.png', anillo: '#01a6e7', categoria: 'fantasia' },
  { id: 'sombra', nombre: 'Sombra', archivo: 'sombra.png', anillo: '#9a3adf', categoria: 'fantasia' },
  { id: 'yeti', nombre: 'Yeti', archivo: 'yeti.png', anillo: '#3a7bff', categoria: 'fantasia' },
  { id: 'unicornio', nombre: 'Unicornio', archivo: 'unicornio.png', anillo: '#e23a8c', categoria: 'fantasia' },
  { id: 'dragon', nombre: 'Dragón', archivo: 'dragon.png', anillo: '#e23a3a', categoria: 'fantasia' },
  { id: 'alien', nombre: 'Alien', archivo: 'alien.png', anillo: '#a64bed', categoria: 'espacio' },
  { id: 'astronauta-luz', nombre: 'Astronauta', archivo: 'astronauta-luz.png', anillo: '#2a6bff', categoria: 'espacio' },
  { id: 'consola', nombre: 'Consola', archivo: 'consola.png', anillo: '#03cdf1', categoria: 'espacio' },
] as const

export type IdAvatar = (typeof AVATARES)[number]['id']
export type AvatarCatalogo = (typeof AVATARES)[number]

export const AVATAR_PREDETERMINADO: IdAvatar = AVATARES[0].id

const ids = new Set<string>(AVATARES.map((item) => item.id))

export function avatarValido(id: string | undefined | null): id is IdAvatar {
  return Boolean(id && ids.has(id))
}

export function avatarDePerfil(perfilId: string): IdAvatar {
  let total = 0
  for (const letra of perfilId) total += letra.charCodeAt(0)
  return AVATARES[total % AVATARES.length].id
}

const CLAVE = 'profelink.fichas.v1'

export function guardarFichaLocal(perfilId: string, avatarId: IdAvatar) {
  const mapa = leerMapa()
  mapa[perfilId] = avatarId
  localStorage.setItem(CLAVE, JSON.stringify(mapa))
}

export function fichaLocal(perfilId: string): IdAvatar | undefined {
  const id = leerMapa()[perfilId]
  return avatarValido(id) ? id : undefined
}

function leerMapa(): Record<string, string> {
  try {
    const texto = localStorage.getItem(CLAVE)
    if (!texto) return {}
    const valor = JSON.parse(texto) as Record<string, string>
    return valor && typeof valor === 'object' ? valor : {}
  } catch {
    return {}
  }
}

export function avatarVisible(perfilId: string, avatarId?: string | null): IdAvatar {
  if (avatarValido(avatarId)) return avatarId
  const local = fichaLocal(perfilId)
  if (local) return local
  if (avatarId) return AVATAR_PREDETERMINADO
  return avatarDePerfil(perfilId)
}

export function Avatar({ id, tamano = 72 }: { id: IdAvatar; tamano?: number }) {
  const item = AVATARES.find((avatar) => avatar.id === id) ?? AVATARES[0]
  const base = import.meta.env.BASE_URL
  const raiz = base.endsWith('/') ? base : `${base}/`
  return (
    <img
      className="avatar-juego"
      src={`${raiz}avatars/${item.archivo}`}
      alt=""
      width={tamano}
      height={tamano}
      style={{ '--avatar-lado': `${tamano}px` } as CSSProperties}
      draggable={false}
    />
  )
}
