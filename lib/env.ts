import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL é obrigatório').optional(),

  // Firebase - Client (browser-safe)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_API_KEY é obrigatório'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN é obrigatório'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_PROJECT_ID é obrigatório'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET é obrigatório'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID é obrigatório'),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_APP_ID é obrigatório'),

  // Firebase - Admin (server-only, NEVER expose to client)
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1, 'FIREBASE_ADMIN_PROJECT_ID é obrigatório'),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email('FIREBASE_ADMIN_CLIENT_EMAIL deve ser um e-mail válido'),
  FIREBASE_ADMIN_PRIVATE_KEY_BASE64: z.string().min(1, 'FIREBASE_ADMIN_PRIVATE_KEY_BASE64 é obrigatório'),

  // Sentry (optional in development)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url('NEXT_PUBLIC_SENTRY_DSN deve ser uma URL válida').optional(),

  // Internal API secret — protects /api/auth/verify from external callers.
  // Generate with: openssl rand -hex 32
  // Must be set in both the server and edge (middleware) environments.
  INTERNAL_API_SECRET: z.string().min(32, 'INTERNAL_API_SECRET deve ter ao menos 32 caracteres').optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL deve ser uma URL válida').optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  - ${key}: ${msgs?.join(', ')}`)
      .join('\n')

    throw new Error(
      `Variáveis de ambiente ausentes ou inválidas:\n${messages}\n\nConsulte .env.example para referência.`
    )
  }

  return result.data
}

// Validate once at module load on the server
export const env = validateEnv()
