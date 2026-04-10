import { AsyncLocalStorage } from 'node:async_hooks'

const auditStorage = new AsyncLocalStorage<{ userId: string }>()

/**
 * Wraps an async operation with the current user's ID for automatic audit logging.
 * All Prisma mutations (create/update/delete) inside the callback are auto-audited.
 * Usage (analogous to a Python decorator):
 *
 *   return withAuditContext(user.id, async () => {
 *     await prisma.insumo.create({ data: { ... } })
 *     return NextResponse.json(result)
 *   })
 */
export function withAuditContext<T>(userId: string, fn: () => T): T {
  return auditStorage.run({ userId }, fn)
}

export function getAuditUserId(): string | undefined {
  return auditStorage.getStore()?.userId
}
