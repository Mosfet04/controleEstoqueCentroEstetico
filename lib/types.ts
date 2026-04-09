// Shared label constants used across multiple pages.
// All data types are in lib/api.ts (InsumoApi, UserApi, SaidaApi, DashboardApi).

export type UserRole = 'admin' | 'clinico'
export type TipoInsumo = 'injetavel' | 'descartavel' | 'peeling'
export type StatusEstoque = 'bom' | 'atencao' | 'critico'
export type TipoSaida = 'uso' | 'descarte' | 'ajuste'

export const TIPO_LABELS: Record<TipoInsumo, string> = {
  injetavel: 'Injetável',
  descartavel: 'Descartável',
  peeling: 'Peeling',
}

export const STATUS_LABELS: Record<StatusEstoque, string> = {
  bom: 'Bom',
  atencao: 'Atenção',
  critico: 'Crítico',
}

export const TIPO_SAIDA_LABELS: Record<TipoSaida, string> = {
  uso: 'Uso Clínico',
  descarte: 'Descarte',
  ajuste: 'Ajuste de Estoque',
}

export const MOTIVOS_DESCARTE = [
  'Produto vencido',
  'Avaria / Quebra',
  'Contaminação',
  'Outro',
] as const

export const MOTIVOS_AJUSTE = [
  'Uso sem cadastro',
  'Erro de contagem anterior',
  'Desvio não registrado',
  'Outro',
] as const
