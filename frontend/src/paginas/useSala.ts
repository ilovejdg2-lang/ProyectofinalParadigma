import { useCallback, useEffect, useState } from 'react'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import type { Sala } from '../dominio/tipos.ts'
import type { EstadoConexion } from '../servicios/sala.ts'

export function useSala(codigo: string) {
  const { sala: cliente } = useServicios()
  const { token } = useAutenticacion()
  const [sala, setSala] = useState<Sala | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [conexion, setConexion] = useState<EstadoConexion>(cliente.estadoConexion())

  const recargar = useCallback(async () => {
    if (!token) return
    try {
      const siguiente = await cliente.obtener(token, codigo)
      setSala(siguiente)
      setError(null)
      setConexion(cliente.estadoConexion())
    } catch (err) {
      setError(mensajeDe(err))
      setConexion(cliente.estadoConexion())
    } finally {
      setCargando(false)
    }
  }, [cliente, codigo, token])

  useEffect(() => {
    void recargar()
    return cliente.suscribir(codigo, (siguiente) => {
      setSala(siguiente)
      setError(null)
      setConexion(cliente.estadoConexion())
    })
  }, [cliente, codigo, recargar])

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') void recargar()
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('online', alVolver)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('online', alVolver)
    }
  }, [recargar])

  return { sala, error, cargando, conexion, recargar, setError, setConexion }
}
