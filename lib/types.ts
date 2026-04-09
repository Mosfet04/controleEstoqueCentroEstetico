export type UserRole = 'admin' | 'clinico'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
}

export type TipoInsumo = 'injetavel' | 'descartavel' | 'peeling'

export type StatusEstoque = 'bom' | 'atencao' | 'critico'

export interface Insumo {
  id: string
  nome: string
  lote: string
  tipo: TipoInsumo
  fornecedor: string
  quantidade: number
  quantidadeMinima: number
  dataEntrada: Date
  dataVencimento: Date
  status: StatusEstoque
  createdAt: Date
  updatedAt: Date
}

export interface SaidaInsumo {
  id: string
  insumoId: string
  insumoNome: string
  quantidade: number
  responsavel: string
  observacao?: string
  dataRetirada: Date
  createdAt: Date
}

export interface DashboardMetrics {
  totalInsumos: number
  insumosAtivos: number
  insumosVencendo: number
  insumosVencidos: number
  insumosCriticos: number
  insumosAtencao: number
  saidasMes: number
  entradasMes: number
}

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
