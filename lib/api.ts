/**
 * Typed fetch wrapper for all API calls.
 * Handles auth errors (401 → redirect to login) and wraps errors uniformly.
 */

type ApiErrorDetail = Record<string, string[]>

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: ApiErrorDetail
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const unidadeId = typeof window !== 'undefined' ? localStorage.getItem('unidadeAtiva') : null
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(unidadeId ? { 'x-unidade-id': unidadeId } : {}),
      ...(init?.headers ?? {}),
    },
  })

  if (response.status === 401) {
    // Redirect to login — session expired or invalid
    window.location.href = '/'
    throw new ApiError(401, 'Sessão expirada. Redirecionando...')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error ?? `Erro ${response.status}`,
      data?.details
    )
  }

  return data as T
}

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

export interface UnidadeApi {
  id: string
  nome: string
  endereco?: string | null
  telefone?: string | null
  ativa: boolean
  createdAt: string
}

export const unidadesApi = {
  list: () => apiFetch<UnidadeApi[]>('/api/unidades'),
  create: (data: { nome: string; endereco?: string; telefone?: string }) =>
    apiFetch<UnidadeApi>('/api/unidades', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { nome?: string; endereco?: string; telefone?: string }) =>
    apiFetch<UnidadeApi>(`/api/unidades/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/unidades/${id}`, { method: 'DELETE' }),
}

// ---------------------------------------------------------------------------
// Insumos
// ---------------------------------------------------------------------------

export interface InsumoApi {
  id: string
  nome: string
  lote: string
  tipo: 'injetavel' | 'descartavel' | 'peeling'
  fornecedor: string
  quantidade: number
  quantidadeMinima: number
  dataEntrada: string
  dataVencimento: string
  status: 'bom' | 'atencao' | 'critico'
  createdAt: string
  updatedAt: string
}

export interface InsumoPayload {
  nome: string
  lote: string
  tipo: string
  fornecedor: string
  quantidade: number
  quantidadeMinima: number
  dataEntrada: string
  dataVencimento: string
}

export const insumosApi = {
  list: (params?: { q?: string; tipo?: string }) => {
    const search = new URLSearchParams()
    if (params?.q) search.set('q', params.q)
    if (params?.tipo) search.set('tipo', params.tipo)
    const qs = search.toString()
    return apiFetch<InsumoApi[]>(`/api/insumos${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => apiFetch<InsumoApi>(`/api/insumos/${id}`),
  create: (data: InsumoPayload) =>
    apiFetch<InsumoApi>('/api/insumos', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: InsumoPayload) =>
    apiFetch<InsumoApi>(`/api/insumos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/insumos/${id}`, { method: 'DELETE' }),
}

// ---------------------------------------------------------------------------
// Saídas
// ---------------------------------------------------------------------------

export interface SaidaApi {
  id: string
  insumoId: string
  insumoNome: string
  insumoLote: string
  quantidade: number
  tipo: 'uso' | 'descarte' | 'ajuste'
  motivo?: string | null
  responsavel: string
  observacao?: string | null
  dataRetirada: string
  createdAt: string
}

export const saidasApi = {
  list: () => apiFetch<SaidaApi[]>('/api/saidas'),
  create: (data: {
    insumoId: string
    quantidade: number
    tipo?: 'uso' | 'descarte' | 'ajuste'
    motivo?: string
    observacao?: string
  }) => apiFetch<SaidaApi>('/api/saidas', { method: 'POST', body: JSON.stringify(data) }),
}

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

export interface UserApi {
  id: string
  email: string
  name: string
  role: 'admin' | 'clinico'
  createdAt: string
  unidades?: { id: string; nome: string }[]
}

export const usuariosApi = {
  list: () => apiFetch<UserApi[]>('/api/usuarios'),
  create: (data: { name: string; email: string; role: string; password: string }) =>
    apiFetch<UserApi>('/api/usuarios', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; email?: string; role?: string }) =>
    apiFetch<UserApi>(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/usuarios/${id}`, { method: 'DELETE' }),
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardApi {
  metrics: {
    totalInsumos: number
    insumosAtivos: number
    insumosVencendo: number
    insumosVencidos: number
    insumosCriticos: number
    insumosAtencao: number
    saidasMes: number
    descartesMes: number
    ajustesMes: number
  }
  byTipo: { injetavel: number; descartavel: number; peeling: number }
  byStatus: { bom: number; atencao: number; critico: number }
  topConsumo: { nome: string; total: number }[]
  vencendo30: { id: string; nome: string; dataVencimento: string; status: string }[]
  vencendo60: { id: string; nome: string; dataVencimento: string; status: string }[]
  criticos: {
    id: string
    nome: string
    quantidade: number
    quantidadeMinima: number
    status: string
  }[]
  movimentacaoColaborador: {
    nome: string
    uso: number
    descarte: number
    ajuste: number
    total: number
  }[]
  volumePorTipo: { tipo: string; total: number }[]
  topDescartes: { nome: string; total: number; motivo: string }[]
  insumosZerados: { nome: string; tipo: string; fornecedor: string }[]
  fornecedores: { nome: string; total: number }[]
  atividadeRecente: {
    id: string
    insumoNome: string
    responsavel: string
    tipo: string
    quantidade: number
    dataRetirada: string
  }[]
}

export const dashboardApi = {
  get: () => apiFetch<DashboardApi>('/api/dashboard'),
}
