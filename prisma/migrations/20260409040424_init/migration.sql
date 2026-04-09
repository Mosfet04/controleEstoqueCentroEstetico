-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'clinico');

-- CreateEnum
CREATE TYPE "TipoInsumo" AS ENUM ('injetavel', 'descartavel', 'peeling');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'clinico',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insumo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "lote" TEXT NOT NULL,
    "tipo" "TipoInsumo" NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "quantidadeMinima" INTEGER NOT NULL,
    "dataEntrada" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaidaInsumo" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "observacao" TEXT,
    "dataRetirada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaidaInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_firebaseUid_idx" ON "User"("firebaseUid");

-- CreateIndex
CREATE INDEX "Insumo_tipo_idx" ON "Insumo"("tipo");

-- CreateIndex
CREATE INDEX "Insumo_dataVencimento_idx" ON "Insumo"("dataVencimento");

-- CreateIndex
CREATE INDEX "SaidaInsumo_insumoId_idx" ON "SaidaInsumo"("insumoId");

-- CreateIndex
CREATE INDEX "SaidaInsumo_userId_idx" ON "SaidaInsumo"("userId");

-- CreateIndex
CREATE INDEX "SaidaInsumo_dataRetirada_idx" ON "SaidaInsumo"("dataRetirada");

-- AddForeignKey
ALTER TABLE "SaidaInsumo" ADD CONSTRAINT "SaidaInsumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaidaInsumo" ADD CONSTRAINT "SaidaInsumo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
