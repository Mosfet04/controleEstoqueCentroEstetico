import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser, getUnidadeId } from '@/lib/auth-helpers'
import { insumoSchema } from '@/lib/validations'
import { insumoWithStatus } from '@/lib/insumo-utils'
import { TipoInsumo } from '@prisma/client'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const unidadeId = getUnidadeId(request)
  if (unidadeId instanceof NextResponse) return unidadeId

  try {
    const { searchParams } = request.nextUrl
    const tipo = searchParams.get('tipo') as TipoInsumo | null
    const search = searchParams.get('q')?.trim()

    const insumos = await prisma.insumo.findMany({
      where: {
        unidadeId,
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
      orderBy: [{ nome: 'asc' }, { dataVencimento: 'asc' }],
    })

    return NextResponse.json(insumos.map(insumoWithStatus))
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/insumos' } })
    return NextResponse.json({ error: 'Erro ao buscar insumos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const unidadeId = getUnidadeId(request)
  if (unidadeId instanceof NextResponse) return unidadeId

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
}
