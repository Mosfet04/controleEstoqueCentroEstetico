import { z } from 'zod'

// ---------------------------------------------------------------------------
// Insumo
// ---------------------------------------------------------------------------

export const insumoSchema = z
  .object({
    nome: z.string().min(1, 'Nome é obrigatório').max(200),
    lote: z.string().min(1, 'Lote é obrigatório').max(100),
    tipo: z.enum(['injetavel', 'descartavel', 'peeling'], {
      errorMap: () => ({ message: 'Tipo inválido' }),
    }),
    fornecedor: z.string().min(1, 'Fornecedor é obrigatório').max(200),
    quantidade: z.number().int().min(0, 'Quantidade não pode ser negativa'),
    quantidadeMinima: z.number().int().min(0, 'Quantidade mínima não pode ser negativa'),
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
  quantidade: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
  observacao: z.string().max(500).optional(),
})

export type SaidaInput = z.infer<typeof saidaSchema>

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
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().max(320).optional(),
  role: z.enum(['admin', 'clinico']).optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
