import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'

/**
 * Internal-only endpoint called by middleware to verify Firebase ID tokens.
 * Not meant to be called directly by clients.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token ausente' }, { status: 400 })
    }

    const adminAuth = getAdminAuth()
    // verifySessionCookie must be used here because the cookie now contains a
    // Firebase Admin session cookie (via createSessionCookie), NOT a raw ID token.
    // The second argument (true) enables revocation checking.
    const decoded = await adminAuth.verifySessionCookie(token, true)

    return NextResponse.json({ uid: decoded.uid, email: decoded.email })
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }
}
