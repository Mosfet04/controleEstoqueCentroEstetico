import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { requireAuth, isUser, getUnidadeIdOrGlobal, requireUnidadeAccessOrGlobal } from '@/lib/auth-helpers'
import { getDashboardData } from '@/lib/dashboard-data'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeIdOrGlobal(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccessOrGlobal(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  try {
    const { searchParams } = request.nextUrl
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const dateRange = from && to
      ? { from: new Date(from), to: new Date(to) }
      : undefined

    const data = await getDashboardData(undefined, unidadeId ?? undefined, dateRange)
    return NextResponse.json(data)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/dashboard' } })
    return NextResponse.json({ error: 'Erro ao buscar métricas' }, { status: 500 })
  }
}
