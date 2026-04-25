import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { prisma } from '@/lib/prisma'

/**
 * Internal-only endpoint called by middleware to verify Firebase session cookies.
 * Protected by an optional shared secret (INTERNAL_API_SECRET env var).
 * Not meant to be called directly by external clients.
 */
export async function POST(request: NextRequest) {
  // Enforce internal-only access when the secret is configured
  const secret = process.env.INTERNAL_API_SECRET
  if (secret) {
    const provided = request.headers.get('x-internal-secret')
    if (provided !== secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token ausente' }, { status: 400 })
    }

    const adminAuth = getAdminAuth()
    // verifySessionCookie must be used because the cookie contains a Firebase Admin
    // session cookie (via createSessionCookie), NOT a raw ID token.
    // The second argument (true) enables revocation checking.
    const decoded = await adminAuth.verifySessionCookie(token, true)

    // Defense in depth: also verify the user is still active in our DB.
    // A technically valid Firebase cookie should be rejected if the account
    // was deactivated after the session was created (revokeRefreshTokens may
    // take up to 1 minute to propagate at the Firebase level).
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { ativo: true },
    })

    if (!user || !user.ativo) {
      return NextResponse.json({ error: 'Conta desativada ou não encontrada' }, { status: 401 })
    }

    return NextResponse.json({ uid: decoded.uid, email: decoded.email })
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }
}
