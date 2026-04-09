-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "telefone" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable (implicit M:N for User <-> Unidade)
CREATE TABLE "_UnidadeToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UnidadeToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UnidadeToUser_B_index" ON "_UnidadeToUser"("B");

-- Insert default unit
INSERT INTO "Unidade" ("id", "nome", "ativa", "createdAt", "updatedAt")
VALUES ('default-unit-1', 'Unidade 1', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add unidadeId columns (nullable first for migration)
ALTER TABLE "Insumo" ADD COLUMN "unidadeId" TEXT;
ALTER TABLE "SaidaInsumo" ADD COLUMN "unidadeId" TEXT;

-- Migrate existing data to default unit
UPDATE "Insumo" SET "unidadeId" = 'default-unit-1' WHERE "unidadeId" IS NULL;
UPDATE "SaidaInsumo" SET "unidadeId" = 'default-unit-1' WHERE "unidadeId" IS NULL;

-- Assign all existing users to default unit
INSERT INTO "_UnidadeToUser" ("A", "B")
SELECT 'default-unit-1', "id" FROM "User";

-- Make columns NOT NULL
ALTER TABLE "Insumo" ALTER COLUMN "unidadeId" SET NOT NULL;
ALTER TABLE "SaidaInsumo" ALTER COLUMN "unidadeId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Insumo_unidadeId_idx" ON "Insumo"("unidadeId");
CREATE INDEX "SaidaInsumo_unidadeId_idx" ON "SaidaInsumo"("unidadeId");

-- AddForeignKey
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaidaInsumo" ADD CONSTRAINT "SaidaInsumo_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "_UnidadeToUser" ADD CONSTRAINT "_UnidadeToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_UnidadeToUser" ADD CONSTRAINT "_UnidadeToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
