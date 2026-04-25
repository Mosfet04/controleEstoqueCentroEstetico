import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { prisma } from '@/lib/prisma'

const SESSION_COOKIE_NAME = '__session'
// 7 days — Firebase Admin session cookies support up to 14 days.
// The raw ID token only lasts 1 hour; using createSessionCookie gives users
// a persistent session so they don't have to re-login every time they open the PWA.
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { idToken } = body

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const adminAuth = getAdminAuth()
    // Verify the ID token first to get the UID for the DB lookup
    const decoded = await adminAuth.verifyIdToken(idToken)

    // Ensure user exists in our DB (synced from Firebase)
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, name: true, role: true, email: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não cadastrado no sistema. Contate o administrador.' },
        { status: 403 }
      )
    }

    // Create a long-lived session cookie via Firebase Admin (up to 14 days).
    // This replaces storing the raw ID token in the cookie, which expires in 1 hour
    // and causes PWA users to be logged out every time they reopen the app.
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000, // createSessionCookie expects milliseconds
    })

    const response = NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'

    if (message.includes('auth/id-token-expired') || message.includes('auth/argument-error')) {
      return NextResponse.json({ error: 'Token expirado ou inválido' }, { status: 401 })
    }

    // Log the full error so it appears in Vercel function logs
    console.error('[auth/session] POST error:', error instanceof Error ? error.stack : message)
    return NextResponse.json({ error: 'Erro interno de autenticação' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
