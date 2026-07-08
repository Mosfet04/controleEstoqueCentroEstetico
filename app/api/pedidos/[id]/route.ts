import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser, getUnidadeId, requireUnidadeAccess } from '@/lib/auth-helpers'
import { pedidoUpdateSchema } from '@/lib/validations'
import { withAuditContext } from '@/lib/audit-context'
import { pedidoInclude, serializePedido } from '@/lib/pedido'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeId(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccess(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  const { id } = await params

  return withAuditContext(user.id, async () => {
    try {
      const existing = await prisma.pedido.findUnique({ where: { id } })
      if (!existing || existing.unidadeId !== unidadeId) {
        return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
      }

      if (existing.status === 'recebido') {
        return NextResponse.json(
          { error: 'Pedido já recebido não pode ser alterado' },
          { status: 409 }
        )
      }

      const body = await request.json()
      const parsed = pedidoUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
      }

      const { dataPrevista, ...rest } = parsed.data

      const updated = await prisma.pedido.update({
        where: { id },
        data: {
          ...rest,
          ...(dataPrevista !== undefined
            ? { dataPrevista: dataPrevista ? new Date(dataPrevista) : null }
            : {}),
        },
        include: pedidoInclude,
      })

      return NextResponse.json(serializePedido(updated))
    } catch (error) {
      Sentry.captureException(error, { tags: { route: `PATCH /api/pedidos/${id}` } })
      return NextResponse.json({ error: 'Erro ao atualizar pedido' }, { status: 500 })
    }
  })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeId(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccess(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  const { id } = await params

  return withAuditContext(user.id, async () => {
    try {
      const existing = await prisma.pedido.findUnique({ where: { id } })
      if (!existing || existing.unidadeId !== unidadeId) {
        return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
      }

      await prisma.pedido.delete({ where: { id } })

      Sentry.addBreadcrumb({
        message: `Pedido excluído: ${existing.produto}`,
        category: 'pedido',
        data: { id, userId: user.id },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      Sentry.captureException(error, { tags: { route: `DELETE /api/pedidos/${id}` } })
      return NextResponse.json({ error: 'Erro ao excluir pedido' }, { status: 500 })
    }
  })
}
