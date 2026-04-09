import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuth, isUser, getUnidadeId, requireUnidadeAccess } from '@/lib/auth-helpers'
import { insumoSchema } from '@/lib/validations'
import { insumoWithStatus } from '@/lib/insumo-utils'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeId(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccess(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  const { id } = await params

  try {
    const insumo = await prisma.insumo.findUnique({ where: { id } })

    if (!insumo || insumo.unidadeId !== unidadeId) {
      return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 })
    }

    return NextResponse.json(insumoWithStatus(insumo))
  } catch (error) {
    Sentry.captureException(error, { tags: { route: `GET /api/insumos/${id}` } })
    return NextResponse.json({ error: 'Erro ao buscar insumo' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeId(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccess(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  const { id } = await params

  try {
    const existing = await prisma.insumo.findUnique({ where: { id } })
    if (!existing || existing.unidadeId !== unidadeId) {
      return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = insumoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { dataEntrada, dataVencimento, ...rest } = parsed.data

    const updated = await prisma.insumo.update({
      where: { id },
      data: {
        ...rest,
        dataEntrada: new Date(dataEntrada),
        dataVencimento: new Date(dataVencimento),
      },
    })

    Sentry.addBreadcrumb({
      message: `Insumo atualizado: ${updated.nome}`,
      category: 'insumo',
      data: { id, userId: user.id },
    })

    return NextResponse.json(insumoWithStatus(updated))
  } catch (error) {
    Sentry.captureException(error, { tags: { route: `PUT /api/insumos/${id}` } })
    return NextResponse.json({ error: 'Erro ao atualizar insumo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeId(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccess(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  const { id } = await params

  try {
    const existing = await prisma.insumo.findUnique({ where: { id } })
    if (!existing || existing.unidadeId !== unidadeId) {
      return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 })
    }

    await prisma.insumo.delete({ where: { id } })

    Sentry.addBreadcrumb({
      message: `Insumo excluído: ${existing.nome}`,
      category: 'insumo',
      data: { id, userId: user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      return NextResponse.json(
        { error: 'Este insumo possui saídas registradas e não pode ser excluído.' },
        { status: 409 }
      )
    }
    Sentry.captureException(error, { tags: { route: `DELETE /api/insumos/${id}` } })
    return NextResponse.json({ error: 'Erro ao excluir insumo' }, { status: 500 })
  }
}
