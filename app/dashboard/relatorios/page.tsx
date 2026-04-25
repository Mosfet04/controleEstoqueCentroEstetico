'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { dashboardApi, DashboardApi, comparativoApi, ComparativoApi, previsaoApi, PrevisaoItem, ApiError } from '@/lib/api'
import { format, differenceInDays, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, Clock, TrendingUp, Package, Trash2, SlidersHorizontal, Users, Activity, XCircle, Download, Loader2, CalendarIcon, Building2, Gauge, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { toSP, nowSP } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useUnidade } from '@/contexts/unidade-context'
import { useAuth } from '@/contexts/auth-context'
import { COR_CHART_MAP } from '@/lib/types'

type StatusEstoque = 'bom' | 'atencao' | 'critico'

const STATUS_LABELS: Record<StatusEstoque, string> = {
  bom: 'Bom',
  atencao: 'Atenção',
  critico: 'Crítico',
}

const COLORS = {
  primary: '#7c3aed',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  blue: '#3b82f6',
  gray: '#6b7280',
  purple: '#a855f7',
}

const STATUS_COLORS: Record<StatusEstoque, string> = {
  bom: COLORS.success,
  atencao: COLORS.warning,
  critico: COLORS.danger,
}

const TIPO_SAIDA_LABELS: Record<string, string> = {
  uso: 'Uso Clínico',
  descarte: 'Descarte',
  ajuste: 'Ajuste',
}

const TIPO_SAIDA_COLORS: Record<string, string> = {
  uso: COLORS.blue,
  descarte: COLORS.danger,
  ajuste: COLORS.warning,
}


