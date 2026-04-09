import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser } from '@/lib/auth-helpers'
import { calcularStatus } from '@/lib/insumo-utils'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

    const [allInsumos, saidasMes, topSaidas] = await Promise.all([
      prisma.insumo.findMany(),
      prisma.saidaInsumo.count({
        where: { dataRetirada: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.saidaInsumo.groupBy({
        by: ['insumoId'],
        _sum: { quantidade: true },
        orderBy: { _sum: { quantidade: 'desc' } },
        take: 5,
      }),
    ])

    // Compute status for each insumo dynamically
    const insumosWithStatus = allInsumos.map((i) => ({
      ...i,
      status: calcularStatus(i.quantidade, i.quantidadeMinima, i.dataVencimento),
    }))

    const metrics = {
      totalInsumos: allInsumos.length,
      insumosAtivos: allInsumos.filter((i) => i.quantidade > 0).length,
      insumosVencendo: allInsumos.filter(
        (i) => i.dataVencimento > now && i.dataVencimento <= thirtyDaysFromNow
      ).length,
      insumosVencidos: allInsumos.filter((i) => i.dataVencimento <= now).length,
      insumosCriticos: insumosWithStatus.filter((i) => i.status === 'critico').length,
      insumosAtencao: insumosWithStatus.filter((i) => i.status === 'atencao').length,
      saidasMes,
    }

    const byTipo = {
      injetavel: allInsumos.filter((i) => i.tipo === 'injetavel').length,
      descartavel: allInsumos.filter((i) => i.tipo === 'descartavel').length,
      peeling: allInsumos.filter((i) => i.tipo === 'peeling').length,
    }

    const byStatus = {
      bom: insumosWithStatus.filter((i) => i.status === 'bom').length,
      atencao: insumosWithStatus.filter((i) => i.status === 'atencao').length,
      critico: insumosWithStatus.filter((i) => i.status === 'critico').length,
    }

    // Enrich topSaidas with insumo names
    const insumoIds = topSaidas.map((s) => s.insumoId)
    const insumoNames = await prisma.insumo.findMany({
      where: { id: { in: insumoIds } },
      select: { id: true, nome: true },
    })
    const nameMap = Object.fromEntries(insumoNames.map((i) => [i.id, i.nome]))
    const topConsumo = topSaidas.map((s) => ({
      nome: nameMap[s.insumoId] ?? 'Desconhecido',
      total: s._sum.quantidade ?? 0,
    }))

    // Alerts
    const vencendo30 = insumosWithStatus
      .filter((i) => i.dataVencimento > now && i.dataVencimento <= thirtyDaysFromNow)
      .map((i) => ({ id: i.id, nome: i.nome, dataVencimento: i.dataVencimento, status: i.status }))

    const vencendo60 = insumosWithStatus
      .filter((i) => i.dataVencimento > now && i.dataVencimento <= sixtyDaysFromNow)
      .map((i) => ({ id: i.id, nome: i.nome, dataVencimento: i.dataVencimento, status: i.status }))

    const criticos = insumosWithStatus
      .filter((i) => i.status === 'critico' || i.status === 'atencao')
      .map((i) => ({
        id: i.id,
        nome: i.nome,
        quantidade: i.quantidade,
        quantidadeMinima: i.quantidadeMinima,
        status: i.status,
      }))

    return NextResponse.json({
      metrics,
      byTipo,
      byStatus,
      topConsumo,
      vencendo30,
      vencendo60,
      criticos,
    })
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/dashboard' } })
    return NextResponse.json({ error: 'Erro ao buscar métricas' }, { status: 500 })
  }
}
