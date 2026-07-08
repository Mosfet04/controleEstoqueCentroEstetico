import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser, getUnidadeId, requireUnidadeAccess } from '@/lib/auth-helpers'
import { insumoSchema } from '@/lib/validations'
import { withAuditContext } from '@/lib/audit-context'
import { createAuditLog } from '@/lib/audit'
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
        // Reivindica o pedido de forma atômica: apenas um recebimento concorrente
        // vence a transição pendente → recebido, evitando entrada de estoque duplicada.
        const claim = await tx.pedido.updateMany({
          where: { id, status: 'pendente' },
          data: { status: 'recebido', dataRecebimento: nowSP() },
        })
        if (claim.count === 0) {
          throw new Error('PEDIDO_NOT_PENDING')
        }

        await tx.insumo.create({
          data: {
            ...rest,
            // Nome e fornecedor da entrada derivam do pedido, não do payload do cliente.
            nome: pedido.produto,
            fornecedor: pedido.fornecedor,
            tipoId,
            dataEntrada: new Date(dataEntrada),
            dataVencimento: new Date(dataVencimento),
            unidadeId: pedido.unidadeId,
          },
        })

        return tx.pedido.findUniqueOrThrow({ where: { id }, include: pedidoInclude })
      })

      // updateMany não é auto-auditado pela extensão do Prisma — registra manualmente.
      await createAuditLog({
        userId: user.id,
        action: 'UPDATE',
        entity: 'pedido',
        entityId: id,
        details: { status: 'recebido', produto: pedido.produto, fornecedor: pedido.fornecedor },
      })

      Sentry.addBreadcrumb({
        message: `Pedido recebido: ${pedido.produto} (${pedido.fornecedor})`,
        category: 'pedido',
        data: { id, userId: user.id },
      })

      return NextResponse.json(serializePedido(updated))
    } catch (error) {
      if (error instanceof Error && error.message === 'PEDIDO_NOT_PENDING') {
        return NextResponse.json(
          { error: 'Apenas pedidos pendentes podem ser recebidos' },
          { status: 409 }
        )
      }
      Sentry.captureException(error, { tags: { route: `POST /api/pedidos/${id}/receber` } })
      return NextResponse.json({ error: 'Erro ao receber pedido' }, { status: 500 })
    }
  })
}