export default function RelatoriosPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [user, router])

  const [data, setData] = useState<DashboardApi | null>(null)
  const [comparativo, setComparativo] = useState<ComparativoApi | null>(null)
  const [previsao, setPrevisao] = useState<PrevisaoItem[] | null>(null)
  const [downloadingFormat, setDownloadingFormat] = useState<'xlsx' | 'pdf' | null>(null)
  const { unidadeAtiva } = useUnidade()

  const now = nowSP()
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), 'yyyy-MM-dd'))
  const [appliedFrom, setAppliedFrom] = useState(dateFrom)
  const [appliedTo, setAppliedTo] = useState(dateTo)

  const loadData = useCallback(() => {
    setData(null)
    dashboardApi.get({
      from: new Date(appliedFrom).toISOString(),
      to: new Date(appliedTo + 'T23:59:59').toISOString(),
    })
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status !== 401) {
          toast.error('Erro ao carregar relatórios')
        }
      })
  }, [appliedFrom, appliedTo])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleFilter = useCallback(() => {
    setAppliedFrom(dateFrom)
    setAppliedTo(dateTo)
  }, [dateFrom, dateTo])

  useEffect(() => {
    comparativoApi.get().then(setComparativo).catch(() => {})
    previsaoApi.list().then(setPrevisao).catch(() => {
      setPrevisao([])
    })
  }, [])

  const handleDownload = useCallback(async (fmt: 'xlsx' | 'pdf') => {
    setDownloadingFormat(fmt)
    try {
      if (fmt === 'pdf') {
        if (!data) return
        const now = nowSP()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const year = now.getFullYear()
        const suffix = `${year}-${month}`
        const { generatePdfReport } = await import('@/lib/pdf-generator')
        const arrayBuffer = generatePdfReport(data)
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `relatorio-estoque-${suffix}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        toast.success('Relatório PDF baixado com sucesso')
        return
      }

      const headers: Record<string, string> = {}
      const savedId = localStorage.getItem('unidadeAtiva')
      if (savedId) headers['x-unidade-id'] = savedId
      const params = new URLSearchParams({
        from: new Date(appliedFrom).toISOString(),
        to: new Date(appliedTo + 'T23:59:59').toISOString(),
      })
      const response = await fetch(`/api/relatorios/export?${params}`, { headers })
      if (!response.ok) throw new Error('Erro ao gerar relatório')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') ?? `relatorio.${fmt}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Relatório baixado com sucesso')
    } catch {
      toast.error('Erro ao baixar relatório')
    } finally {
      setDownloadingFormat(null)
    }
  }, [appliedFrom, appliedTo, data])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const {
    metrics, byTipo, byStatus, topConsumo, vencendo60: vencendo, criticos,
    movimentacaoColaborador, volumePorTipo, topDescartes, insumosZerados,
    fornecedores, atividadeRecente, tiposMeta,
  } = data

  const tipoData = (tiposMeta ?? []).map((meta) => ({
    name: meta.nome,
    value: byTipo[meta.slug] ?? 0,
    color: COR_CHART_MAP[meta.cor] ?? COLORS.gray,
  }))

  const statusData = (Object.keys(byStatus) as StatusEstoque[]).map((status) => ({
    name: STATUS_LABELS[status],
    value: byStatus[status],
    color: STATUS_COLORS[status],
  }))

  const volumeData = volumePorTipo.map((v) => ({
    name: TIPO_SAIDA_LABELS[v.tipo] ?? v.tipo,
    value: v.total,
    color: TIPO_SAIDA_COLORS[v.tipo] ?? COLORS.gray,
  }))

  const fornecedorData = fornecedores.map((f) => ({
    nome: f.nome,
    total: f.total,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            {unidadeAtiva ? `${unidadeAtiva.nome} — ` : ''}Análises e métricas do controle de estoque
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={!!downloadingFormat}>
              {downloadingFormat ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Exportar
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDownload('xlsx')} disabled={!!downloadingFormat}>
              <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload('pdf')} disabled={!!downloadingFormat}>
              <FileText className="w-4 h-4 mr-2 text-red-600" />
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filtro de período */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <CalendarIcon className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[160px]"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[160px]"
            />
            <Button onClick={handleFilter} size="sm">
              <CalendarIcon className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalInsumos}</p>
                <p className="text-xs text-muted-foreground">Total de Insumos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.insumosCriticos}</p>
                <p className="text-xs text-muted-foreground">Estoque Crítico</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-100">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.insumosVencendo}</p>
                <p className="text-xs text-muted-foreground">Vencendo (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.saidasMes}</p>
                <p className="text-xs text-muted-foreground">Saídas no Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de resumo - Linha 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.descartesMes}</p>
                <p className="text-xs text-muted-foreground">Descartes no Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.ajustesMes}</p>
                <p className="text-xs text-muted-foreground">Ajustes no Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.insumosVencidos}</p>
                <p className="text-xs text-muted-foreground">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100">
                <Package className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{insumosZerados.length}</p>
                <p className="text-xs text-muted-foreground">Estoque Zerado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
            <CardDescription>Quantidade de insumos por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tipoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {tipoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Por Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Situação atual do estoque</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Consumo */}
      <Card>
        <CardHeader>
          <CardTitle>Insumos Mais Consumidos</CardTitle>
          <CardDescription>Ranking de retiradas do estoque</CardDescription>
        </CardHeader>
        <CardContent>
          {topConsumo.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhuma saída registrada ainda.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topConsumo} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="total" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Volume por Tipo de Saída */}
      <Card>
        <CardHeader>
          <CardTitle>Volume por Tipo de Saída</CardTitle>
          <CardDescription>Unidades movimentadas no mês por tipo</CardDescription>
        </CardHeader>
        <CardContent>
          {volumeData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhuma saída registrada no mês.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Unidades" radius={[4, 4, 0, 0]}>
                    {volumeData.map((entry, index) => (
                      <Cell key={`vol-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranking e Descartes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Movimentação por Colaborador
            </CardTitle>
            <CardDescription>Ranking de saídas no mês</CardDescription>
          </CardHeader>
          <CardContent>
            {movimentacaoColaborador.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhuma movimentação no mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-right">Uso</TableHead>
                    <TableHead className="text-right">Desc.</TableHead>
                    <TableHead className="text-right">Ajuste</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacaoColaborador.map((c) => (
                    <TableRow key={c.nome}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="text-right">{c.uso}</TableCell>
                      <TableCell className="text-right">{c.descarte}</TableCell>
                      <TableCell className="text-right">{c.ajuste}</TableCell>
                      <TableCell className="text-right font-bold">{c.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Produtos Mais Descartados
            </CardTitle>
            <CardDescription>Top descartes no mês</CardDescription>
          </CardHeader>
          <CardContent>
            {topDescartes.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhum descarte no mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Motivo Principal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDescartes.map((d) => (
                    <TableRow key={d.nome}>
                      <TableCell className="font-medium">{d.nome}</TableCell>
                      <TableCell className="text-right">{d.total}</TableCell>
                      <TableCell>{d.motivo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Zerados e Fornecedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Insumos com Estoque Zerado
            </CardTitle>
            <CardDescription>Produtos sem estoque (ativos nos últimos 2 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            {insumosZerados.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhum insumo com estoque zerado.</p>
            ) : (
              <div className="space-y-3">
                {insumosZerados.map((i) => (
                  <div key={i.nome} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-sm">{i.nome}</p>
                      <p className="text-xs text-muted-foreground">{i.fornecedor}</p>
                    </div>
                    <Badge variant="secondary">
                      {i.tipoNome}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Fornecedor</CardTitle>
            <CardDescription>Top fornecedores por quantidade de insumos</CardDescription>
          </CardHeader>
          <CardContent>
            {fornecedorData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum fornecedor registrado.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fornecedorData} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 12 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="total" name="Insumos" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Atividade Recente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Atividade Recente
          </CardTitle>
          <CardDescription>Últimas movimentações do estoque</CardDescription>
        </CardHeader>
        <CardContent>
          {atividadeRecente.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhuma atividade registrada.</p>
          ) : (
            <div className="space-y-3">
              {atividadeRecente.map((a) => (
                <div key={a.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{a.insumoNome}</p>
                    <p className="text-xs text-muted-foreground">{a.responsavel}</p>
                  </div>
                  <Badge variant={a.tipo === 'descarte' ? 'destructive' : a.tipo === 'ajuste' ? 'secondary' : 'default'}>
                    {TIPO_SAIDA_LABELS[a.tipo] ?? a.tipo}
                  </Badge>
                  <span className="text-sm font-medium tabular-nums">{a.quantidade} un.</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(toSP(a.dataRetirada), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabelas de alerta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vencendo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Previsão de Vencimentos
            </CardTitle>
            <CardDescription>Insumos vencendo nos próximos 60 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {vencendo.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhum insumo vencendo em breve.</p>
            ) : (
              <div className="space-y-3">
                {vencendo.map((insumo) => {
                  const dias = differenceInDays(toSP(insumo.dataVencimento), nowSP())
                  return (
                    <div key={insumo.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium text-sm">{insumo.nome}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={dias <= 15 ? 'destructive' : 'secondary'}>
                          {dias} {dias === 1 ? 'dia' : 'dias'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(toSP(insumo.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estoque Baixo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Estoque Baixo
            </CardTitle>
            <CardDescription>Insumos que precisam de reposição</CardDescription>
          </CardHeader>
          <CardContent>
            {criticos.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Todos os insumos com estoque adequado.</p>
            ) : (
              <div className="space-y-3">
                {criticos.map((insumo) => (
                  <div key={insumo.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-sm">{insumo.nome}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={insumo.status === 'critico' ? 'destructive' : 'secondary'}>
                        {insumo.quantidade} / {insumo.quantidadeMinima}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {insumo.status === 'critico' ? 'Crítico' : 'Atenção'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparativo entre Unidades */}
      {comparativo && comparativo.unidades.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Comparativo entre Unidades
            </CardTitle>
            <CardDescription>Métricas lado a lado de cada unidade (mês atual)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Insumos</TableHead>
                    <TableHead className="text-right">Ativos</TableHead>
                    <TableHead className="text-right">Críticos</TableHead>
                    <TableHead className="text-right">Vencendo</TableHead>
                    <TableHead className="text-right">Saídas</TableHead>
                    <TableHead className="text-right">Descartes</TableHead>
                    <TableHead className="text-right">Ajustes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparativo.unidades.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell className="text-right">{u.totalInsumos}</TableCell>
                      <TableCell className="text-right">{u.insumosAtivos}</TableCell>
                      <TableCell className="text-right">
                        {u.insumosCriticos > 0 ? (
                          <Badge variant="destructive">{u.insumosCriticos}</Badge>
                        ) : (
                          u.insumosCriticos
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.insumosVencendo > 0 ? (
                          <Badge variant="secondary">{u.insumosVencendo}</Badge>
                        ) : (
                          u.insumosVencendo
                        )}
                      </TableCell>
                      <TableCell className="text-right">{u.saidasMes}</TableCell>
                      <TableCell className="text-right">{u.descartesMes}</TableCell>
                      <TableCell className="text-right">{u.ajustesMes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previsão de Reposição */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" />
            Velocidade de Consumo &amp; Previsão de Reposição
          </CardTitle>
          <CardDescription>Estimativa de dias restantes baseada no consumo dos últimos 90 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {previsao === null ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : previsao.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">A previsão de reposição será calculada automaticamente quando houver insumos cadastrados e histórico de saídas.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Média/dia</TableHead>
                    <TableHead className="text-right">Dias Restantes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previsao.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{item.lote || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.unidadeNome}</TableCell>
                      <TableCell className="text-right">{item.quantidade}</TableCell>
                      <TableCell className="text-right">{item.mediaDiaria.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        {item.diasRestantes === null ? (
                          <span className="text-muted-foreground">Sem consumo</span>
                        ) : (
                          <Badge
                            variant={
                              item.diasRestantes <= 7
                                ? 'destructive'
                                : item.diasRestantes <= 30
                                  ? 'secondary'
                                  : 'default'
                            }
                          >
                            {item.diasRestantes}d
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
