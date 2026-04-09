'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, AuthError } from 'firebase/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react'
import { getFirebaseAuth } from '@/lib/firebase'
import { toast } from 'sonner'

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-mail ou senha incorretos'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente'
    case 'auth/user-disabled':
      return 'Conta desativada. Contate o administrador'
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Login com Google cancelado'
    case 'auth/popup-blocked':
      return 'Popup bloqueado pelo navegador. Permita popups para este site'
    default:
      return 'Erro ao entrar. Tente novamente'
  }
}

async function exchangeFirebaseToken(idToken: string): Promise<{ name: string }> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data?.error ?? 'Erro ao iniciar sessão')
  }
  return res.json()
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isResetLoading, setIsResetLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email) {
      newErrors.email = 'E-mail é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'E-mail inválido'
    }

    if (!password) {
      newErrors.password = 'Senha é obrigatória'
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})

    try {
      const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
      const idToken = await credential.user.getIdToken()
      const appUser = await exchangeFirebaseToken(idToken)
      toast.success(`Bem-vindo(a), ${appUser.name}!`)
      router.push('/dashboard')
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : getFirebaseErrorMessage((err as AuthError)?.code ?? '')
      toast.error(message)
      setErrors({ password: message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const credential = await signInWithPopup(getFirebaseAuth(), provider)
      const idToken = await credential.user.getIdToken()
      const appUser = await exchangeFirebaseToken(idToken)
      toast.success(`Bem-vindo(a), ${appUser.name}!`)
      router.push('/dashboard')
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : getFirebaseErrorMessage((err as AuthError)?.code ?? '')
      // Não mostra erro se o usuário apenas fechou o popup
      const code = (err as AuthError)?.code ?? ''
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        toast.error(message)
      }
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setErrors((prev) => ({ ...prev, email: 'Digite seu e-mail para redefinir a senha' }))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((prev) => ({ ...prev, email: 'E-mail inválido' }))
      return
    }

    setIsResetLoading(true)
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email)
      toast.success('E-mail de redefinição enviado! Verifique sua caixa de entrada (e a pasta de spam).')
    } catch (err) {
      const code = (err as AuthError)?.code ?? ''
      if (code === 'auth/user-not-found') {
        // Não revelamos se o e-mail existe ou não (segurança)
        toast.success('Se este e-mail estiver cadastrado, você receberá as instruções.')
      } else if (code === 'auth/invalid-email') {
        setErrors((prev) => ({ ...prev, email: 'E-mail inválido' }))
      } else if (code === 'auth/too-many-requests') {
        toast.error('Muitas tentativas. Aguarde alguns minutos.')
      } else {
        toast.error(`Erro ao enviar e-mail (${code || 'desconhecido'}). Tente novamente.`)
      }
    } finally {
      setIsResetLoading(false)
    }
  }

  const anyLoading = isLoading || isGoogleLoading || isResetLoading

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Stock Beauty Clinic</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Controle de Estoque</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Entrar</CardTitle>
            <CardDescription>Digite suas credenciais para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">E-mail</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                    disabled={anyLoading}
                  />
                  {errors.email && <FieldError>{errors.email}</FieldError>}
                </Field>

                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="password">Senha</FieldLabel>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={anyLoading}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {isResetLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      {isResetLoading ? 'Enviando...' : 'Esqueceu a senha?'}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                      disabled={anyLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <FieldError>{errors.password}</FieldError>}
                </Field>

                <Button type="submit" className="w-full mt-2" disabled={anyLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </FieldGroup>
            </form>

            <div className="flex items-center gap-3 my-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">ou</span>
              <Separator className="flex-1" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={anyLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Entrar com Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
