import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { requireAuth, isUser } from '@/lib/auth-helpers'
import { getDashboardData } from '@/lib/dashboard-data'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  try {
    const data = await getDashboardData()
    return NextResponse.json(data)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/dashboard' } })
    return NextResponse.json({ error: 'Erro ao buscar métricas' }, { status: 500 })
  }
}
