import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  try {
    const { searchParams } = request.nextUrl
    const produtos = searchParams.get('produto')?.split(',').map((s) => s.trim()).filter(Boolean)
    const fornecedoresParam = searchParams.get('fornecedor')?.split(',').map((s) => s.trim()).filter(Boolean)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Record<string, unknown> = {
      precoUnitario: { not: null },
    }

    if (produtos && produtos.length > 0) {
      where.nome = { in: produtos }
    }
    if (fornecedoresParam && fornecedoresParam.length > 0) {
      where.fornecedor = { in: fornecedoresParam }
    }
    if (from || to) {
      const dateFilter: Record<string, Date> = {}
      if (from) dateFilter.gte = new Date(from)
      if (to) dateFilter.lte = new Date(to)
      where.dataEntrada = dateFilter
    }

    const insumos = await prisma.insumo.findMany({
      where,
      select: {
        nome: true,
        fornecedor: true,
        tipo: true,
        precoUnitario: true,
        dataEntrada: true,
      },
      orderBy: [{ fornecedor: 'asc' }, { nome: 'asc' }],
    })

    const grouped = new Map<string, {
      fornecedor: string
      produto: string
      tipo: string
      precos: number[]
      ultimaEntrada: Date | null
    }>()

    for (const insumo of insumos) {
      const key = `${insumo.fornecedor}::${insumo.nome}`
      const existing = grouped.get(key)
      const preco = Number(insumo.precoUnitario)

      if (existing) {
        existing.precos.push(preco)
        if (!existing.ultimaEntrada || insumo.dataEntrada > existing.ultimaEntrada) {
          existing.ultimaEntrada = insumo.dataEntrada
        }
      } else {
        grouped.set(key, {
          fornecedor: insumo.fornecedor,
          produto: insumo.nome,
          tipo: insumo.tipo,
          precos: [preco],
          ultimaEntrada: insumo.dataEntrada,
        })
      }
    }

    const result = Array.from(grouped.values()).map((g) => ({
      fornecedor: g.fornecedor,
      produto: g.produto,
      tipo: g.tipo,
      entradas: g.precos.length,
      precoMedio: Math.round((g.precos.reduce((a, b) => a + b, 0) / g.precos.length) * 100) / 100,
      precoMinimo: Math.min(...g.precos),
      precoMaximo: Math.max(...g.precos),
      ultimaEntrada: g.ultimaEntrada?.toISOString() ?? null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/fornecedores' } })
    return NextResponse.json({ error: 'Erro ao buscar dados de fornecedores' }, { status: 500 })
  }
}
