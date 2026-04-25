import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, isUser } from '@/lib/auth-helpers'
import { tipoInsumoSchema } from '@/lib/validations'
import { withAuditContext } from '@/lib/audit-context'
import { UserRole } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  if (user.role !== UserRole.admin) {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  const { id } = await params

  return withAuditContext(user.id, async () => {
    try {
      const existing = await prisma.tipoInsumo.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: 'Tipo de insumo não encontrado' }, { status: 404 })
      }

      const body = await request.json()
      const parsed = tipoInsumoSchema
        .extend({ ativo: z.boolean().optional() })
        .partial({ slug: true })
        .safeParse(body)

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
      }

      // If slug is changing, check uniqueness
      if (parsed.data.slug && parsed.data.slug !== existing.slug) {
        const slugExists = await prisma.tipoInsumo.findUnique({ where: { slug: parsed.data.slug } })
        if (slugExists) {
          return NextResponse.json({ error: 'Já existe um tipo com este slug' }, { status: 409 })
        }
      }

      const updated = await prisma.tipoInsumo.update({
        where: { id },
        data: parsed.data,
        include: { _count: { select: { insumos: true } } },
      })

      return NextResponse.json(updated)
    } catch (error) {
      Sentry.captureException(error, { tags: { route: `PUT /api/tipos-insumo/${id}` } })
      return NextResponse.json({ error: 'Erro ao atualizar tipo de insumo' }, { status: 500 })
    }
  })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  if (user.role !== UserRole.admin) {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
  }

  const { id } = await params

  return withAuditContext(user.id, async () => {
    try {
      const existing = await prisma.tipoInsumo.findUnique({
        where: { id },
        include: { _count: { select: { insumos: true } } },
      })

      if (!existing) {
        return NextResponse.json({ error: 'Tipo de insumo não encontrado' }, { status: 404 })
      }

      if (existing._count.insumos > 0) {
        return NextResponse.json(
          {
            error: `Este tipo não pode ser removido pois possui ${existing._count.insumos} insumo(s) vinculado(s). Reatribua ou remova os insumos primeiro.`,
          },
          { status: 409 }
        )
      }

      await prisma.tipoInsumo.delete({ where: { id } })

      return NextResponse.json({ success: true })
    } catch (error) {
      Sentry.captureException(error, { tags: { route: `DELETE /api/tipos-insumo/${id}` } })
      return NextResponse.json({ error: 'Erro ao remover tipo de insumo' }, { status: 500 })
    }
  })
}
