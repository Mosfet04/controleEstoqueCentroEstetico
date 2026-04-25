// Shared label constants used across multiple pages.
// All data types are in lib/api.ts (InsumoApi, UserApi, SaidaApi, DashboardApi).

export type UserRole = 'admin' | 'clinico'
export type StatusEstoque = 'bom' | 'atencao' | 'critico'
export type TipoSaida = 'uso' | 'descarte' | 'ajuste'

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

/** Mapa de slug de cor → classes Tailwind para badges */
export const COR_BADGE_MAP: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  gray:   'bg-gray-100 text-gray-700 border-gray-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  green:  'bg-green-100 text-green-700 border-green-200',
  red:    'bg-red-100 text-red-700 border-red-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  pink:   'bg-pink-100 text-pink-700 border-pink-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  teal:   'bg-teal-100 text-teal-700 border-teal-200',
}

/** Mapa de slug de cor → hex para gráficos */
export const COR_CHART_MAP: Record<string, string> = {
  blue:   '#3b82f6',
  gray:   '#6b7280',
  purple: '#a855f7',
  green:  '#22c55e',
  red:    '#ef4444',
  yellow: '#eab308',
  pink:   '#ec4899',
  orange: '#f97316',
  indigo: '#6366f1',
  teal:   '#14b8a6',
}
