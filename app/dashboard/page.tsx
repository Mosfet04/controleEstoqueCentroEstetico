'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import {
  getDashboardMetrics,
  getInsumosByTipo,
  getInsumosByStatus,
  getInsumosVencendo,
  getInsumosCriticos,
} from '@/lib/store'
import { TIPO_LABELS, STATUS_LABELS, Insumo, TipoInsumo, StatusEstoque } from '@/lib/types'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string
  value: number | string
  description?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            <span className="text-2xl font-bold text-foreground">{value}</span>
            {description && <span className="text-xs text-muted-foreground">{description}</span>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            {trend && trendValue && (
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                }`}
              >
                {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                {trendValue}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: StatusEstoque }) {
  const variants: Record<StatusEstoque, { className: string }> = {
    bom: { className: 'bg-green-100 text-green-700 border-green-200' },
    atencao: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    critico: { className: 'bg-red-100 text-red-700 border-red-200' },
  }
  return (
    <Badge variant="outline" className={variants[status].className}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

function TipoBadge({ tipo }: { tipo: TipoInsumo }) {
  const variants: Record<TipoInsumo, { className: string }> = {
    injetavel: { className: 'bg-blue-100 text-blue-700 border-blue-200' },
    descartavel: { className: 'bg-gray-100 text-gray-700 border-gray-200' },
    peeling: { className: 'bg-purple-100 text-purple-700 border-purple-200' },
  }
  return (
    <Badge variant="outline" className={variants[tipo].className}>
      {TIPO_LABELS[tipo]}
    </Badge>
  )
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<ReturnType<typeof getDashboardMetrics> | null>(null)
  const [byTipo, setByTipo] = useState<Record<TipoInsumo, number> | null>(null)
  const [byStatus, setByStatus] = useState<Record<StatusEstoque, number> | null>(null)
  const [vencendo, setVencendo] = useState<Insumo[]>([])
  const [criticos, setCriticos] = useState<Insumo[]>([])

  useEffect(() => {
    setMetrics(getDashboardMetrics())
    setByTipo(getInsumosByTipo())
    setByStatus(getInsumosByStatus())
    setVencendo(getInsumosVencendo(30))
    setCriticos(getInsumosCriticos())
  }, [])

  if (!metrics || !byTipo || !byStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do estoque da clínica</p>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Insumos"
          value={metrics.totalInsumos}
          description={`${metrics.insumosAtivos} ativos`}
          icon={Package}
        />
        <MetricCard
          title="Estoque Crítico"
          value={metrics.insumosCriticos}
          description={`${metrics.insumosAtencao} em atenção`}
          icon={AlertTriangle}
          trend={metrics.insumosCriticos > 0 ? 'down' : 'neutral'}
          trendValue={metrics.insumosCriticos > 0 ? 'Reposição necessária' : 'Sob controle'}
        />
        <MetricCard
          title="Vencendo em 30 dias"
          value={metrics.insumosVencendo}
          description={`${metrics.insumosVencidos} vencidos`}
          icon={Clock}
          trend={metrics.insumosVencendo > 0 ? 'down' : 'up'}
          trendValue={metrics.insumosVencendo > 0 ? 'Atenção' : 'OK'}
        />
        <MetricCard
          title="Movimentação Mês"
          value={metrics.saidasMes}
          description={`${metrics.entradasMes} entradas`}
          icon={CheckCircle2}
          trend="neutral"
          trendValue="Saídas"
        />
      </div>

      {/* Distribuição por tipo e status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Tipo</CardTitle>
            <CardDescription>Distribuição dos insumos por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Object.keys(byTipo) as TipoInsumo[]).map((tipo) => (
                <div key={tipo} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TipoBadge tipo={tipo} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{byTipo[tipo]}</span>
                    <span className="text-sm text-muted-foreground">itens</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Status</CardTitle>
            <CardDescription>Situação atual do estoque</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Object.keys(byStatus) as StatusEstoque[]).map((status) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{byStatus[status]}</span>
                    <span className="text-sm text-muted-foreground">itens</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Vencendo em Breve
            </CardTitle>
            <CardDescription>Insumos com vencimento nos próximos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {vencendo.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum insumo vencendo em breve.</p>
            ) : (
              <div className="space-y-3">
                {vencendo.slice(0, 5).map((insumo) => {
                  const diasRestantes = differenceInDays(insumo.dataVencimento, new Date())
                  return (
                    <div key={insumo.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{insumo.nome}</span>
                        <span className="text-xs text-muted-foreground">Lote: {insumo.lote}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-yellow-700">
                          {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {format(insumo.dataVencimento, 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Estoque Baixo
            </CardTitle>
            <CardDescription>Insumos que precisam de reposição</CardDescription>
          </CardHeader>
          <CardContent>
            {criticos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum insumo com estoque baixo.</p>
            ) : (
              <div className="space-y-3">
                {criticos.slice(0, 5).map((insumo) => (
                  <div
                    key={insumo.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      insumo.status === 'critico' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{insumo.nome}</span>
                      <span className="text-xs text-muted-foreground">{insumo.fornecedor}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-semibold ${
                          insumo.status === 'critico' ? 'text-red-700' : 'text-yellow-700'
                        }`}
                      >
                        {insumo.quantidade} un
                      </span>
                      <p className="text-xs text-muted-foreground">Mín: {insumo.quantidadeMinima}</p>
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
