import type { Pedido } from '@prisma/client'

export type PedidoWithRelations = Pedido & {
  user: { name: string }
  unidade: { nome: string }
}

/** Prisma include shared by every pedido route. */
export const pedidoInclude = {
  user: { select: { name: true } },
  unidade: { select: { nome: true } },
} as const

/** Shapes a Pedido (with relations) into the JSON returned by the API. */
export function serializePedido(p: PedidoWithRelations) {
  return {
    id: p.id,
    fornecedor: p.fornecedor,
    produto: p.produto,
    quantidade: p.quantidade,
    status: p.status,
    observacao: p.observacao,
    dataPedido: p.dataPedido,
    dataPrevista: p.dataPrevista,
    dataRecebimento: p.dataRecebimento,
    responsavel: p.user.name,
    unidadeId: p.unidadeId,
    unidadeNome: p.unidade.nome,
    createdAt: p.createdAt,
  }
}
