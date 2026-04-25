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
  Trash2,
  SlidersHorizontal,
} from 'lucide-react'
import { dashboardApi, DashboardApi } from '@/lib/api'
import { COR_BADGE_MAP } from '@/lib/types'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { toSP, nowSP } from '@/lib/utils'
import { useUnidade } from '@/contexts/unidade-context'

type StatusEstoque = 'bom' | 'atencao' | 'critico'

const STATUS_LABELS: Record<StatusEstoque, string> = {
  bom: 'Bom',
  atencao: 'Atenção',
  critico: 'Crítico',
}

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

function TipoBadge({ nome, cor }: { nome: string; cor: string }) {
  const className = COR_BADGE_MAP[cor] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <Badge variant="outline" className={className}>
      {nome}
    </Badge>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardApi | null>(null)
  const { unidadeAtiva, isGlobalView, isLoading: unidadeLoading } = useUnidade()

  useEffect(() => {
    if (unidadeLoading) return
    setData(null)
    dashboardApi.get()
      .then(setData)
      .catch(() => toast.error('Erro ao carregar métricas'))
  }, [unidadeAtiva, isGlobalView, unidadeLoading])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { metrics, byTipo, byStatus, vencendo30, criticos, tiposMeta } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          {unidadeAtiva ? `${unidadeAtiva.nome} — ` : ''}Visão geral do estoque da clínica
        </p>
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
          title="Uso Clínico Mês"
          value={metrics.saidasMes}
          description="Saídas de uso registradas"
          icon={CheckCircle2}
          trend="neutral"
          trendValue="Saídas"
        />
      </div>

      {/* Métricas de descarte e ajuste */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          title="Descartes Mês"
          value={metrics.descartesMes}
          description="Produtos vencidos ou avariados"
          icon={Trash2}
          trend={metrics.descartesMes > 0 ? 'down' : 'neutral'}
          trendValue={metrics.descartesMes > 0 ? 'Verificar lotes' : 'Sem descartes'}
        />
        <MetricCard
          title="Ajustes Mês"
          value={metrics.ajustesMes}
          description="Correções de desvio de estoque"
          icon={SlidersHorizontal}
          trend={metrics.ajustesMes > 0 ? 'down' : 'neutral'}
          trendValue={metrics.ajustesMes > 0 ? 'Revisar processos' : 'Sem ajustes'}
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
              {(tiposMeta ?? []).map((meta) => (
                <div key={meta.slug} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TipoBadge nome={meta.nome} cor={meta.cor} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{byTipo[meta.slug] ?? 0}</span>
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
            {vencendo30.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum insumo vencendo em breve.</p>
            ) : (
              <div className="space-y-3">
                {vencendo30.slice(0, 5).map((insumo) => {
                  const diasRestantes = differenceInDays(toSP(insumo.dataVencimento), nowSP())
                  return (
                    <div key={insumo.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{insumo.nome}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-yellow-700">
                          {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
                        </span>
                        <p className="text-xs text-muted-foreground">
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

