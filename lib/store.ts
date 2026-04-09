import { Insumo, SaidaInsumo, User, StatusEstoque, TipoInsumo } from './types'

// Dados mock para demonstração (em produção, usar Firebase Firestore)
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@stockbeauty.com',
    name: 'Administrador',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    email: 'clinico@stockbeauty.com',
    name: 'Dr. Maria Silva',
    role: 'clinico',
    createdAt: new Date('2024-01-15'),
  },
]

const mockInsumos: Insumo[] = [
  {
    id: '1',
    nome: 'Botox 100U',
    lote: 'BTX-2024-001',
    tipo: 'injetavel',
    fornecedor: 'Allergan',
    quantidade: 15,
    quantidadeMinima: 5,
    dataEntrada: new Date('2024-01-10'),
    dataVencimento: new Date('2025-01-10'),
    status: 'bom',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '2',
    nome: 'Ácido Hialurônico 1ml',
    lote: 'AH-2024-015',
    tipo: 'injetavel',
    fornecedor: 'Juvederm',
    quantidade: 8,
    quantidadeMinima: 10,
    dataEntrada: new Date('2024-02-01'),
    dataVencimento: new Date('2024-08-01'),
    status: 'atencao',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: '3',
    nome: 'Luvas Nitrílicas M',
    lote: 'LUV-2024-100',
    tipo: 'descartavel',
    fornecedor: 'MedSupply',
    quantidade: 200,
    quantidadeMinima: 50,
    dataEntrada: new Date('2024-03-01'),
    dataVencimento: new Date('2026-03-01'),
    status: 'bom',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: '4',
    nome: 'Peeling Glicólico 30%',
    lote: 'PG-2024-008',
    tipo: 'peeling',
    fornecedor: 'SkinCare Pro',
    quantidade: 3,
    quantidadeMinima: 5,
    dataEntrada: new Date('2024-02-15'),
    dataVencimento: new Date('2024-05-15'),
    status: 'critico',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: '5',
    nome: 'Seringas 3ml',
    lote: 'SER-2024-050',
    tipo: 'descartavel',
    fornecedor: 'MedSupply',
    quantidade: 150,
    quantidadeMinima: 100,
    dataEntrada: new Date('2024-03-10'),
    dataVencimento: new Date('2027-03-10'),
    status: 'bom',
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
  },
  {
    id: '6',
    nome: 'Peeling Salicílico 20%',
    lote: 'PS-2024-012',
    tipo: 'peeling',
    fornecedor: 'DermaPro',
    quantidade: 7,
    quantidadeMinima: 5,
    dataEntrada: new Date('2024-03-20'),
    dataVencimento: new Date('2024-09-20'),
    status: 'bom',
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20'),
  },
  {
    id: '7',
    nome: 'Sculptra 2 Frascos',
    lote: 'SCP-2024-003',
    tipo: 'injetavel',
    fornecedor: 'Galderma',
    quantidade: 2,
    quantidadeMinima: 3,
    dataEntrada: new Date('2024-04-01'),
    dataVencimento: new Date('2025-04-01'),
    status: 'critico',
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-01'),
  },
]

const mockSaidas: SaidaInsumo[] = [
  {
    id: '1',
    insumoId: '1',
    insumoNome: 'Botox 100U',
    quantidade: 2,
    responsavel: 'Dr. Maria Silva',
    observacao: 'Procedimento facial',
    dataRetirada: new Date('2024-03-15'),
    createdAt: new Date('2024-03-15'),
  },
  {
    id: '2',
    insumoId: '3',
    insumoNome: 'Luvas Nitrílicas M',
    quantidade: 50,
    responsavel: 'Enfermeira Ana',
    dataRetirada: new Date('2024-03-20'),
    createdAt: new Date('2024-03-20'),
  },
  {
    id: '3',
    insumoId: '2',
    insumoNome: 'Ácido Hialurônico 1ml',
    quantidade: 3,
    responsavel: 'Dr. Maria Silva',
    observacao: 'Preenchimento labial',
    dataRetirada: new Date('2024-03-25'),
    createdAt: new Date('2024-03-25'),
  },
]

// Store em memória (em produção, usar Firebase)
let users = [...mockUsers]
let insumos = [...mockInsumos]
let saidas = [...mockSaidas]

// Funções de autenticação
export function authenticateUser(email: string, password: string): User | null {
  // Mock: aceita qualquer senha para demonstração
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (user && password.length >= 6) {
    return user
  }
  return null
}

// Funções de usuários
export function getUsers(): User[] {
  return [...users]
}

export function createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
  const newUser: User = {
    ...userData,
    id: Date.now().toString(),
    createdAt: new Date(),
  }
  users.push(newUser)
  return newUser
}

export function updateUser(id: string, data: Partial<User>): User | null {
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return null
  users[index] = { ...users[index], ...data }
  return users[index]
}

