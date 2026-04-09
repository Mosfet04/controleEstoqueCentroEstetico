'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { unidadesApi, UnidadeApi } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

interface UnidadeContextValue {
  unidades: UnidadeApi[]
  unidadeAtiva: UnidadeApi | null
  setUnidadeAtiva: (unidade: UnidadeApi) => void
  isLoading: boolean
  reloadUnidades: () => Promise<void>
}

const UnidadeContext = createContext<UnidadeContextValue | null>(null)

const STORAGE_KEY = 'unidadeAtiva'

export function UnidadeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [unidades, setUnidades] = useState<UnidadeApi[]>([])
  const [unidadeAtiva, setUnidadeAtivaState] = useState<UnidadeApi | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUnidades = useCallback(async () => {
    if (!user) {
      setUnidades([])
      setUnidadeAtivaState(null)
      setIsLoading(false)
      return
    }

    try {
      const list = await unidadesApi.list()
      setUnidades(list)

      const savedId = localStorage.getItem(STORAGE_KEY)
      const saved = list.find((u) => u.id === savedId)

      if (saved) {
        setUnidadeAtivaState(saved)
      } else if (list.length > 0) {
        setUnidadeAtivaState(list[0])
        localStorage.setItem(STORAGE_KEY, list[0].id)
      }
    } catch {
      setUnidades([])
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadUnidades()
  }, [loadUnidades])

  const setUnidadeAtiva = useCallback((unidade: UnidadeApi) => {
    setUnidadeAtivaState(unidade)
    localStorage.setItem(STORAGE_KEY, unidade.id)
  }, [])

  return (
    <UnidadeContext.Provider
      value={{ unidades, unidadeAtiva, setUnidadeAtiva, isLoading, reloadUnidades: loadUnidades }}
    >
      {children}
    </UnidadeContext.Provider>
  )
}

export function useUnidade() {
  const ctx = useContext(UnidadeContext)
  if (!ctx) {
    throw new Error('useUnidade must be used within UnidadeProvider')
  }
  return ctx
}
