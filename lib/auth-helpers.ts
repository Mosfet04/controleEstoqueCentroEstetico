import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { prisma } from '@/lib/prisma'
import { User, UserRole } from '@prisma/client'

export type AuthenticatedUser = Pick<User, 'id' | 'email' | 'name' | 'role' | 'firebaseUid'>

/**
 * Extracts and verifies the session cookie from a request.
 * Returns the authenticated DB user, or a 401/403 NextResponse on failure.
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  const token = request.cookies.get('__session')?.value

  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const adminAuth = getAdminAuth()
    const decoded = await adminAuth.verifyIdToken(token)

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, email: true, name: true, role: true, firebaseUid: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 403 })
    }

    return user
  } catch {
    return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 })
  }
}

/**
 * Requires auth AND admin role. Returns user or 401/403 NextResponse.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  const result = await requireAuth(request)

  if (result instanceof NextResponse) return result

  if (result.role !== UserRole.admin) {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  return result
}

/**
 * Type guard to check if a value is an authenticated user (not a NextResponse).
 */
export function isUser(value: AuthenticatedUser | NextResponse): value is AuthenticatedUser {
  return !(value instanceof NextResponse)
}

/**
 * Extracts the x-unidade-id header from the request.
 * Returns the unidade ID string or a 400 response if missing.
 */
export function getUnidadeId(
  request: NextRequest
): string | NextResponse {
  const unidadeId = request.headers.get('x-unidade-id')

  if (!unidadeId) {
    return NextResponse.json({ error: 'Unidade não selecionada' }, { status: 400 })
  }

  return unidadeId
}
