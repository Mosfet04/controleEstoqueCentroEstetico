import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser, getUnidadeIdOrGlobal, requireUnidadeAccessOrGlobal } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidade = getUnidadeIdOrGlobal(request)
  if (rawUnidade instanceof NextResponse) return rawUnidade

  const unidadeId = await requireUnidadeAccessOrGlobal(user, rawUnidade)
  if (unidadeId instanceof NextResponse) return unidadeId

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    // Fetch insumos with quantity > 0
    const insumos = await prisma.insumo.findMany({
      where: {
        quantidade: { gt: 0 },
        ...(unidadeId ? { unidadeId } : {}),
      },
      select: {
        id: true,
        nome: true,
        lote: true,
        quantidade: true,
        unidade: { select: { nome: true } },
      },
    })

    if (insumos.length === 0) {
      return NextResponse.json([])
    }

    // Aggregate consumption (tipo = 'uso') per insumo over last 90 days
    const saidas = await prisma.saidaInsumo.groupBy({
      by: ['insumoId'],
      where: {
        insumoId: { in: insumos.map((i) => i.id) },
        tipo: 'uso',
        dataRetirada: { gte: ninetyDaysAgo },
      },
      _sum: { quantidade: true },
    })

    const consumoMap = new Map(
      saidas.map((s) => [s.insumoId, s._sum.quantidade ?? 0])
    )

    const result = insumos.map((i) => {
      const totalConsumo = consumoMap.get(i.id) ?? 0
      const mediaDiaria = totalConsumo / 90
      const diasRestantes = mediaDiaria > 0 ? Math.round(i.quantidade / mediaDiaria) : null

      return {
        id: i.id,
        nome: i.nome,
        lote: i.lote ?? '',
        unidadeNome: i.unidade.nome,
        quantidade: i.quantidade,
        mediaDiaria: Math.round(mediaDiaria * 10) / 10,
        diasRestantes,
      }
    })

    // Sort: items with days remaining first (ascending), then items with no consumption
    result.sort((a, b) => {
      if (a.diasRestantes === null && b.diasRestantes === null) return 0
      if (a.diasRestantes === null) return 1
      if (b.diasRestantes === null) return -1
      return a.diasRestantes - b.diasRestantes
    })

    return NextResponse.json(result)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/previsao' } })
    return NextResponse.json({ error: 'Erro ao calcular previsão' }, { status: 500 })
  }
}
