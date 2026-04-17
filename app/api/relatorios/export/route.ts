import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { requireAuth, isUser, getUnidadeIdOrGlobal, requireUnidadeAccessOrGlobal } from '@/lib/auth-helpers'
import { getDashboardData } from '@/lib/dashboard-data'
import { generateReport } from '@/lib/report-generator'
import { nowSP } from '@/lib/utils'

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
    const buffer = await generateReport(data)

    const now = nowSP()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    const suffix = dateRange
      ? `${from}-a-${to}`
      : `${year}-${month}`
    const filename = `relatorio-estoque-${suffix}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: 'GET /api/relatorios/export' },
    })
    return NextResponse.json(
      { error: 'Erro ao gerar relatório' },
      { status: 500 }
    )
  }
}
