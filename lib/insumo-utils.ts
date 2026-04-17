import { Insumo } from '@prisma/client'
import { nowSP } from '@/lib/utils'

export type StatusEstoque = 'bom' | 'atencao' | 'critico'

/**
 * Calculates stock status based on current quantity vs minimum and expiry date.
 * Called on every read — never stored — so it's always accurate.
 */
export function calcularStatus(
  quantidade: number,
  quantidadeMinima: number,
  dataVencimento: Date
): StatusEstoque {
  const hoje = nowSP()
  const diasParaVencer = Math.ceil(
    (dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Expired or critical shortage
  if (diasParaVencer <= 0 || quantidade <= Math.floor(quantidadeMinima * 0.3)) {
    return 'critico'
  }

  // Expiring within 30 days or below minimum
  if (diasParaVencer <= 30 || quantidade <= quantidadeMinima) {
    return 'atencao'
  }

  return 'bom'
}

export function insumoWithStatus(insumo: Insumo) {
  return {
    ...insumo,
    status: calcularStatus(insumo.quantidade, insumo.quantidadeMinima, insumo.dataVencimento),
  }
}

export type InsumoWithStatus = ReturnType<typeof insumoWithStatus>
