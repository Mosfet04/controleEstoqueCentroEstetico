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
  precoUnitario?: number | null
  dataEntrada: string
  dataVencimento: string
  status: 'bom' | 'atencao' | 'critico'
  createdAt: string
  updatedAt: string
  unidadeId: string
  unidadeNome?: string
}

export interface InsumoPayload {
  nome: string
  lote: string
  tipo: string
  fornecedor: string
  quantidade: number
  quantidadeMinima: number
  precoUnitario?: number
  dataEntrada: string
  dataVencimento: string
}

export const insumosApi = {
  list: (params?: { q?: string; tipo?: string; unidadeOverride?: string }) => {
    const search = new URLSearchParams()
    if (params?.q) search.set('q', params.q)
    if (params?.tipo) search.set('tipo', params.tipo)
    const qs = search.toString()
    return apiFetch<InsumoApi[]>(
      `/api/insumos${qs ? `?${qs}` : ''}`,
      params?.unidadeOverride ? { headers: { 'x-unidade-id': params.unidadeOverride } } : undefined
    )
  },
  get: (id: string) => apiFetch<InsumoApi>(`/api/insumos/${id}`),
  create: (data: InsumoPayload, unidadeOverride?: string) =>
    apiFetch<InsumoApi>('/api/insumos', {
      method: 'POST',
      body: JSON.stringify(data),
      ...(unidadeOverride ? { headers: { 'x-unidade-id': unidadeOverride } } : {}),
    }),
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
  unidadeNome?: string
}

export const saidasApi = {
  list: () => apiFetch<SaidaApi[]>('/api/saidas'),
  create: (data: {
    insumoId: string
    quantidade: number
    tipo?: 'uso' | 'descarte' | 'ajuste'
    motivo?: string
    observacao?: string
  }, unidadeOverride?: string) =>
    apiFetch<SaidaApi>('/api/saidas', {
      method: 'POST',
      body: JSON.stringify(data),
      ...(unidadeOverride ? { headers: { 'x-unidade-id': unidadeOverride } } : {}),
    }),
}

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

export interface UserApi {
  id: string
  email: string
  name: string
  role: 'admin' | 'clinico'
  ativo: boolean
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
    apiFetch<{ success?: boolean; deactivated?: boolean }>(`/api/usuarios/${id}`, { method: 'DELETE' }),
  reactivate: (id: string) =>
    apiFetch<{ reactivated: boolean }>(`/api/usuarios/${id}`, { method: 'PATCH' }),
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
  get: (params?: { from?: string; to?: string }) => {
    const search = new URLSearchParams()
    if (params?.from) search.set('from', params.from)
    if (params?.to) search.set('to', params.to)
    const qs = search.toString()
    return apiFetch<DashboardApi>(`/api/dashboard${qs ? `?${qs}` : ''}`)
  },
}

// ---------------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------------

export interface AuditLogApi {
  id: string
  userId: string
  user: { name: string; email: string }
  action: string
  entity: string
  entityId: string
  details: Record<string, unknown> | null
  createdAt: string
}

export const auditoriaApi = {
  list: (params?: { entity?: string; action?: string; userId?: string; from?: string; to?: string; limit?: number }) => {
    const search = new URLSearchParams()
    if (params?.entity) search.set('entity', params.entity)
    if (params?.action) search.set('action', params.action)
    if (params?.userId) search.set('userId', params.userId)
    if (params?.from) search.set('from', params.from)
    if (params?.to) search.set('to', params.to)
    if (params?.limit) search.set('limit', String(params.limit))
    const qs = search.toString()
    return apiFetch<AuditLogApi[]>(`/api/auditoria${qs ? `?${qs}` : ''}`)
  },
}

// ---------------------------------------------------------------------------
// Comparativo entre Unidades
// ---------------------------------------------------------------------------

export interface ComparativoApi {
  unidades: {
    id: string
    nome: string
    totalInsumos: number
    insumosAtivos: number
    insumosCriticos: number
    insumosVencendo: number
    saidasMes: number
    descartesMes: number
    ajustesMes: number
  }[]
}

export const comparativoApi = {
  get: () => apiFetch<ComparativoApi>('/api/comparativo'),
}

// ---------------------------------------------------------------------------
// Velocidade de Consumo / Previsão
// ---------------------------------------------------------------------------

export interface PrevisaoItem {
  id: string
  nome: string
  lote: string
  unidadeNome: string
  quantidade: number
  mediaDiaria: number
  diasRestantes: number | null
}

export const previsaoApi = {
  list: () => apiFetch<PrevisaoItem[]>('/api/previsao'),
}

// ---------------------------------------------------------------------------
// Comparativo de Fornecedores
// ---------------------------------------------------------------------------

export interface FornecedorComparativo {
  fornecedor: string
  produto: string
  tipo: string
  entradas: number
  precoMedio: number | null
  precoMinimo: number | null
  precoMaximo: number | null
  ultimaEntrada: string | null
}

export const fornecedoresApi = {
  compare: (params?: { produto?: string[]; fornecedor?: string[]; from?: string; to?: string }) => {
    const search = new URLSearchParams()
    if (params?.produto?.length) search.set('produto', params.produto.join(','))
    if (params?.fornecedor?.length) search.set('fornecedor', params.fornecedor.join(','))
    if (params?.from) search.set('from', params.from)
    if (params?.to) search.set('to', params.to)
    const qs = search.toString()
    return apiFetch<FornecedorComparativo[]>(`/api/fornecedores${qs ? `?${qs}` : ''}`)
  },
}
