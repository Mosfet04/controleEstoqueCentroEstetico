import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin, isUser } from '@/lib/auth-helpers'
import { calcularStatus } from '@/lib/insumo-utils'

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!isUser(admin)) return admin

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const unidades = await prisma.unidade.findMany({
      where: { ativa: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    })

    const result = await Promise.all(
      unidades.map(async (u) => {
        const [insumos, saidasMes, descartesMes, ajustesMes] = await Promise.all([
          prisma.insumo.findMany({ where: { unidadeId: u.id } }),
          prisma.saidaInsumo.count({
            where: { unidadeId: u.id, dataRetirada: { gte: startOfMonth, lte: endOfMonth }, tipo: 'uso' },
          }),
          prisma.saidaInsumo.count({
            where: { unidadeId: u.id, dataRetirada: { gte: startOfMonth, lte: endOfMonth }, tipo: 'descarte' },
          }),
          prisma.saidaInsumo.count({
            where: { unidadeId: u.id, dataRetirada: { gte: startOfMonth, lte: endOfMonth }, tipo: 'ajuste' },
          }),
        ])

        const withStatus = insumos.map((i) => ({
          ...i,
          status: calcularStatus(i.quantidade, i.quantidadeMinima, i.dataVencimento),
        }))

        return {
          id: u.id,
          nome: u.nome,
          totalInsumos: insumos.length,
          insumosAtivos: insumos.filter((i) => i.quantidade > 0).length,
          insumosCriticos: withStatus.filter((i) => i.status === 'critico').length,
          insumosVencendo: insumos.filter(
            (i) => i.dataVencimento > now && i.dataVencimento <= thirtyDaysFromNow
          ).length,
          saidasMes,
          descartesMes,
          ajustesMes,
        }
      })
    )

    return NextResponse.json({ unidades: result })
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/comparativo' } })
    return NextResponse.json({ error: 'Erro ao gerar comparativo' }, { status: 500 })
  }
}
