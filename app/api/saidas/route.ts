import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser, getUnidadeIdOrGlobal, requireUnidadeAccessOrGlobal } from '@/lib/auth-helpers'
import { saidaSchema } from '@/lib/validations'
import { withAuditContext } from '@/lib/audit-context'
import { nowSP } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeIdOrGlobal(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccessOrGlobal(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  try {
    const saidas = await prisma.saidaInsumo.findMany({
      where: { ...(unidadeId ? { unidadeId } : {}) },
      include: {
        insumo: { select: { nome: true, lote: true } },
        user: { select: { name: true, email: true } },
        unidade: { select: { nome: true } },
        tipoSaida: { select: { id: true, nome: true, slug: true, categoria: true, cor: true } },
      },
      orderBy: { dataRetirada: 'desc' },
    })

    const formatted = saidas.map((s) => ({
      id: s.id,
      insumoId: s.insumoId,
      insumoNome: s.insumo.nome,
      insumoLote: s.insumo.lote,
      quantidade: s.quantidade,
      tipoSaida: s.tipoSaida,
      motivo: s.motivo,
      responsavel: s.user.name,
      observacao: s.observacao,
      dataRetirada: s.dataRetirada,
      createdAt: s.createdAt,
      unidadeNome: s.unidade.nome,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/saidas' } })
    return NextResponse.json({ error: 'Erro ao buscar saídas' }, { status: 500 })
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
      { error: 'Selecione uma unidade específica para registrar saídas' },
      { status: 400 }
    )
  }

  return withAuditContext(user.id, async () => {
    try {
      const body = await request.json()
      const parsed = saidaSchema.safeParse(body)

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
      }

      const { insumoId, quantidade, tipoSaidaId, motivo, observacao } = parsed.data

      const tipoSaida = await prisma.tipoSaida.findUnique({ where: { id: tipoSaidaId } })
      if (!tipoSaida || !tipoSaida.ativo) {
        return NextResponse.json({ error: 'Tipo de saída inválido ou inativo' }, { status: 422 })
      }

      if (tipoSaida.categoria !== 'uso' && (!motivo || motivo.trim().length === 0)) {
        return NextResponse.json(
          { error: 'Motivo é obrigatório para descarte e ajuste de estoque' },
          { status: 422 }
        )
      }

      // Atomic: verify stock and create saída in a single transaction
      const result = await prisma.$transaction(async (tx) => {
        const insumo = await tx.insumo.findUnique({
          where: { id: insumoId },
          select: { id: true, nome: true, quantidade: true, unidadeId: true },
        })

        if (!insumo || insumo.unidadeId !== unidadeId) {
          throw new Error('INSUMO_NOT_FOUND')
        }

        if (insumo.quantidade < quantidade) {
          throw new Error(`INSUFFICIENT_STOCK:${insumo.quantidade}`)
        }

        await tx.insumo.update({
          where: { id: insumoId },
          data: { quantidade: { decrement: quantidade } },
        })

        return tx.saidaInsumo.create({
          data: {
            insumoId,
            userId: user.id,
            unidadeId,
            quantidade,
            tipoSaidaId,
            motivo: motivo ?? null,
            observacao: observacao ?? null,
            dataRetirada: nowSP(),
          },
          include: {
            insumo: { select: { nome: true, lote: true } },
            user: { select: { name: true } },
            tipoSaida: { select: { id: true, nome: true, slug: true, categoria: true, cor: true } },
          },
        })
      })

      Sentry.addBreadcrumb({
        message: `Saída registrada: ${result.insumo.nome} (${quantidade} unidades) [${tipoSaida.categoria}]`,
        category: 'saida',
        data: { id: result.id, insumoId, userId: user.id, quantidade, tipoSaidaId },
      })

      return NextResponse.json(
        {
          id: result.id,
          insumoId: result.insumoId,
          insumoNome: result.insumo.nome,
          insumoLote: result.insumo.lote,
          quantidade: result.quantidade,
          tipoSaida: result.tipoSaida,
          motivo: result.motivo,
          responsavel: result.user.name,
          observacao: result.observacao,
          dataRetirada: result.dataRetirada,
          createdAt: result.createdAt,
        },
        { status: 201 }
      )
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'INSUMO_NOT_FOUND') {
          return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 })
        }
        if (error.message.startsWith('INSUFFICIENT_STOCK:')) {
          const available = error.message.split(':')[1]
          return NextResponse.json(
            { error: `Estoque insuficiente. Disponível: ${available} unidades` },
            { status: 409 }
          )
        }
      }

      Sentry.captureException(error, { tags: { route: 'POST /api/saidas' } })
      return NextResponse.json({ error: 'Erro ao registrar saída' }, { status: 500 })
    }
  })
}
