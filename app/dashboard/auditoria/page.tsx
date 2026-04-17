'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClipboardList, CalendarIcon } from 'lucide-react'
import { auditoriaApi, AuditLogApi, ApiError } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { toSP, nowSP } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
  DEACTIVATE: 'Desativação',
  REACTIVATE: 'Reativação',
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  DEACTIVATE: 'bg-gray-100 text-gray-500 border-gray-300',
  REACTIVATE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const ENTITY_LABELS: Record<string, string> = {
  insumo: 'Insumo',
  saida: 'Saída',
  usuario: 'Usuário',
  unidade: 'Unidade',
}

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details) return '—'
  const parts: string[] = []
  if (details.nome) parts.push(`${details.nome}`)
  if (details.email) parts.push(`${details.email}`)
  if (details.insumoNome) parts.push(`${details.insumoNome}`)
  if (details.quantidade) parts.push(`Qtd: ${details.quantidade}`)
  if (details.tipo) parts.push(`Tipo: ${details.tipo}`)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

export default function AuditoriaPage() {
  const router = useRouter()
  const { user: currentUser, isLoading } = useAuth()
  const [logs, setLogs] = useState<AuditLogApi[]>([])
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')

  const now = nowSP()
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), 'yyyy-MM-dd'))
  const [appliedFrom, setAppliedFrom] = useState(dateFrom)
  const [appliedTo, setAppliedTo] = useState(dateTo)

  const loadLogs = async () => {
    try {
      const data = await auditoriaApi.list({
        entity: entityFilter !== 'all' ? entityFilter : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        from: new Date(appliedFrom).toISOString(),
        to: new Date(appliedTo + 'T23:59:59').toISOString(),
        limit: 200,
      })
      setLogs(data)
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        toast.error('Erro ao carregar logs de auditoria')
      }
    }
  }

  const handleFilter = () => {
    setAppliedFrom(dateFrom)
    setAppliedTo(dateTo)
  }

  useEffect(() => {
    if (!isLoading && currentUser) {
      if (currentUser.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      loadLogs()
    }
  }, [isLoading, currentUser, router, entityFilter, actionFilter, appliedFrom, appliedTo])

  if (isLoading || !currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
        <p className="text-muted-foreground">Histórico de alterações no sistema</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
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
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Entidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas entidades</SelectItem>
            <SelectItem value="insumo">Insumo</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
            <SelectItem value="usuario">Usuário</SelectItem>
            <SelectItem value="unidade">Unidade</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ações</SelectItem>
            <SelectItem value="CREATE">Criação</SelectItem>
            <SelectItem value="UPDATE">Atualização</SelectItem>
            <SelectItem value="DELETE">Exclusão</SelectItem>
            <SelectItem value="DEACTIVATE">Desativação</SelectItem>
            <SelectItem value="REACTIVATE">Reativação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Log de Auditoria
          </CardTitle>
          <CardDescription>{logs.length} registro(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(toSP(log.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm">{log.user.name}</span>
                          <p className="text-xs text-muted-foreground">{log.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ACTION_COLORS[log.action] ?? ''}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {ENTITY_LABELS[log.entity] ?? log.entity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {formatDetails(log.details)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
