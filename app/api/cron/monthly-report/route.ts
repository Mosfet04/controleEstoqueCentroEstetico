import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { getDashboardData } from '@/lib/dashboard-data'
import { generateReport } from '@/lib/report-generator'
import { sendReportEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true },
    })

    if (admins.length === 0) {
      return NextResponse.json({ message: 'Nenhum admin encontrado' })
    }

    const data = await getDashboardData()
    const buffer = await generateReport(data)

    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()

    await sendReportEmail({
      to: admins.map((a) => a.email),
      subject: `Relatório Mensal de Estoque — ${month}/${year}`,
      xlsxBuffer: buffer,
      filename: `relatorio-estoque-${year}-${month}.xlsx`,
    })

    return NextResponse.json({
      message: `Relatório enviado para ${admins.length} admin(s)`,
    })
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: 'GET /api/cron/monthly-report' },
    })
    return NextResponse.json(
      { error: 'Erro ao enviar relatório mensal' },
      { status: 500 }
    )
  }
}
