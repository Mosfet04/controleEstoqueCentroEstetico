-- CreateEnum
CREATE TYPE "TipoSaida" AS ENUM ('uso', 'descarte', 'ajuste');

-- AlterTable
ALTER TABLE "SaidaInsumo" ADD COLUMN     "motivo" TEXT,
ADD COLUMN     "tipo" "TipoSaida" NOT NULL DEFAULT 'uso';

-- CreateIndex
CREATE INDEX "SaidaInsumo_tipo_idx" ON "SaidaInsumo"("tipo");
