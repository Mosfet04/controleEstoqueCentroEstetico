import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser, getUnidadeIdOrGlobal, requireUnidadeAccessOrGlobal } from '@/lib/auth-helpers'
import { insumoSchema } from '@/lib/validations'
import { insumoWithStatus, calcularStatus, StatusEstoque } from '@/lib/insumo-utils'
import { withAuditContext } from '@/lib/audit-context'

const insumoInclude = {
  unidade: { select: { nome: true } },
  tipoInsumo: { select: { slug: true, nome: true, cor: true } },
} satisfies Prisma.InsumoInclude

function mapInsumo({
  unidade,
  tipoInsumo,
  ...rest
}: Prisma.InsumoGetPayload<{ include: typeof insumoInclude }>) {
  return {
    ...insumoWithStatus(rest),
    tipo: tipoInsumo.slug,
    tipoNome: tipoInsumo.nome,
    tipoCor: tipoInsumo.cor,
    unidadeNome: unidade.nome,
  }
}

const STATUS_VALUES: StatusEstoque[] = ['bom', 'atencao', 'critico']

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeIdOrGlobal(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccessOrGlobal(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  try {
    const { searchParams } = request.nextUrl
    const tipoSlug = searchParams.get('tipo')
    const tipoId = searchParams.get('tipoId')
    const search = searchParams.get('q')?.trim()

    const where: Prisma.InsumoWhereInput = {
      ...(unidadeId ? { unidadeId } : {}),
      ...(tipoId ? { tipoId } : {}),
      ...(tipoSlug ? { tipoInsumo: { slug: tipoSlug } } : {}),
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: 'insensitive' } },
              { lote: { contains: search, mode: 'insensitive' } },
              { fornecedor: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const orderBy: Prisma.InsumoOrderByWithRelationInput[] = [
      { nome: 'asc' },
      { dataVencimento: 'asc' },
    ]

    // Modo legado (sem `page`): retorna um array simples — usado pela tela de saídas.
    if (!searchParams.has('page')) {
      const insumos = await prisma.insumo.findMany({ where, include: insumoInclude, orderBy })
      return NextResponse.json(insumos.map(mapInsumo))
    }

    // Modo paginado: retorna { data, total, page, limit, totalPages }.
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || 20), 100)
    const skip = (page - 1) * limit

    const statusParam = searchParams.get('status')
    const status = STATUS_VALUES.includes(statusParam as StatusEstoque)
      ? (statusParam as StatusEstoque)
      : null

    const envelope = (data: ReturnType<typeof mapInsumo>[], total: number) => ({
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })

    if (!status) {
      const [rows, total] = await Promise.all([
        prisma.insumo.findMany({ where, include: insumoInclude, orderBy, skip, take: limit }),
        prisma.insumo.count({ where }),
      ])
      return NextResponse.json(envelope(rows.map(mapInsumo), total))
    }

    // O status é derivado (qtd. vs mínimo + vencimento) e não é filtrável no banco;
    // buscamos só as colunas necessárias, calculamos e paginamos os IDs em memória.
    const candidatos = await prisma.insumo.findMany({
      where,
      select: { id: true, quantidade: true, quantidadeMinima: true, dataVencimento: true },
      orderBy,
    })
    const idsFiltrados = candidatos
      .filter((c) => calcularStatus(c.quantidade, c.quantidadeMinima, c.dataVencimento) === status)
      .map((c) => c.id)

    const idsPagina = idsFiltrados.slice(skip, skip + limit)
    const rows = await prisma.insumo.findMany({ where: { id: { in: idsPagina } }, include: insumoInclude })
    const porId = new Map(rows.map((r) => [r.id, r]))
    const data = idsPagina.map((id) => mapInsumo(porId.get(id)!))

    return NextResponse.json(envelope(data, idsFiltrados.length))
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/insumos' } })
    return NextResponse.json({ error: 'Erro ao buscar insumos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeIdOrGlobal(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccessOrGlobal(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  if (unidadeId === null) {
    return NextResponse.json(
      { error: 'Selecione uma unidade específica para criar insumos' },
      { status: 400 }
    )
  }

  return withAuditContext(user.id, async () => {
    try {
      const body = await request.json()
      const parsed = insumoSchema.safeParse(body)

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
      }

      const { dataEntrada, dataVencimento, tipoId, ...rest } = parsed.data

      // Validate tipoId exists
      const tipoExists = await prisma.tipoInsumo.findFirst({ where: { id: tipoId, ativo: true } })
      if (!tipoExists) {
        return NextResponse.json({ error: 'Tipo de insumo não encontrado' }, { status: 422 })
      }

      const insumo = await prisma.insumo.create({
        data: {
          ...rest,
          tipoId,
          dataEntrada: new Date(dataEntrada),
          dataVencimento: new Date(dataVencimento),
          unidadeId,
        },
        include: { tipoInsumo: { select: { slug: true, nome: true, cor: true } } },
      })

      Sentry.addBreadcrumb({
        message: `Insumo criado: ${insumo.nome}`,
        category: 'insumo',
        data: { id: insumo.id, userId: user.id },
      })

      const { tipoInsumo, ...insumoRest } = insumo
      return NextResponse.json(
        { ...insumoWithStatus(insumoRest), tipo: tipoInsumo.slug, tipoNome: tipoInsumo.nome, tipoCor: tipoInsumo.cor },
        { status: 201 }
      )
    } catch (error) {
      Sentry.captureException(error, { tags: { route: 'POST /api/insumos' } })
      return NextResponse.json({ error: 'Erro ao criar insumo' }, { status: 500 })
    }
  })
}
