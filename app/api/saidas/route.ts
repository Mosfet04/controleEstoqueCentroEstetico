import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser } from '@/lib/auth-helpers'
import { saidaSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  try {
    const saidas = await prisma.saidaInsumo.findMany({
      include: {
        insumo: { select: { nome: true, lote: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { dataRetirada: 'desc' },
    })

    const formatted = saidas.map((s) => ({
      id: s.id,
      insumoId: s.insumoId,
      insumoNome: s.insumo.nome,
      insumoLote: s.insumo.lote,
      quantidade: s.quantidade,
      responsavel: s.user.name,
      observacao: s.observacao,
      dataRetirada: s.dataRetirada,
      createdAt: s.createdAt,
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

  try {
    const body = await request.json()
    const parsed = saidaSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { insumoId, quantidade, observacao } = parsed.data

    // Atomic: verify stock and create saída in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const insumo = await tx.insumo.findUnique({
        where: { id: insumoId },
        select: { id: true, nome: true, quantidade: true },
      })

      if (!insumo) {
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
          quantidade,
          observacao: observacao ?? null,
          dataRetirada: new Date(),
        },
        include: {
          insumo: { select: { nome: true, lote: true } },
          user: { select: { name: true } },
        },
      })
    })

    Sentry.addBreadcrumb({
      message: `Saída registrada: ${result.insumo.nome} (${quantidade} unidades)`,
      category: 'saida',
      data: { id: result.id, insumoId, userId: user.id, quantidade },
    })

    return NextResponse.json(
      {
        id: result.id,
        insumoId: result.insumoId,
        insumoNome: result.insumo.nome,
        insumoLote: result.insumo.lote,
        quantidade: result.quantidade,
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
}
