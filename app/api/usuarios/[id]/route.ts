import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin, requireAuth, isUser } from '@/lib/auth-helpers'
import { updateUserSchema } from '@/lib/validations'
import { getAdminAuth } from '@/lib/firebase-admin'
import { UserRole } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin(request)
  if (!isUser(admin)) return admin

  const { id } = await params

  try {
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { name, email, role } = parsed.data
    const unidadeIds: string[] | undefined = Array.isArray(body.unidadeIds) ? body.unidadeIds : undefined

    // Sync email change to Firebase Auth
    if (email && email !== existing.email) {
      const adminAuth = getAdminAuth()
      await adminAuth.updateUser(existing.firebaseUid, { email })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(role ? { role: role as UserRole } : {}),
        ...(unidadeIds ? { unidades: { set: unidadeIds.map((uid: string) => ({ id: uid })) } } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        unidades: { select: { id: true, nome: true } },
      },
    })

    Sentry.addBreadcrumb({
      message: `Usuário atualizado: ${updated.email}`,
      category: 'usuario',
      data: { id, adminId: admin.id },
    })

    return NextResponse.json(updated)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: `PUT /api/usuarios/${id}` } })
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin(request)
  if (!isUser(admin)) return admin

  const { id } = await params

  // Prevent self-deletion
  if (id === admin.id) {
    return NextResponse.json({ error: 'Você não pode excluir seu próprio usuário' }, { status: 400 })
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const adminAuth = getAdminAuth()

    // Check if user has any saída records — if so, soft-delete to preserve history
    const hasSaidas = await prisma.saidaInsumo.count({ where: { userId: id } })
    if (hasSaidas > 0) {
      await Promise.all([
        prisma.user.update({ where: { id }, data: { ativo: false } }),
        adminAuth.updateUser(existing.firebaseUid, { disabled: true }),
      ])

      Sentry.addBreadcrumb({
        message: `Usuário desativado: ${existing.email}`,
        category: 'usuario',
        data: { id, adminId: admin.id },
      })

      return NextResponse.json({ deactivated: true })
    }

    // No history — hard delete
    await adminAuth.deleteUser(existing.firebaseUid)
    await prisma.user.delete({ where: { id } })

    Sentry.addBreadcrumb({
      message: `Usuário excluído: ${existing.email}`,
      category: 'usuario',
      data: { id, adminId: admin.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    Sentry.captureException(error, { tags: { route: `DELETE /api/usuarios/${id}` } })
    return NextResponse.json({ error: 'Erro ao excluir usuário' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const admin = await requireAdmin(request)
  if (!isUser(admin)) return admin

  const { id } = await params

  try {
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const adminAuth = getAdminAuth()
    await Promise.all([
      prisma.user.update({ where: { id }, data: { ativo: true } }),
      adminAuth.updateUser(existing.firebaseUid, { disabled: false }),
    ])

    Sentry.addBreadcrumb({
      message: `Usuário reativado: ${existing.email}`,
      category: 'usuario',
      data: { id, adminId: admin.id },
    })

    return NextResponse.json({ reactivated: true })
  } catch (error) {
    Sentry.captureException(error, { tags: { route: `PATCH /api/usuarios/${id}` } })
    return NextResponse.json({ error: 'Erro ao reativar usuário' }, { status: 500 })
  }
}
