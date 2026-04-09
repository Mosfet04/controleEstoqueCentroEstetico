'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import {
  LayoutDashboard,
  Package,
  PackageMinus,
  BarChart3,
  Users,
  LogOut,
  Sparkles,
  Menu,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/insumos', label: 'Insumos', icon: Package },
  { href: '/dashboard/saidas', label: 'Saídas', icon: PackageMinus },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart3 },
]

const adminItems = [{ href: '/dashboard/usuarios', label: 'Usuários', icon: Users }]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    setNavigatingTo(null)
  }, [pathname])

  const handleNavigation = (href: string) => {
    if (href === pathname) return
    setNavigatingTo(href)
    setIsOpen(false)
    startTransition(() => {
      router.push(href)
    })
  }

  const handleLogout = () => {
    signOut()
  }

  const allMenuItems = user?.role === 'admin' ? [...menuItems, ...adminItems] : menuItems

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sidebar-primary">
          <Sparkles className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sidebar-foreground text-sm">Stock Beauty</span>
          <span className="text-xs text-sidebar-foreground/60">Controle de Estoque</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {allMenuItems.map((item) => {
            const isActive = pathname === item.href
            const isNavigating = navigatingTo === item.href
            return (
              <li key={item.href}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  disabled={isNavigating}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    isNavigating && 'opacity-70'
                  )}
                >
                  {isNavigating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <item.icon className="w-5 h-5" />
                  )}
                  {item.label}
                  {isNavigating && (
                    <span className="ml-auto">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sidebar-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-sidebar-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-sidebar-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</span>
              <span className="text-xs text-sidebar-foreground/60 capitalize">{user.role === 'admin' ? 'Administrador' : 'Clínico'}</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Sair
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary">
            <Sparkles className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground text-sm">Stock Beauty</span>
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>
    </>
  )
}
