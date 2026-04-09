'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavigationContextType {
  isNavigating: boolean
  startNavigation: () => void
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  startNavigation: () => {},
})

export function useNavigation() {
  return useContext(NavigationContext)
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  const startNavigation = () => setIsNavigating(true)

  return (
    <NavigationContext.Provider value={{ isNavigating, startNavigation }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function NavigationProgress() {
  const [progress, setProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Complete the progress bar when pathname changes
    setProgress(100)
    const timeout = setTimeout(() => {
      setIsAnimating(false)
      setProgress(0)
    }, 300)
    return () => clearTimeout(timeout)
  }, [pathname])

  useEffect(() => {
    // Capture button/link clicks for navigation
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const button = target.closest('button')
      const link = target.closest('a')
      
      if (button || (link && link.href?.startsWith(window.location.origin))) {
        const href = link?.getAttribute('href')
        if (!href || (href !== pathname && !href.startsWith('#'))) {
          setIsAnimating(true)
          setProgress(30)
        }
      }
    }

    // Progress animation
    let interval: NodeJS.Timeout
    if (isAnimating && progress < 90) {
      interval = setInterval(() => {
        setProgress((prev) => {
          const increment = Math.random() * 15
          const next = prev + increment
          return next >= 90 ? 90 : next
        })
      }, 200)
    }

    document.addEventListener('click', handleClick)
    
    return () => {
      document.removeEventListener('click', handleClick)
      if (interval) clearInterval(interval)
    }
  }, [isAnimating, pathname, progress])

  if (progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-primary/10">
      <div
        className={cn(
          'h-full bg-gradient-to-r from-primary to-primary/70 shadow-lg shadow-primary/25 transition-all ease-out',
          progress === 100 ? 'duration-200 opacity-0' : 'duration-300'
        )}
        style={{ width: `${progress}%` }}
      />
      {isAnimating && progress < 100 && (
        <>
          <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-white/30 to-transparent animate-pulse" />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary animate-ping" />
        </>
      )}
    </div>
  )
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsMounted(true)
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Reset animation on pathname change
  useEffect(() => {
    setIsVisible(false)
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [pathname])

  if (!isMounted) {
    return (
      <div className="opacity-0">
        {children}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'transition-all duration-400 ease-out',
        isVisible 
          ? 'opacity-100 translate-y-0 blur-0' 
          : 'opacity-0 translate-y-3 blur-[2px]'
      )}
    >
      {children}
    </div>
  )
}
