import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { TZDate } from '@date-fns/tz'
import { startOfMonth, endOfMonth } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { getDashboardData } from '@/lib/dashboard-data'
import { generateReport } from '@/lib/report-generator'
import { sendReportEmail } from '@/lib/email'
import { SP_TIMEZONE } from '@/lib/utils'

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

    // O cron é agendado em UTC (`0 1 1 * *` = 01:00 UTC). Em SP isso é 22:00 do dia 31
    // do mês anterior — `nowSP()` ainda retorna o mês "atual" da perspectiva SP, e
    // `getMonth() - 1` voltaria DOIS meses. Buffer de 5 dias para trás garante que
    // pousamos com folga no mês recém-encerrado, em qualquer fuso/horário de execução.
    const reference = new TZDate(Date.now() - 5 * 24 * 60 * 60 * 1000, SP_TIMEZONE)
    const periodStart = startOfMonth(reference)
    const periodEnd = endOfMonth(reference)
    const month = String(reference.getMonth() + 1).padStart(2, '0')
    const year = reference.getFullYear()

    const unidades = await prisma.unidade.findMany({ where: { ativa: true } })

    for (const unidade of unidades) {
      const data = await getDashboardData(undefined, unidade.id, {
        from: periodStart,
        to: periodEnd,
      })
      const buffer = await generateReport(data)

      await sendReportEmail({
        to: admins.map((a) => a.email),
        subject: `Relatório Mensal de Estoque — ${unidade.nome} — ${month}/${year}`,
        xlsxBuffer: buffer,
        filename: `relatorio-estoque-${unidade.nome.toLowerCase().replace(/\s+/g, '-')}-${year}-${month}.xlsx`,
      })
    }

    return NextResponse.json({
      message: `Relatório enviado para ${admins.length} admin(s) — ${unidades.length} unidade(s)`,
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
