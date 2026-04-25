import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser, getUnidadeIdOrGlobal, requireUnidadeAccessOrGlobal } from '@/lib/auth-helpers'
import { insumoSchema } from '@/lib/validations'
import { insumoWithStatus } from '@/lib/insumo-utils'
import { withAuditContext } from '@/lib/audit-context'

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
    const search = searchParams.get('q')?.trim()

    const insumos = await prisma.insumo.findMany({
      where: {
        ...(unidadeId ? { unidadeId } : {}),
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
      },
      include: {
        unidade: { select: { nome: true } },
        tipoInsumo: { select: { slug: true, nome: true, cor: true } },
      },
      orderBy: [{ nome: 'asc' }, { dataVencimento: 'asc' }],
    })

    return NextResponse.json(
      insumos.map(({ unidade, tipoInsumo, ...rest }) => ({
        ...insumoWithStatus(rest),
        tipo: tipoInsumo.slug,
        tipoNome: tipoInsumo.nome,
        tipoCor: tipoInsumo.cor,
        unidadeNome: unidade.nome,
      }))
    )
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


export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeIdOrGlobal(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccessOrGlobal(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  try {
    const { searchParams } = request.nextUrl
    const tipo = searchParams.get('tipo') as TipoInsumo | null
    const search = searchParams.get('q')?.trim()

    const insumos = await prisma.insumo.findMany({
      where: {
        ...(unidadeId ? { unidadeId } : {}),
        ...(tipo ? { tipo } : {}),
        ...(search
          ? {
              OR: [
                { nome: { contains: search, mode: 'insensitive' } },
                { lote: { contains: search, mode: 'insensitive' } },
                { fornecedor: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { unidade: { select: { nome: true } } },
      orderBy: [{ nome: 'asc' }, { dataVencimento: 'asc' }],
    })

    return NextResponse.json(
      insumos.map(({ unidade, ...rest }) => ({
        ...insumoWithStatus(rest),
        unidadeNome: unidade.nome,
      }))
    )
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

      const { dataEntrada, dataVencimento, ...rest } = parsed.data

      const insumo = await prisma.insumo.create({
        data: {
          ...rest,
          dataEntrada: new Date(dataEntrada),
          dataVencimento: new Date(dataVencimento),
          unidadeId,
        },
      })

      Sentry.addBreadcrumb({
        message: `Insumo criado: ${insumo.nome}`,
        category: 'insumo',
        data: { id: insumo.id, userId: user.id },
      })

      return NextResponse.json(insumoWithStatus(insumo), { status: 201 })
    } catch (error) {
      Sentry.captureException(error, { tags: { route: 'POST /api/insumos' } })
      return NextResponse.json({ error: 'Erro ao criar insumo' }, { status: 500 })
    }
  })
}
