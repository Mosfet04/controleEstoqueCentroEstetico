import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser, getUnidadeId, requireUnidadeAccess } from '@/lib/auth-helpers'
import { insumoSchema } from '@/lib/validations'
import { withAuditContext } from '@/lib/audit-context'
import { pedidoInclude, serializePedido } from '@/lib/pedido'
import { nowSP } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

/**
 * Recebe um pedido: dá entrada no estoque (cria um Insumo/novo lote) e marca o
 * pedido como "recebido" — tudo em uma única transação atômica.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeId(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccess(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  const { id } = await params

  return withAuditContext(user.id, async () => {
    try {
      const pedido = await prisma.pedido.findUnique({ where: { id } })
      if (!pedido || pedido.unidadeId !== unidadeId) {
        return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
      }
      if (pedido.status !== 'pendente') {
        return NextResponse.json(
          { error: 'Apenas pedidos pendentes podem ser recebidos' },
          { status: 409 }
        )
      }

      const body = await request.json()
      const parsed = insumoSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
      }

      const { dataEntrada, dataVencimento, tipoId, ...rest } = parsed.data

      const tipoExists = await prisma.tipoInsumo.findFirst({ where: { id: tipoId, ativo: true } })
      if (!tipoExists) {
        return NextResponse.json({ error: 'Tipo de insumo não encontrado' }, { status: 422 })
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.insumo.create({
          data: {
            ...rest,
            tipoId,
            dataEntrada: new Date(dataEntrada),
            dataVencimento: new Date(dataVencimento),
            unidadeId: pedido.unidadeId,
          },
        })

        return tx.pedido.update({
          where: { id },
          data: { status: 'recebido', dataRecebimento: nowSP() },
          include: pedidoInclude,
        })
      })

      Sentry.addBreadcrumb({
        message: `Pedido recebido: ${pedido.produto} (${pedido.fornecedor})`,
        category: 'pedido',
        data: { id, userId: user.id },
      })

      return NextResponse.json(serializePedido(updated))
    } catch (error) {
      Sentry.captureException(error, { tags: { route: `POST /api/pedidos/${id}/receber` } })
      return NextResponse.json({ error: 'Erro ao receber pedido' }, { status: 500 })
    }
  })
}
