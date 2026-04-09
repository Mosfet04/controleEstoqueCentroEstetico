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

    const [allInsumos, saidasMes, descartesMes, ajustesMes, topSaidas] = await Promise.all([
      prisma.insumo.findMany(),
      prisma.saidaInsumo.count({
        where: { dataRetirada: { gte: startOfMonth, lte: endOfMonth }, tipo: 'uso' },
      }),
      prisma.saidaInsumo.count({
        where: { dataRetirada: { gte: startOfMonth, lte: endOfMonth }, tipo: 'descarte' },
      }),
      prisma.saidaInsumo.count({
        where: { dataRetirada: { gte: startOfMonth, lte: endOfMonth }, tipo: 'ajuste' },
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
      descartesMes,
      ajustesMes,
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

    // --- Enrichment queries ---
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())

    const [movColabRaw, volTipoRaw, descartesRaw, fornecedoresRaw, atividadeRaw] = await Promise.all([
      prisma.saidaInsumo.groupBy({
        by: ['userId', 'tipo'],
        _sum: { quantidade: true },
        where: { dataRetirada: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.saidaInsumo.groupBy({
        by: ['tipo'],
        _sum: { quantidade: true },
        where: { dataRetirada: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.saidaInsumo.groupBy({
        by: ['insumoId'],
        _sum: { quantidade: true },
        where: {
          tipo: 'descarte',
          dataRetirada: { gte: startOfMonth, lte: endOfMonth },
        },
        orderBy: { _sum: { quantidade: 'desc' } },
        take: 5,
      }),
      prisma.insumo.groupBy({
        by: ['fornecedor'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      prisma.saidaInsumo.findMany({
        take: 10,
        orderBy: { dataRetirada: 'desc' },
        include: {
          insumo: { select: { nome: true } },
          user: { select: { name: true } },
        },
      }),
    ])

    // Movimentação por colaborador
    const colabUserIds = [...new Set(movColabRaw.map((r) => r.userId))]
    const colabUsers =
      colabUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: colabUserIds } },
            select: { id: true, name: true },
          })
        : []
    const colabUserMap = Object.fromEntries(colabUsers.map((u) => [u.id, u.name]))
    const colabPivot = new Map<
      string,
      { nome: string; uso: number; descarte: number; ajuste: number }
    >()
    for (const row of movColabRaw) {
      const existing = colabPivot.get(row.userId) ?? {
        nome: colabUserMap[row.userId] ?? 'Desconhecido',
        uso: 0,
        descarte: 0,
        ajuste: 0,
      }
      if (row.tipo === 'uso') existing.uso = row._sum.quantidade ?? 0
      else if (row.tipo === 'descarte') existing.descarte = row._sum.quantidade ?? 0
      else if (row.tipo === 'ajuste') existing.ajuste = row._sum.quantidade ?? 0
      colabPivot.set(row.userId, existing)
    }
    const movimentacaoColaborador = Array.from(colabPivot.values())
      .map((c) => ({ ...c, total: c.uso + c.descarte + c.ajuste }))
      .sort((a, b) => b.total - a.total)

    // Volume por tipo de saída
    const volumePorTipo = volTipoRaw.map((r) => ({
      tipo: r.tipo,
      total: r._sum.quantidade ?? 0,
    }))

    // Top descartes
    const descarteInsumoIds = descartesRaw.map((r) => r.insumoId)
    const [descarteInsumos, descarteSaidas] =
      descarteInsumoIds.length > 0
        ? await Promise.all([
            prisma.insumo.findMany({
              where: { id: { in: descarteInsumoIds } },
              select: { id: true, nome: true },
            }),
            prisma.saidaInsumo.findMany({
              where: {
                tipo: 'descarte',
                insumoId: { in: descarteInsumoIds },
                dataRetirada: { gte: startOfMonth, lte: endOfMonth },
              },
              select: { insumoId: true, motivo: true },
            }),
          ])
        : [[], []]
    const descarteNameMap = Object.fromEntries(
      descarteInsumos.map((i) => [i.id, i.nome])
    )
    const motivoCountMap = new Map<string, Map<string, number>>()
    for (const s of descarteSaidas) {
      if (!s.motivo) continue
      const insumoMotivos =
        motivoCountMap.get(s.insumoId) ?? new Map<string, number>()
      insumoMotivos.set(s.motivo, (insumoMotivos.get(s.motivo) ?? 0) + 1)
      motivoCountMap.set(s.insumoId, insumoMotivos)
    }
    const topDescartes = descartesRaw.map((r) => {
      const motivos = motivoCountMap.get(r.insumoId)
      let topMotivo = '-'
      if (motivos) {
        topMotivo =
          [...motivos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-'
      }
      return {
        nome: descarteNameMap[r.insumoId] ?? 'Desconhecido',
        total: r._sum.quantidade ?? 0,
        motivo: topMotivo,
      }
    })

    // Insumos zerados (agrupado por nome, exclui inativos >2 meses)
    const recentInsumos = allInsumos.filter((i) => i.updatedAt >= twoMonthsAgo)
    const zeradoMap = new Map<
      string,
      { quantidade: number; tipo: string; fornecedor: string }
    >()
    for (const i of recentInsumos) {
      const existing = zeradoMap.get(i.nome)
      if (existing) {
        existing.quantidade += i.quantidade
      } else {
        zeradoMap.set(i.nome, {
          quantidade: i.quantidade,
          tipo: i.tipo,
          fornecedor: i.fornecedor,
        })
      }
    }
    const insumosZerados = [...zeradoMap.entries()]
      .filter(([, v]) => v.quantidade === 0)
      .map(([nome, v]) => ({ nome, tipo: v.tipo, fornecedor: v.fornecedor }))

    // Fornecedores
    const fornecedores = fornecedoresRaw.map((r) => ({
      nome: r.fornecedor,
      total: r._count.id,
    }))

    // Atividade recente
    const atividadeRecente = atividadeRaw.map((s) => ({
      id: s.id,
      insumoNome: s.insumo.nome,
      responsavel: s.user.name,
      tipo: s.tipo,
      quantidade: s.quantidade,
      dataRetirada: s.dataRetirada.toISOString(),
    }))

    return NextResponse.json({
      metrics,
      byTipo,
      byStatus,
      topConsumo,
      vencendo30,
      vencendo60,
      criticos,
      movimentacaoColaborador,
      volumePorTipo,
      topDescartes,
      insumosZerados,
      fornecedores,
      atividadeRecente,
    })
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/dashboard' } })
    return NextResponse.json({ error: 'Erro ao buscar métricas' }, { status: 500 })
  }
}
