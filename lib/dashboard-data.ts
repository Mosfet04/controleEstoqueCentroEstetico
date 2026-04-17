import { prisma } from '@/lib/prisma'
import { calcularStatus } from '@/lib/insumo-utils'
import { nowSP } from '@/lib/utils'
import type { DashboardApi } from '@/lib/api'

export async function getDashboardData(referenceDate?: Date, unidadeId?: string, dateRange?: { from: Date; to: Date }): Promise<DashboardApi> {
  const now = nowSP()
  const ref = referenceDate ?? now
  const startOfMonth = dateRange?.from ?? new Date(ref.getFullYear(), ref.getMonth(), 1)
  const endOfMonth = dateRange?.to ?? new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59)
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

  const unitFilter = unidadeId ? { unidadeId } : {}

  const [allInsumos, saidasMes, descartesMes, ajustesMes, topSaidas] = await Promise.all([
    prisma.insumo.findMany({ where: unitFilter }),
    prisma.saidaInsumo.count({
      where: { ...unitFilter, dataRetirada: { gte: startOfMonth, lte: endOfMonth }, tipo: 'uso' },
    }),
    prisma.saidaInsumo.count({
      where: { ...unitFilter, dataRetirada: { gte: startOfMonth, lte: endOfMonth }, tipo: 'descarte' },
    }),
    prisma.saidaInsumo.count({
      where: { ...unitFilter, dataRetirada: { gte: startOfMonth, lte: endOfMonth }, tipo: 'ajuste' },
    }),
    prisma.saidaInsumo.groupBy({
      by: ['insumoId'],
      _sum: { quantidade: true },
      where: { ...unitFilter },
      orderBy: { _sum: { quantidade: 'desc' } },
      take: 5,
    }),
  ])

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

  const vencendo30 = insumosWithStatus
    .filter((i) => i.dataVencimento > now && i.dataVencimento <= thirtyDaysFromNow)
    .map((i) => ({ id: i.id, nome: i.nome, dataVencimento: i.dataVencimento.toISOString(), status: i.status }))

  const vencendo60 = insumosWithStatus
    .filter((i) => i.dataVencimento > now && i.dataVencimento <= sixtyDaysFromNow)
    .map((i) => ({ id: i.id, nome: i.nome, dataVencimento: i.dataVencimento.toISOString(), status: i.status }))

  const criticos = insumosWithStatus
    .filter((i) => i.status === 'critico' || i.status === 'atencao')
    .map((i) => ({
      id: i.id,
      nome: i.nome,
      quantidade: i.quantidade,
      quantidadeMinima: i.quantidadeMinima,
      status: i.status,
    }))

  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())

  const [movColabRaw, volTipoRaw, descartesRaw, fornecedoresRaw, atividadeRaw] = await Promise.all([
    prisma.saidaInsumo.groupBy({
      by: ['userId', 'tipo'],
      _sum: { quantidade: true },
      where: { ...unitFilter, dataRetirada: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.saidaInsumo.groupBy({
      by: ['tipo'],
      _sum: { quantidade: true },
      where: { ...unitFilter, dataRetirada: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.saidaInsumo.groupBy({
      by: ['insumoId'],
      _sum: { quantidade: true },
      where: {
        ...unitFilter,
        tipo: 'descarte',
        dataRetirada: { gte: startOfMonth, lte: endOfMonth },
      },
      orderBy: { _sum: { quantidade: 'desc' } },
      take: 5,
    }),
    prisma.insumo.groupBy({
      by: ['fornecedor'],
      _count: { id: true },
      where: unitFilter,
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.saidaInsumo.findMany({
      take: 10,
      where: unitFilter,
      orderBy: { dataRetirada: 'desc' },
      include: {
        insumo: { select: { nome: true } },
        user: { select: { name: true } },
      },
    }),
  ])

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

  const volumePorTipo = volTipoRaw.map((r) => ({
    tipo: r.tipo,
    total: r._sum.quantidade ?? 0,
  }))

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
              ...unitFilter,
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

  const fornecedores = fornecedoresRaw.map((r) => ({
    nome: r.fornecedor,
    total: r._count.id,
  }))

  const atividadeRecente = atividadeRaw.map((s) => ({
    id: s.id,
    insumoNome: s.insumo.nome,
    responsavel: s.user.name,
    tipo: s.tipo,
    quantidade: s.quantidade,
    dataRetirada: s.dataRetirada.toISOString(),
  }))

  return {
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
  }
}
