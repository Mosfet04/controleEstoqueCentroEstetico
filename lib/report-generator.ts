import ExcelJS from 'exceljs'
import type { DashboardApi } from '@/lib/api'
import { nowSP, SP_TIMEZONE } from '@/lib/utils'

const TIPO_SAIDA_LABELS: Record<string, string> = {
  uso: 'Uso Clínico',
  descarte: 'Descarte',
  ajuste: 'Ajuste',
}

const STATUS_LABELS: Record<string, string> = {
  bom: 'Bom',
  atencao: 'Atenção',
  critico: 'Crítico',
}

function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7C3AED' },
    }
    cell.alignment = { horizontal: 'center' }
  })
}

function autoFitColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let maxLength = 10
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const length = String(cell.value ?? '').length
      if (length > maxLength) maxLength = length
    })
    column.width = Math.min(maxLength + 2, 40)
  })
}

export async function generateReport(data: DashboardApi): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Stock Beauty Clinic'
  workbook.created = nowSP()

  // --- Resumo ---
  const resumo = workbook.addWorksheet('Resumo')
  resumo.columns = [
    { header: 'Métrica', key: 'metrica' },
    { header: 'Valor', key: 'valor' },
  ]
  applyHeaderStyle(resumo.getRow(1))

  const metricsRows = [
    ['Total de Insumos', data.metrics.totalInsumos],
    ['Insumos Ativos', data.metrics.insumosAtivos],
    ['Estoque Crítico', data.metrics.insumosCriticos],
    ['Estoque Atenção', data.metrics.insumosAtencao],
    ['Vencendo (30 dias)', data.metrics.insumosVencendo],
    ['Vencidos', data.metrics.insumosVencidos],
    ['Saídas Uso Clínico (mês)', data.metrics.saidasMes],
    ['Descartes (mês)', data.metrics.descartesMes],
    ['Ajustes (mês)', data.metrics.ajustesMes],
  ]
  metricsRows.forEach(([metrica, valor]) => {
    resumo.addRow({ metrica, valor })
  })
  autoFitColumns(resumo)

  // --- Distribuição por Tipo ---
  const tipos = workbook.addWorksheet('Por Tipo')
  tipos.columns = [
    { header: 'Tipo', key: 'tipo' },
    { header: 'Quantidade', key: 'quantidade' },
  ]
  applyHeaderStyle(tipos.getRow(1))
  const tipoMeta = data.tiposMeta ?? []
  if (tipoMeta.length > 0) {
    tipoMeta.forEach((meta) => {
      tipos.addRow({ tipo: meta.nome, quantidade: data.byTipo[meta.slug] ?? 0 })
    })
  } else {
    const tipoEntries = Object.entries(data.byTipo) as [string, number][]
    tipoEntries.forEach(([tipo, qtd]) => {
      tipos.addRow({ tipo, quantidade: qtd })
    })
  }
  autoFitColumns(tipos)

  // --- Distribuição por Status ---
  const statusSheet = workbook.addWorksheet('Por Status')
  statusSheet.columns = [
    { header: 'Status', key: 'status' },
    { header: 'Quantidade', key: 'quantidade' },
  ]
  applyHeaderStyle(statusSheet.getRow(1))
  const statusEntries = Object.entries(data.byStatus) as [string, number][]
  statusEntries.forEach(([status, qtd]) => {
    statusSheet.addRow({ status: STATUS_LABELS[status] ?? status, quantidade: qtd })
  })
  autoFitColumns(statusSheet)

  // --- Top Consumo ---
  const consumo = workbook.addWorksheet('Top Consumo')
  consumo.columns = [
    { header: 'Insumo', key: 'nome' },
    { header: 'Total Saídas', key: 'total' },
  ]
  applyHeaderStyle(consumo.getRow(1))
  data.topConsumo.forEach((item) => consumo.addRow(item))
  autoFitColumns(consumo)

  // --- Volume por Tipo de Saída ---
  const volume = workbook.addWorksheet('Volume por Tipo Saída')
  volume.columns = [
    { header: 'Tipo', key: 'tipo' },
    { header: 'Unidades', key: 'total' },
  ]
  applyHeaderStyle(volume.getRow(1))
  data.volumePorTipo.forEach((v) => {
    volume.addRow({ tipo: TIPO_SAIDA_LABELS[v.tipo] ?? v.tipo, total: v.total })
  })
  autoFitColumns(volume)

  // --- Movimentação por Colaborador ---
  const colab = workbook.addWorksheet('Por Colaborador')
  colab.columns = [
    { header: 'Colaborador', key: 'nome' },
    { header: 'Uso Clínico', key: 'uso' },
    { header: 'Descartes', key: 'descarte' },
    { header: 'Ajustes', key: 'ajuste' },
    { header: 'Total', key: 'total' },
  ]
  applyHeaderStyle(colab.getRow(1))
  data.movimentacaoColaborador.forEach((c) => colab.addRow(c))
  autoFitColumns(colab)

  // --- Top Descartes ---
  const descartes = workbook.addWorksheet('Top Descartes')
  descartes.columns = [
    { header: 'Produto', key: 'nome' },
    { header: 'Quantidade', key: 'total' },
    { header: 'Motivo Principal', key: 'motivo' },
  ]
  applyHeaderStyle(descartes.getRow(1))
  data.topDescartes.forEach((d) => descartes.addRow(d))
  autoFitColumns(descartes)

  // --- Insumos Zerados ---
  const zerados = workbook.addWorksheet('Estoque Zerado')
  zerados.columns = [
    { header: 'Produto', key: 'nome' },
    { header: 'Tipo', key: 'tipo' },
    { header: 'Fornecedor', key: 'fornecedor' },
  ]
  applyHeaderStyle(zerados.getRow(1))
  data.insumosZerados.forEach((i) => {
    zerados.addRow({
      nome: i.nome,
      tipo: i.tipoNome,
      fornecedor: i.fornecedor,
    })
  })
  autoFitColumns(zerados)

  // --- Fornecedores ---
  const fornSheet = workbook.addWorksheet('Fornecedores')
  fornSheet.columns = [
    { header: 'Fornecedor', key: 'nome' },
    { header: 'Nº Insumos', key: 'total' },
  ]
  applyHeaderStyle(fornSheet.getRow(1))
  data.fornecedores.forEach((f) => fornSheet.addRow(f))
  autoFitColumns(fornSheet)

  // --- Vencendo ---
  const vencSheet = workbook.addWorksheet('Vencendo 60 dias')
  vencSheet.columns = [
    { header: 'Insumo', key: 'nome' },
    { header: 'Vencimento', key: 'dataVencimento' },
    { header: 'Status', key: 'status' },
  ]
  applyHeaderStyle(vencSheet.getRow(1))
  data.vencendo60.forEach((v) => {
    vencSheet.addRow({
      nome: v.nome,
      dataVencimento: new Date(v.dataVencimento).toLocaleDateString('pt-BR', { timeZone: SP_TIMEZONE }),
      status: STATUS_LABELS[v.status] ?? v.status,
    })
  })
  autoFitColumns(vencSheet)

  // --- Estoque Baixo ---
  const criticoSheet = workbook.addWorksheet('Estoque Baixo')
  criticoSheet.columns = [
    { header: 'Insumo', key: 'nome' },
    { header: 'Quantidade', key: 'quantidade' },
    { header: 'Mínimo', key: 'quantidadeMinima' },
    { header: 'Status', key: 'status' },
  ]
  applyHeaderStyle(criticoSheet.getRow(1))
  data.criticos.forEach((c) => {
    criticoSheet.addRow({
      nome: c.nome,
      quantidade: c.quantidade,
      quantidadeMinima: c.quantidadeMinima,
      status: STATUS_LABELS[c.status] ?? c.status,
    })
  })
  autoFitColumns(criticoSheet)

  // --- Atividade Recente ---
  const ativSheet = workbook.addWorksheet('Atividade Recente')
  ativSheet.columns = [
    { header: 'Insumo', key: 'insumoNome' },
    { header: 'Responsável', key: 'responsavel' },
    { header: 'Tipo', key: 'tipo' },
    { header: 'Quantidade', key: 'quantidade' },
    { header: 'Data', key: 'dataRetirada' },
  ]
  applyHeaderStyle(ativSheet.getRow(1))
  data.atividadeRecente.forEach((a) => {
    ativSheet.addRow({
      insumoNome: a.insumoNome,
      responsavel: a.responsavel,
      tipo: TIPO_SAIDA_LABELS[a.tipo] ?? a.tipo,
      quantidade: a.quantidade,
      dataRetirada: new Date(a.dataRetirada).toLocaleString('pt-BR', { timeZone: SP_TIMEZONE }),
    })
  })
  autoFitColumns(ativSheet)

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
