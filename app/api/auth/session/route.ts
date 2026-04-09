import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { prisma } from '@/lib/prisma'

const SESSION_COOKIE_NAME = '__session'
const SESSION_MAX_AGE = 60 * 60 // 1 hour in seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { idToken } = body

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const adminAuth = getAdminAuth()
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

    const response = NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })

    response.cookies.set(SESSION_COOKIE_NAME, idToken, {
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

    console.error('[auth/session] POST error:', message)
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