export function deleteUser(id: string): boolean {
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return false
  users.splice(index, 1)
  return true
}

// Funções de insumos
export function getInsumos(): Insumo[] {
  return [...insumos].map(updateInsumoStatus)
}

export function getInsumoById(id: string): Insumo | null {
  const insumo = insumos.find((i) => i.id === id)
  return insumo ? updateInsumoStatus(insumo) : null
}

function calculateStatus(quantidade: number, quantidadeMinima: number): StatusEstoque {
  if (quantidade <= quantidadeMinima * 0.3) return 'critico'
  if (quantidade <= quantidadeMinima) return 'atencao'
  return 'bom'
}

function updateInsumoStatus(insumo: Insumo): Insumo {
  const status = calculateStatus(insumo.quantidade, insumo.quantidadeMinima)
  return { ...insumo, status }
}

export function createInsumo(data: Omit<Insumo, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Insumo {
  const status = calculateStatus(data.quantidade, data.quantidadeMinima)
  const newInsumo: Insumo = {
    ...data,
    id: Date.now().toString(),
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  insumos.push(newInsumo)
  return newInsumo
}

export function updateInsumo(id: string, data: Partial<Insumo>): Insumo | null {
  const index = insumos.findIndex((i) => i.id === id)
  if (index === -1) return null

  const updated = { ...insumos[index], ...data, updatedAt: new Date() }
  updated.status = calculateStatus(updated.quantidade, updated.quantidadeMinima)
  insumos[index] = updated
  return updated
}

export function deleteInsumo(id: string): boolean {
  const index = insumos.findIndex((i) => i.id === id)
  if (index === -1) return false
  insumos.splice(index, 1)
  return true
}

// Funções de saídas
export function getSaidas(): SaidaInsumo[] {
  return [...saidas].sort((a, b) => b.dataRetirada.getTime() - a.dataRetirada.getTime())
}

export function createSaida(data: Omit<SaidaInsumo, 'id' | 'createdAt'>): SaidaInsumo | null {
  const insumo = insumos.find((i) => i.id === data.insumoId)
  if (!insumo || insumo.quantidade < data.quantidade) return null

  // Atualiza quantidade do insumo
  updateInsumo(data.insumoId, { quantidade: insumo.quantidade - data.quantidade })

  const newSaida: SaidaInsumo = {
    ...data,
    id: Date.now().toString(),
    createdAt: new Date(),
  }
  saidas.push(newSaida)
  return newSaida
}

// Funções de métricas
export function getDashboardMetrics() {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const allInsumos = getInsumos()

  return {
    totalInsumos: allInsumos.length,
    insumosAtivos: allInsumos.filter((i) => i.quantidade > 0).length,
    insumosVencendo: allInsumos.filter((i) => i.dataVencimento <= thirtyDaysFromNow && i.dataVencimento > now).length,
    insumosVencidos: allInsumos.filter((i) => i.dataVencimento <= now).length,
    insumosCriticos: allInsumos.filter((i) => i.status === 'critico').length,
    insumosAtencao: allInsumos.filter((i) => i.status === 'atencao').length,
    saidasMes: saidas.filter((s) => s.dataRetirada >= startOfMonth).length,
    entradasMes: allInsumos.filter((i) => i.dataEntrada >= startOfMonth).length,
  }
}

export function getInsumosByTipo(): Record<TipoInsumo, number> {
  const allInsumos = getInsumos()
  return {
    injetavel: allInsumos.filter((i) => i.tipo === 'injetavel').length,
    descartavel: allInsumos.filter((i) => i.tipo === 'descartavel').length,
    peeling: allInsumos.filter((i) => i.tipo === 'peeling').length,
  }
}

export function getInsumosByStatus(): Record<StatusEstoque, number> {
  const allInsumos = getInsumos()
  return {
    bom: allInsumos.filter((i) => i.status === 'bom').length,
    atencao: allInsumos.filter((i) => i.status === 'atencao').length,
    critico: allInsumos.filter((i) => i.status === 'critico').length,
  }
}

export function getInsumosVencendo(days: number = 30): Insumo[] {
  const now = new Date()
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  return getInsumos()
    .filter((i) => i.dataVencimento <= futureDate && i.dataVencimento > now)
    .sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime())
}

export function getInsumosCriticos(): Insumo[] {
  return getInsumos().filter((i) => i.status === 'critico' || i.status === 'atencao')
}

export function getTopConsumo(limit: number = 5): { nome: string; total: number }[] {
  const consumoMap = new Map<string, number>()

  saidas.forEach((s) => {
    const current = consumoMap.get(s.insumoNome) || 0
    consumoMap.set(s.insumoNome, current + s.quantidade)
  })

  return Array.from(consumoMap.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}
