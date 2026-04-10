import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin, isUser } from '@/lib/auth-helpers'
import { unidadeSchema } from '@/lib/validations'
import { withAuditContext } from '@/lib/audit-context'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin(request)
  if (!isUser(admin)) return admin

  const { id } = await params

  try {
    const unidade = await prisma.unidade.findUnique({
      where: { id },
      include: { usuarios: { select: { id: true, name: true, email: true } } },
    })

    if (!unidade) {
      return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
    }

    return NextResponse.json(unidade)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: `GET /api/unidades/${id}` } })
    return NextResponse.json({ error: 'Erro ao buscar unidade' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin(request)
  if (!isUser(admin)) return admin

  const { id } = await params

  return withAuditContext(admin.id, async () => {
    try {
      const existing = await prisma.unidade.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
      }

      const body = await request.json()
      const parsed = unidadeSchema.safeParse(body)

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
      }

      const updated = await prisma.unidade.update({
        where: { id },
        data: parsed.data,
      })

      Sentry.addBreadcrumb({
        message: `Unidade atualizada: ${updated.nome}`,
        category: 'unidade',
        data: { id, adminId: admin.id },
      })

      return NextResponse.json(updated)
    } catch (error) {
      Sentry.captureException(error, { tags: { route: `PUT /api/unidades/${id}` } })
      return NextResponse.json({ error: 'Erro ao atualizar unidade' }, { status: 500 })
    }
  })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin(request)
  if (!isUser(admin)) return admin

  const { id } = await params

  return withAuditContext(admin.id, async () => {
    try {
      const existing = await prisma.unidade.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
      }

      // Soft delete — deactivate the unit
      await prisma.unidade.update({
        where: { id },
        data: { ativa: false },
      })

      Sentry.addBreadcrumb({
        message: `Unidade desativada: ${existing.nome}`,
        category: 'unidade',
        data: { id, adminId: admin.id },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      Sentry.captureException(error, { tags: { route: `DELETE /api/unidades/${id}` } })
      return NextResponse.json({ error: 'Erro ao desativar unidade' }, { status: 500 })
    }
  })
}
