import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin, isUser } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!isUser(admin)) return admin

  try {
    const { searchParams } = request.nextUrl
    const entity = searchParams.get('entity')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(entity ? { entity } : {}),
        ...(action ? { action } : {}),
        ...(userId ? { userId } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/auditoria' } })
    return NextResponse.json({ error: 'Erro ao buscar logs' }, { status: 500 })
  }
}
