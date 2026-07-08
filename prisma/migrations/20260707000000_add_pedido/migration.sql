-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('pendente', 'recebido', 'cancelado');

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "produto" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'pendente',
    "observacao" TEXT,
    "dataPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPrevista" TIMESTAMP(3),
    "dataRecebimento" TIMESTAMP(3),
    "unidadeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pedido_unidadeId_idx" ON "Pedido"("unidadeId");

-- CreateIndex
CREATE INDEX "Pedido_userId_idx" ON "Pedido"("userId");

-- CreateIndex
CREATE INDEX "Pedido_status_idx" ON "Pedido"("status");

-- CreateIndex
CREATE INDEX "Pedido_fornecedor_idx" ON "Pedido"("fornecedor");

-- CreateIndex
CREATE INDEX "Pedido_dataPedido_idx" ON "Pedido"("dataPedido");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
