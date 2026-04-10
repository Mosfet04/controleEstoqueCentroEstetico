import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'DEACTIVATE' | 'REACTIVATE'
export type AuditEntity = 'insumo' | 'saida' | 'usuario' | 'unidade'

export async function createAuditLog(params: {
  userId: string
  action: AuditAction
  entity: AuditEntity
  entityId: string
  details?: Prisma.InputJsonValue
}) {
  return prisma.auditLog.create({ data: params }).catch(() => {
    // Audit logging should never break the main operation
  })
}
