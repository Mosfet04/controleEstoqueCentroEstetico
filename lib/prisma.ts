import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { getAuditUserId } from '@/lib/audit-context'

// Models that should be automatically audited on create/update/delete.
// Key = Prisma model name, value = entity name stored in AuditLog.
const AUDITED_MODELS: Record<string, string> = {
  Insumo: 'insumo',
  SaidaInsumo: 'saida',
  User: 'usuario',
  Unidade: 'unidade',
}

const SENSITIVE_KEYS = new Set(['password', 'firebaseUid'])
const RELATION_KEYS = new Set(['connect', 'set', 'disconnect', 'connectOrCreate', 'create', 'createMany'])

function sanitizeDetails(data: unknown): Record<string, unknown> | undefined {
  if (!data || typeof data !== 'object') return undefined
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key) || RELATION_KEYS.has(key)) continue
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      const nested = value as Record<string, unknown>
      if ('connect' in nested || 'set' in nested || 'disconnect' in nested) continue
    }
    result[key] = value
  }
  return Object.keys(result).length > 0 ? result : undefined
}

function resolveAction(operation: string, data: Record<string, unknown> | undefined): string {
  if (operation !== 'update' || !data) return operation.toUpperCase()
  if (data.ativo === false || data.ativa === false) return 'DEACTIVATE'
  if ((data.ativo === true || data.ativa === true) && Object.keys(data).length === 1) return 'REACTIVATE'
  return 'UPDATE'
}

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const base = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  function autoAudit(
    model: string,
    operation: 'create' | 'update' | 'delete',
    args: { data?: unknown; where?: unknown },
    result: { id?: string },
    previousData?: Record<string, unknown>,
  ) {
    const entity = AUDITED_MODELS[model]
    if (!entity) return
    const userId = getAuditUserId()
    if (!userId) return

    const entityId = String(result?.id ?? (args?.where as Record<string, unknown>)?.id ?? '')
    const action = resolveAction(operation, args?.data as Record<string, unknown> | undefined)

    let details: Record<string, unknown> | undefined
    if (operation === 'delete') {
      details = sanitizeDetails(result)
    } else if (operation === 'update') {
      const before = sanitizeDetails(previousData)
      const after = sanitizeDetails(args?.data)
      details = before || after ? { ...(before && { before }), ...(after && { after }) } : undefined
    } else {
      details = sanitizeDetails(args?.data)
    }

    base.auditLog.create({
      data: { userId, action, entity, entityId, details: details as Prisma.InputJsonValue | undefined },
    }).catch(() => {
      // Audit logging should never break the main operation
    })
  }

  return base.$extends({
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const result = await query(args)
          autoAudit(model, 'create', args, result)
          return result
        },
        async update({ model, args, query }) {
          let previousData: Record<string, unknown> | undefined
          if (AUDITED_MODELS[model] && args.where) {
            try {
              const delegate = (base as Record<string, any>)[model.charAt(0).toLowerCase() + model.slice(1)]
              const existing = await delegate.findUnique({ where: args.where })
              if (existing) previousData = existing as Record<string, unknown>
            } catch {
              // Continue without previous data
            }
          }
          const result = await query(args)
          autoAudit(model, 'update', args, result, previousData)
          return result
        },
        async delete({ model, args, query }) {
          let previousData: Record<string, unknown> | undefined
          if (AUDITED_MODELS[model] && args.where) {
            try {
              const delegate = (base as Record<string, any>)[model.charAt(0).toLowerCase() + model.slice(1)]
              const existing = await delegate.findUnique({ where: args.where })
              if (existing) previousData = existing as Record<string, unknown>
            } catch {
              // Continue without previous data
            }
          }
          const result = await query(args)
          autoAudit(model, 'delete', args, result, previousData)
          return result
        },
      },
    },
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
