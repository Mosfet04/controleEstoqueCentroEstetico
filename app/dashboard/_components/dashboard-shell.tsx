'use client'

import { Suspense } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { NavigationProgress, PageTransition } from '@/components/navigation-progress'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { UnidadeProvider } from '@/contexts/unidade-context'
import { Loader2 } from 'lucide-react'

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20" />
          <Loader2 className="w-12 h-12 text-primary animate-spin absolute inset-0" />
        </div>
        <p className="text-muted-foreground text-sm animate-pulse">Carregando...</p>
      </div>
    </div>
  )
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20" />
            <Loader2 className="w-12 h-12 text-primary animate-spin absolute inset-0" />
          </div>
          <p className="text-muted-foreground text-sm animate-pulse">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationProgress />
      <AppSidebar />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 lg:p-6">
          <Suspense fallback={<PageLoader />}>
            <PageTransition>{children}</PageTransition>
          </Suspense>
        </div>
      </main>
    </div>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UnidadeProvider>
        <DashboardContent>{children}</DashboardContent>
      </UnidadeProvider>
    </AuthProvider>
  )
}
