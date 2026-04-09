'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { dashboardApi, DashboardApi, ApiError } from '@/lib/api'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, Clock, TrendingUp, Package, Trash2, SlidersHorizontal, Users, Activity, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type TipoInsumo = 'injetavel' | 'descartavel' | 'peeling'
type StatusEstoque = 'bom' | 'atencao' | 'critico'

const TIPO_LABELS: Record<TipoInsumo, string> = {
  injetavel: 'Injetável',
  descartavel: 'Descartável',
  peeling: 'Peeling',
}

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

const TIPO_COLORS: Record<TipoInsumo, string> = {
  injetavel: COLORS.blue,
  descartavel: COLORS.gray,
  peeling: COLORS.purple,
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

const TIPO_INSUMO_LABELS: Record<string, string> = {
  injetavel: 'Injetável',
  descartavel: 'Descartável',
  peeling: 'Peeling',
}

export default function RelatoriosPage() {
  const [data, setData] = useState<DashboardApi | null>(null)

  useEffect(() => {
    dashboardApi.get()
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status !== 401) {
          toast.error('Erro ao carregar relatórios')
        }
      })
  }, [])

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
    fornecedores, atividadeRecente,
  } = data

  const tipoData = (Object.keys(byTipo) as TipoInsumo[]).map((tipo) => ({
    name: TIPO_LABELS[tipo],
    value: byTipo[tipo],
    color: TIPO_COLORS[tipo],
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">Análises e métricas do controle de estoque</p>
      </div>

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
                      {TIPO_INSUMO_LABELS[i.tipo] ?? i.tipo}
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
                    {format(new Date(a.dataRetirada), "dd/MM HH:mm", { locale: ptBR })}
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
                  const dias = differenceInDays(new Date(insumo.dataVencimento), new Date())
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
                          {format(new Date(insumo.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}
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
    </div>
  )
}
