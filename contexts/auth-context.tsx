'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onIdTokenChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'

export interface AppUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'clinico'
}

interface AuthContextValue {
  user: AppUser | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Listen for Firebase auth state changes and keep the session cookie in sync
    const unsubscribe = onIdTokenChanged(getFirebaseAuth(), async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        setUser(null)
        setIsLoading(false)
        return
      }

      try {
        const idToken = await firebaseUser.getIdToken()

        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })

        if (response.ok) {
          const appUser = await response.json()
          setUser(appUser)
        } else {
          // User exists in Firebase but not in DB — sign out
          await firebaseSignOut(getFirebaseAuth())
          setUser(null)
        }
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    await firebaseSignOut(getFirebaseAuth())
    await fetch('/api/auth/session', { method: 'DELETE' })
    setUser(null)
    router.push('/')
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
