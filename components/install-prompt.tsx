'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Não mostrar se já foi dispensado ou se já está instalado
    if (
      localStorage.getItem('pwa-dismissed') === 'true' ||
      window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true
    ) {
      return
    }

    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
    setIsIOS(ios)

    if (ios) {
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (isIOS) {
      dismiss()
      return
    }
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === 'accepted') {
      deferredPrompt.current = null
    }
    dismiss()
  }

  const dismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl border border-border bg-background p-4 shadow-lg">
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-sm p-1 text-muted-foreground hover:text-foreground"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192x192.png"
          alt="Stock Beauty Clinic"
          className="h-12 w-12 shrink-0 rounded-xl"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Instalar Stock Beauty Clinic</p>
          {isIOS ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Toque em <strong>Compartilhar</strong> e depois em{' '}
              <strong>Adicionar à Tela de Início</strong> para instalar o app.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Adicione à tela inicial para acesso rápido, mesmo sem internet.
            </p>
          )}
        </div>
      </div>

      {!isIOS && (
        <Button size="sm" className="mt-3 w-full gap-2" onClick={handleInstall}>
          <Download className="h-4 w-4" />
          Instalar app
        </Button>
      )}
    </div>
  )
}
