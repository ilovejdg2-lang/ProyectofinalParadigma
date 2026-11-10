import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { AVATARES } from '../juego/avatares.tsx'

const carpeta = join(dirname(fileURLToPath(import.meta.url)), '../../public/avatars')

describe('catálogo de avatares', () => {
  it('tiene identificadores únicos y un PNG RGBA de 512 por cada uno', () => {
    const ids = AVATARES.map((avatar) => avatar.id)
    const archivos = AVATARES.map((avatar) => avatar.archivo)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(archivos).size).toBe(archivos.length)
    expect(ids.every((id) => /^[a-z][a-z-]{1,30}[a-z]$/.test(id))).toBe(true)

    const enDisco = readdirSync(carpeta).filter((nombre) => nombre.endsWith('.png')).sort()
    expect(enDisco).toEqual([...archivos].sort())

    for (const avatar of AVATARES) {
      const bytes = readFileSync(join(carpeta, avatar.archivo))
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(bytes.toString('ascii', 12, 16)).toBe('IHDR')
      expect(bytes.readUInt32BE(16)).toBe(512)
      expect(bytes.readUInt32BE(20)).toBe(512)
      expect(bytes[24]).toBe(8)
      expect(bytes[25]).toBe(6)
    }
  })
})
