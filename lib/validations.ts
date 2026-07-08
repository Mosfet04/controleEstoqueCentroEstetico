import { z } from 'zod'

// ---------------------------------------------------------------------------
// TipoInsumo (dinâmico)
// ---------------------------------------------------------------------------

export const tipoInsumoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  slug: z
    .string()
    .min(1, 'Slug é obrigatório')
    .max(60)
    .regex(/^[a-z0-9_]+$/, 'Slug deve conter apenas letras minúsculas, números e _'),
  cor: z
    .enum(['blue', 'gray', 'purple', 'green', 'red', 'yellow', 'pink', 'orange', 'indigo', 'teal'])
    .default('gray'),
})

export type TipoInsumoInput = z.infer<typeof tipoInsumoSchema>

// ---------------------------------------------------------------------------
// Unidade
// ---------------------------------------------------------------------------

export const unidadeSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(200),
  endereco: z.string().max(500).optional(),
  telefone: z.string().max(30).optional(),
})

export type UnidadeInput = z.infer<typeof unidadeSchema>

// ---------------------------------------------------------------------------
// Insumo
// ---------------------------------------------------------------------------

export const insumoSchema = z
  .object({
    nome: z.string().min(1, 'Nome é obrigatório').max(200),
    lote: z.string().min(1, 'Lote é obrigatório').max(100),
    tipoId: z.string().min(1, 'Tipo é obrigatório'),
    fornecedor: z.string().min(1, 'Fornecedor é obrigatório').max(200),
    quantidade: z.number().int().min(0, 'Quantidade não pode ser negativa'),
    quantidadeMinima: z.number().int().min(0, 'Quantidade mínima não pode ser negativa'),
    precoUnitario: z.number().positive('Preço deve ser positivo').nullable().optional(),
    dataEntrada: z.string().datetime({ message: 'Data de entrada inválida' }),
    dataVencimento: z.string().datetime({ message: 'Data de vencimento inválida' }),
  })
  .refine(
    (data) => new Date(data.dataVencimento) > new Date(data.dataEntrada),
    {
      message: 'Data de vencimento deve ser posterior à data de entrada',
      path: ['dataVencimento'],
    }
  )

export type InsumoInput = z.infer<typeof insumoSchema>

// ---------------------------------------------------------------------------
// Saída de Insumo
// ---------------------------------------------------------------------------

export const saidaSchema = z.object({
  insumoId: z.string().cuid({ message: 'ID de insumo inválido' }),
  tipoSaidaId: z.string().min(1, 'Selecione um tipo de saída válido'),
  quantidade: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
  motivo: z.string().max(500).optional(),
  observacao: z.string().max(500).optional(),
})

export type SaidaInput = z.infer<typeof saidaSchema>

// ---------------------------------------------------------------------------
// Pedido a Fornecedor
// ---------------------------------------------------------------------------

export const pedidoSchema = z.object({
  fornecedor: z.string().min(1, 'Fornecedor é obrigatório').max(200),
  produto: z.string().min(1, 'Produto é obrigatório').max(200),
  quantidade: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
  observacao: z.string().max(500).nullable().optional(),
  dataPrevista: z.string().datetime({ message: 'Data prevista inválida' }).nullable().optional(),
})

export type PedidoInput = z.infer<typeof pedidoSchema>

// Atualização/edição do pedido. Só permite cancelar via status — o recebimento
// ocorre pela rota dedicada /api/pedidos/[id]/receber, que dá entrada no estoque.
// Reativar (voltar a "pendente") não é permitido: cancelado é um estado terminal.
export const pedidoUpdateSchema = pedidoSchema.partial().extend({
  status: z.enum(['cancelado']).optional(),
})

export type PedidoUpdateInput = z.infer<typeof pedidoUpdateSchema>

// ---------------------------------------------------------------------------
// TipoSaida (dinâmico)
// ---------------------------------------------------------------------------

export const tipoSaidaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  slug: z
    .string()
    .min(1, 'Slug é obrigatório')
    .max(60)
    .regex(/^[a-z0-9_]+$/, 'Slug deve conter apenas letras minúsculas, números e _'),
  categoria: z.enum(['uso', 'descarte', 'ajuste']),
  cor: z
    .enum(['blue', 'gray', 'purple', 'green', 'red', 'yellow', 'pink', 'orange', 'indigo', 'teal'])
    .default('blue'),
})

export type TipoSaidaInput = z.infer<typeof tipoSaidaSchema>

// ---------------------------------------------------------------------------
// Usuário (create/update)
// ---------------------------------------------------------------------------

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  email: z.string().email('E-mail inválido').max(320),
  role: z.enum(['admin', 'clinico'], {
    errorMap: () => ({ message: 'Função inválida. Use admin ou clinico' }),
  }),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha muito longa'),
  unidadeIds: z.array(z.string().cuid()).optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().max(320).optional(),
  role: z.enum(['admin', 'clinico']).optional(),
  unidadeIds: z.array(z.string().cuid()).optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
