/**
 * Seed script — cria o primeiro usuário admin a partir de variáveis de ambiente.
 *
 * Uso:
 *   SEED_ADMIN_FIREBASE_UID=xxx SEED_ADMIN_EMAIL=admin@clinica.com SEED_ADMIN_NAME="Administrador" pnpm db:seed
 *
 * O usuário já deve existir no Firebase Auth antes de executar o seed.
 * Esse script apenas cria o registro no banco de dados relacional.
 */

import { PrismaClient, UserRole } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  const firebaseUid = process.env.SEED_ADMIN_FIREBASE_UID
  const email = process.env.SEED_ADMIN_EMAIL
  const name = process.env.SEED_ADMIN_NAME ?? 'Administrador'

  if (!firebaseUid || !email) {
    throw new Error(
      'Variáveis de ambiente obrigatórias ausentes: SEED_ADMIN_FIREBASE_UID, SEED_ADMIN_EMAIL\n' +
        'Execute: SEED_ADMIN_FIREBASE_UID=<uid> SEED_ADMIN_EMAIL=<email> SEED_ADMIN_NAME=<name> pnpm db:seed'
    )
  }

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    console.log(`Usuário admin já existe: ${existing.email} (id: ${existing.id})`)
    return
  }

  const admin = await prisma.user.create({
    data: {
      firebaseUid,
      email,
      name,
      role: UserRole.admin,
    },
  })

  console.log(`Usuário admin criado com sucesso:`)
  console.log(`  ID: ${admin.id}`)
  console.log(`  Firebase UID: ${admin.firebaseUid}`)
  console.log(`  Email: ${admin.email}`)
  console.log(`  Nome: ${admin.name}`)
  console.log(`  Função: ${admin.role}`)
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
