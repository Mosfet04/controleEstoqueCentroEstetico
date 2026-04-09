import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin, requireAuth, isUser } from '@/lib/auth-helpers'
import { createUserSchema } from '@/lib/validations'
import { getAdminAuth } from '@/lib/firebase-admin'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request)
  if (!isUser(user)) return user

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/usuarios' } })
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!isUser(admin)) return admin

  try {
    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { name, email, role, password } = parsed.data

    // Check if email already exists in DB before touching Firebase
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um usuário com este e-mail' },
        { status: 409 }
      )
    }

    // Create Firebase Auth user — server handles credentials, not the client
    const firebaseAuth = getAdminAuth()
    const firebaseUser = await firebaseAuth.createUser({
      email,
      password,
      displayName: name,
    })

    let newUser
    try {
      newUser = await prisma.user.create({
        data: {
          firebaseUid: firebaseUser.uid,
          name,
          email,
          role: role as UserRole,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      })
    } catch (dbError) {
      // Compensate: roll back Firebase user creation if DB insert fails
      await firebaseAuth.deleteUser(firebaseUser.uid).catch(() => null)
      throw dbError
    }

    Sentry.addBreadcrumb({
      message: `Usuário criado: ${newUser.email}`,
      category: 'usuario',
      data: { id: newUser.id, adminId: admin.id },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'POST /api/usuarios' } })
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }
}
