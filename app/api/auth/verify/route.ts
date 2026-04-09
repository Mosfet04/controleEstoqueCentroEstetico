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
    const decoded = await adminAuth.verifyIdToken(token)

    return NextResponse.json({ uid: decoded.uid, email: decoded.email })
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }
}
