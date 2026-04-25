import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser } from '@/lib/auth-helpers'
import { tipoInsumoSchema } from '@/lib/validations'
import { withAuditContext } from '@/lib/audit-context'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  try {
    const tipos = await prisma.tipoInsumo.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { insumos: true } } },
    })

    return NextResponse.json(tipos)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/tipos-insumo' } })
    return NextResponse.json({ error: 'Erro ao buscar tipos de insumo' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  if (user.role !== UserRole.admin) {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  return withAuditContext(user.id, async () => {
    try {
      const body = await request.json()
      const parsed = tipoInsumoSchema.safeParse(body)

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
      }

      const slugExists = await prisma.tipoInsumo.findUnique({ where: { slug: parsed.data.slug } })
      if (slugExists) {
        return NextResponse.json({ error: 'Já existe um tipo com este slug' }, { status: 409 })
      }

      const tipo = await prisma.tipoInsumo.create({
        data: parsed.data,
        include: { _count: { select: { insumos: true } } },
      })

      return NextResponse.json(tipo, { status: 201 })
    } catch (error) {
      Sentry.captureException(error, { tags: { route: 'POST /api/tipos-insumo' } })
      return NextResponse.json({ error: 'Erro ao criar tipo de insumo' }, { status: 500 })
    }
  })
}
