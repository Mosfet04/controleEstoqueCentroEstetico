import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser, getUnidadeIdOrGlobal, requireUnidadeAccessOrGlobal } from '@/lib/auth-helpers'
import { pedidoSchema } from '@/lib/validations'
import { withAuditContext } from '@/lib/audit-context'
import { pedidoInclude, serializePedido } from '@/lib/pedido'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeIdOrGlobal(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccessOrGlobal(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  try {
    const statusParam = request.nextUrl.searchParams.get('status')
    const status =
      statusParam === 'pendente' || statusParam === 'recebido' || statusParam === 'cancelado'
        ? statusParam
        : undefined

    const pedidos = await prisma.pedido.findMany({
      where: {
        ...(unidadeId ? { unidadeId } : {}),
        ...(status ? { status } : {}),
      },
      include: pedidoInclude,
      orderBy: { dataPedido: 'desc' },
    })

    return NextResponse.json(pedidos.map(serializePedido))
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/pedidos' } })
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 })
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
      { error: 'Selecione uma unidade específica para criar pedidos' },
      { status: 400 }
    )
  }

  return withAuditContext(user.id, async () => {
    try {
      const body = await request.json()
      const parsed = pedidoSchema.safeParse(body)

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
      }

      const { dataPrevista, ...rest } = parsed.data

      const pedido = await prisma.pedido.create({
        data: {
          ...rest,
          dataPrevista: dataPrevista ? new Date(dataPrevista) : null,
          unidadeId,
          userId: user.id,
        },
        include: pedidoInclude,
      })

      Sentry.addBreadcrumb({
        message: `Pedido criado: ${pedido.produto} (${pedido.fornecedor})`,
        category: 'pedido',
        data: { id: pedido.id, userId: user.id },
      })

      return NextResponse.json(serializePedido(pedido), { status: 201 })
    } catch (error) {
      Sentry.captureException(error, { tags: { route: 'POST /api/pedidos' } })
      return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 })
    }
  })
}
