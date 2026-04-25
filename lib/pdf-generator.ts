import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DashboardApi } from '@/lib/api'
import { nowSP, SP_TIMEZONE } from '@/lib/utils'

const PURPLE = [124, 58, 237] as [number, number, number]
const WHITE = [255, 255, 255] as [number, number, number]
const LIGHT_GRAY = [248, 248, 248] as [number, number, number]

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

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...PURPLE)
  doc.rect(14, y - 5, 182, 8, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 16, y)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  return y + 8
}

function getTableY(doc: jsPDF): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable?.finalY ?? 0
}

export function generatePdfReport(data: DashboardApi): ArrayBuffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = nowSP()
  const dateStr = now.toLocaleDateString('pt-BR', { timeZone: SP_TIMEZONE })
  const timeStr = now.toLocaleTimeString('pt-BR', { timeZone: SP_TIMEZONE, hour: '2-digit', minute: '2-digit' })

  // --- Capa ---
  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, 210, 50, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Stock Beauty Clinic', 14, 22)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatório de Controle de Estoque', 14, 32)
  doc.setFontSize(9)
  doc.text(`Gerado em: ${dateStr} às ${timeStr}`, 14, 42)
  doc.setTextColor(0, 0, 0)

  let y = 62

  // --- Métricas Gerais ---
  y = addSectionTitle(doc, 'Métricas Gerais', y)
  autoTable(doc, {
    startY: y,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de Insumos', String(data.metrics.totalInsumos)],
      ['Insumos Ativos', String(data.metrics.insumosAtivos)],
      ['Estoque Crítico', String(data.metrics.insumosCriticos)],
      ['Estoque Atenção', String(data.metrics.insumosAtencao)],
      ['Vencendo (30 dias)', String(data.metrics.insumosVencendo)],
      ['Vencidos', String(data.metrics.insumosVencidos)],
      ['Saídas Uso Clínico (mês)', String(data.metrics.saidasMes)],
      ['Descartes (mês)', String(data.metrics.descartesMes)],
      ['Ajustes (mês)', String(data.metrics.ajustesMes)],
    ],
    headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    margin: { left: 14, right: 14 },
  })
  y = getTableY(doc) + 12

  // --- Distribuição por Tipo ---
  if (data.tiposMeta && data.tiposMeta.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    y = addSectionTitle(doc, 'Distribuição por Tipo', y)
    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'Quantidade']],
      body: data.tiposMeta.map((meta) => [meta.nome, String(data.byTipo[meta.slug] ?? 0)]),
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
    })
    y = getTableY(doc) + 12
  }

  // --- Distribuição por Status ---
  if (y > 240) { doc.addPage(); y = 20 }
  y = addSectionTitle(doc, 'Distribuição por Status', y)
  autoTable(doc, {
    startY: y,
    head: [['Status', 'Quantidade']],
    body: Object.entries(data.byStatus).map(([status, qtd]) => [STATUS_LABELS[status] ?? status, String(qtd)]),
    headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    margin: { left: 14, right: 14 },
  })
  y = getTableY(doc) + 12

  // --- Top Consumo ---
  if (data.topConsumo.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    y = addSectionTitle(doc, 'Top Consumo (mês)', y)
    autoTable(doc, {
      startY: y,
      head: [['Insumo', 'Total Saídas']],
      body: data.topConsumo.map((i) => [i.nome, String(i.total)]),
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
    })
    y = getTableY(doc) + 12
  }

  // --- Vencendo em 60 dias ---
  if (data.vencendo60.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    y = addSectionTitle(doc, 'Vencendo em 60 dias', y)
    autoTable(doc, {
      startY: y,
      head: [['Insumo', 'Vencimento', 'Status']],
      body: data.vencendo60.map((v) => [
        v.nome,
        new Date(v.dataVencimento).toLocaleDateString('pt-BR', { timeZone: SP_TIMEZONE }),
        STATUS_LABELS[v.status] ?? v.status,
      ]),
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
    })
    y = getTableY(doc) + 12
  }

  // --- Top Descartes ---
  if (data.topDescartes.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    y = addSectionTitle(doc, 'Top Descartes (mês)', y)
    autoTable(doc, {
      startY: y,
      head: [['Produto', 'Quantidade', 'Motivo Principal']],
      body: data.topDescartes.map((d) => [d.nome, String(d.total), d.motivo]),
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
    })
    y = getTableY(doc) + 12
  }

  // --- Por Colaborador ---
  if (data.movimentacaoColaborador.length > 0) {
    if (y > 220) { doc.addPage(); y = 20 }
    y = addSectionTitle(doc, 'Movimentação por Colaborador', y)
    autoTable(doc, {
      startY: y,
      head: [['Colaborador', 'Uso', 'Descarte', 'Ajuste', 'Total']],
      body: data.movimentacaoColaborador.map((c) => [c.nome, String(c.uso), String(c.descarte), String(c.ajuste), String(c.total)]),
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
    })
    y = getTableY(doc) + 12
  }

  // --- Volume por Tipo de Saída ---
  if (data.volumePorTipo.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    y = addSectionTitle(doc, 'Volume por Tipo de Saída', y)
    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'Unidades']],
      body: data.volumePorTipo.map((v) => [TIPO_SAIDA_LABELS[v.tipo] ?? v.tipo, String(v.total)]),
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
    })
    y = getTableY(doc) + 12
  }

  // --- Estoque Zerado ---
  if (data.insumosZerados.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    y = addSectionTitle(doc, 'Estoque Zerado', y)
    autoTable(doc, {
      startY: y,
      head: [['Produto', 'Tipo', 'Fornecedor']],
      body: data.insumosZerados.map((i) => [i.nome, i.tipoNome, i.fornecedor]),
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
    })
    y = getTableY(doc) + 12
  }

  // --- Fornecedores ---
  if (data.fornecedores.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    y = addSectionTitle(doc, 'Fornecedores', y)
    autoTable(doc, {
      startY: y,
      head: [['Fornecedor', 'Nº Insumos']],
      body: data.fornecedores.map((f) => [f.nome, String(f.total)]),
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
    })
  }

  // Rodapé com número de páginas
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(130, 130, 130)
    doc.text(`Página ${i} de ${totalPages}`, 196, 292, { align: 'right' })
    doc.text('Stock Beauty Clinic — Controle de Estoque', 14, 292)
  }

  return doc.output('arraybuffer')
}
