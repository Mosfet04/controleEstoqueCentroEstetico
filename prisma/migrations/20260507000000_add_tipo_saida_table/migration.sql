-- 1. Renomear enum existente: TipoSaida vira CategoriaSaida
ALTER TYPE "TipoSaida" RENAME TO "CategoriaSaida";

-- 2. Criar nova tabela tipo_saida
CREATE TABLE "tipo_saida" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoria" "CategoriaSaida" NOT NULL,
    "cor" TEXT NOT NULL DEFAULT 'blue',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tipo_saida_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tipo_saida_slug_key" ON "tipo_saida"("slug");
CREATE INDEX "tipo_saida_slug_idx" ON "tipo_saida"("slug");
CREATE INDEX "tipo_saida_categoria_idx" ON "tipo_saida"("categoria");

-- 3. Seed: 3 tipos default (mesmos slugs que o enum antigo)
INSERT INTO "tipo_saida" ("id", "nome", "slug", "categoria", "cor", "ativo", "createdAt", "updatedAt") VALUES
  ('seed_tipo_saida_uso',      'Uso Clínico',       'uso',      'uso',      'blue',   true, NOW(), NOW()),
  ('seed_tipo_saida_descarte', 'Descarte',          'descarte', 'descarte', 'red',    true, NOW(), NOW()),
  ('seed_tipo_saida_ajuste',   'Ajuste de Estoque', 'ajuste',   'ajuste',   'yellow', true, NOW(), NOW());

-- 4. Adicionar coluna nullable inicialmente (para backfill)
ALTER TABLE "SaidaInsumo" ADD COLUMN "tipoSaidaId" TEXT;

-- 5. Backfill a partir da coluna enum existente
UPDATE "SaidaInsumo" SET "tipoSaidaId" = CASE "tipo"::text
    WHEN 'uso'      THEN 'seed_tipo_saida_uso'
    WHEN 'descarte' THEN 'seed_tipo_saida_descarte'
    WHEN 'ajuste'   THEN 'seed_tipo_saida_ajuste'
    ELSE                 'seed_tipo_saida_uso'
END;

-- 6. Tornar NOT NULL
ALTER TABLE "SaidaInsumo" ALTER COLUMN "tipoSaidaId" SET NOT NULL;

-- 7. Foreign key
ALTER TABLE "SaidaInsumo" ADD CONSTRAINT "SaidaInsumo_tipoSaidaId_fkey"
    FOREIGN KEY ("tipoSaidaId") REFERENCES "tipo_saida"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. Índice
CREATE INDEX "SaidaInsumo_tipoSaidaId_idx" ON "SaidaInsumo"("tipoSaidaId");

-- 9. Drop coluna antiga e índice
DROP INDEX IF EXISTS "SaidaInsumo_tipo_idx";
ALTER TABLE "SaidaInsumo" DROP COLUMN "tipo";
