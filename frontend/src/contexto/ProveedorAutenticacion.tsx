import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Perfil, Sesion } from '../dominio/tipos.ts'
import { limpiarEspacio } from '../paginas/espacio.ts'
import { entrarAlCursoPredeterminado } from '../servicios/cursos.ts'
import { useServicios } from './ProveedorServicios.tsx'

const CLAVE_TOKEN = 'profelink.token'

interface AutenticacionUi {
  perfil: Perfil | null
  token: string | null
  listo: boolean
  entrar: (sesion: Sesion) => void
  salir: () => Promise<void>
}

const ContextoAutenticacion = createContext<AutenticacionUi | null>(null)

export function ProveedorAutenticacion({ children }: { children: ReactNode }) {
  const { autenticacion } = useServicios()
  const guardadoInicial = sessionStorage.getItem(CLAVE_TOKEN)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [token, setToken] = useState<string | null>(guardadoInicial)
  const [listo, setListo] = useState(guardadoInicial === null)

  useEffect(() => {
    const guardado = sessionStorage.getItem(CLAVE_TOKEN)
    if (!guardado) return
    let activo = true
    autenticacion
      .sesionActual(guardado)
      .then((sesion) => {
        if (!activo) return
        if (!sesion) {
          sessionStorage.removeItem(CLAVE_TOKEN)
          setPerfil(null)
          setToken(null)
          return
        }
        setPerfil(sesion.perfil)
        setToken(sesion.token)
        void entrarAlCursoPredeterminado(sesion.token)
      })
      .catch(() => {
        if (!activo) return
        sessionStorage.removeItem(CLAVE_TOKEN)
        setPerfil(null)
        setToken(null)
      })
      .finally(() => {
        if (activo) setListo(true)
      })
    return () => {
      activo = false
    }
  }, [autenticacion])

  const valor: AutenticacionUi = {
    perfil,
    token,
    listo,
    entrar(sesion) {
      sessionStorage.setItem(CLAVE_TOKEN, sesion.token)
      setToken(sesion.token)
      setPerfil(sesion.perfil)
      void entrarAlCursoPredeterminado(sesion.token)
    },
    async salir() {
      limpiarEspacio()
      if (token) await autenticacion.cerrarSesion(token)
      sessionStorage.removeItem(CLAVE_TOKEN)
      setToken(null)
      setPerfil(null)
    },
  }

  return <ContextoAutenticacion.Provider value={valor}>{children}</ContextoAutenticacion.Provider>
}

export function useAutenticacion(): AutenticacionUi {
  const valor = useContext(ContextoAutenticacion)
  if (!valor) throw new Error('La autenticación de la interfaz no está disponible.')
  return valor
}
