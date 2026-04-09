import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { requireAuth, isUser, getUnidadeIdOrGlobal, requireUnidadeAccessOrGlobal } from '@/lib/auth-helpers'
import { getDashboardData } from '@/lib/dashboard-data'
import { generateReport } from '@/lib/report-generator'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeIdOrGlobal(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccessOrGlobal(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  try {
    const data = await getDashboardData(undefined, unidadeId ?? undefined)
    const buffer = await generateReport(data)

    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    const filename = `relatorio-estoque-${year}-${month}.xlsx`

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
