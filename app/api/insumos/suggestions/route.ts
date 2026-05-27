import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  requireAuth,
  isUser,
  getUnidadeIdOrGlobal,
  requireUnidadeAccessOrGlobal,
} from '@/lib/auth-helpers'

const ALLOWED_FIELDS = ['nome', 'fornecedor'] as const
type SuggestionField = (typeof ALLOWED_FIELDS)[number]

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!isUser(user)) return user

  const rawUnidadeId = getUnidadeIdOrGlobal(request)
  if (rawUnidadeId instanceof NextResponse) return rawUnidadeId

  const unidadeId = await requireUnidadeAccessOrGlobal(user, rawUnidadeId)
  if (unidadeId instanceof NextResponse) return unidadeId

  const fieldParam = request.nextUrl.searchParams.get('field')
  if (!fieldParam || !ALLOWED_FIELDS.includes(fieldParam as SuggestionField)) {
    return NextResponse.json({ error: 'Campo inválido' }, { status: 400 })
  }
  const field = fieldParam as SuggestionField
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length > 100) {
    return NextResponse.json({ error: 'Consulta muito longa' }, { status: 400 })
  }

  try {
    const where: Prisma.InsumoWhereInput = {
      ...(unidadeId ? { unidadeId } : {}),
      ...(q ? { [field]: { contains: q, mode: 'insensitive' } } : {}),
    }

    const rows = (await prisma.insumo.findMany({
      where,
      select: { [field]: true },
      distinct: [field],
      orderBy: { [field]: 'asc' },
      take: 10,
    })) as unknown as Array<Record<SuggestionField, string>>

    const values = rows
      .map((r) => r[field])
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')

    return NextResponse.json(values)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /api/insumos/suggestions' } })
    return NextResponse.json({ error: 'Erro ao buscar sugestões' }, { status: 500 })
  }
}
