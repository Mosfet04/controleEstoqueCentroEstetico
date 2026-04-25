-- CreateTable
CREATE TABLE "tipo_insumo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT 'gray',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipo_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipo_insumo_slug_key" ON "tipo_insumo"("slug");

-- CreateIndex
CREATE INDEX "tipo_insumo_slug_idx" ON "tipo_insumo"("slug");

-- SeedDefaultTypes
INSERT INTO "tipo_insumo" ("id", "nome", "slug", "cor", "ativo", "createdAt", "updatedAt") VALUES
('tipo_injetavel_00001', 'Injetável',   'injetavel',  'blue',   true, NOW(), NOW()),
('tipo_descartavel_0001', 'Descartável', 'descartavel', 'gray',   true, NOW(), NOW()),
('tipo_peeling_000001',  'Peeling',     'peeling',    'purple', true, NOW(), NOW());

-- AlterTable: add tipoId nullable to allow data migration
ALTER TABLE "Insumo" ADD COLUMN "tipoId" TEXT;

-- DataMigration: populate tipoId from existing tipo enum
UPDATE "Insumo" SET "tipoId" = CASE "tipo"::text
    WHEN 'injetavel'  THEN 'tipo_injetavel_00001'
    WHEN 'descartavel' THEN 'tipo_descartavel_0001'
    WHEN 'peeling'    THEN 'tipo_peeling_000001'
    ELSE                   'tipo_injetavel_00001'
END;

-- AlterTable: make tipoId NOT NULL after data migration
ALTER TABLE "Insumo" ALTER COLUMN "tipoId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "tipo_insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Insumo_tipoId_idx" ON "Insumo"("tipoId");

-- DropIndex (was on old tipo enum column)
DROP INDEX IF EXISTS "Insumo_tipo_idx";

-- AlterTable: drop old tipo enum column
ALTER TABLE "Insumo" DROP COLUMN "tipo";

-- DropEnum
DROP TYPE "TipoInsumo";
