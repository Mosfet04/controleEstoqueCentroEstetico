import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, isUser } from '@/lib/auth-helpers'
import { unidadeSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  try {
    if (user.role === 'admin') {
      const unidades = await prisma.unidade.findMany({
        orderBy: { nome: 'asc' },
      })
      return NextResponse.json(unidades)
    }

    const unidades = await prisma.unidade.findMany({
      where: { usuarios: { some: { id: user.id } }, ativa: true },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(unidades)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/unidades' } })
    return NextResponse.json({ error: 'Erro ao buscar unidades' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!isUser(admin)) return admin

  try {
    const body = await request.json()
    const parsed = unidadeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const unidade = await prisma.unidade.create({
      data: parsed.data,
    })

    Sentry.addBreadcrumb({
      message: `Unidade criada: ${unidade.nome}`,
      category: 'unidade',
      data: { id: unidade.id, adminId: admin.id },
    })

    return NextResponse.json(unidade, { status: 201 })
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'POST /api/unidades' } })
    return NextResponse.json({ error: 'Erro ao criar unidade' }, { status: 500 })
  }
}
