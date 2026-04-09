'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { FieldGroup, Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Plus, PackageMinus, Search, Trash2, SlidersHorizontal } from 'lucide-react'
import { saidasApi, insumosApi, SaidaApi, InsumoApi, ApiError } from '@/lib/api'
import { TipoSaida, TIPO_SAIDA_LABELS, MOTIVOS_DESCARTE, MOTIVOS_AJUSTE } from '@/lib/types'
import { useAuth } from '@/contexts/auth-context'
import { useUnidade } from '@/contexts/unidade-context'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface SaidaFormData {
  unidadeId: string
  insumoId: string
  quantidade: number
  tipo: TipoSaida
  motivo: string
  observacao: string
}

const initialFormData: SaidaFormData = {
  unidadeId: '',
  insumoId: '',
  quantidade: 1,
  tipo: 'uso',
  motivo: '',
  observacao: '',
}

const TIPO_BADGE: Record<TipoSaida, { label: string; className: string }> = {
  uso:      { label: 'Uso Clínico',       className: 'bg-blue-100 text-blue-700 border-blue-200' },
  descarte: { label: 'Descarte',          className: 'bg-red-100 text-red-700 border-red-200' },
  ajuste:   { label: 'Ajuste de Estoque', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
}

const SUBMIT_LABELS: Record<TipoSaida, string> = {
  uso:      'Registrar Saída',
  descarte: 'Registrar Descarte',
  ajuste:   'Registrar Ajuste',
}

export default function SaidasPage() {
  const { user } = useAuth()
  const { isGlobalView, unidades, unidadeAtiva } = useUnidade()
  const [saidas, setSaidas] = useState<SaidaApi[]>([])
  const [insumos, setInsumos] = useState<InsumoApi[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<TipoSaida | 'todos'>('todos')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<SaidaFormData>(initialFormData)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const saidasData = await saidasApi.list()
      setSaidas(saidasData)
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        toast.error('Erro ao carregar saídas')
      }
    }
  }

  const loadInsumosForUnit = async (unitId: string) => {
    try {
      const data = await insumosApi.list({ unidadeOverride: unitId })
      setInsumos(data.filter((i) => i.quantidade > 0))
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        toast.error('Erro ao carregar insumos')
      }
    }
  }

  const handleOpenDialog = async () => {
    const defaultUnit = unidadeAtiva?.id ?? unidades.filter((u) => u.ativa)[0]?.id ?? ''
    setFormData({ ...initialFormData, unidadeId: defaultUnit })
    setError(null)
    setIsDialogOpen(true)
    if (defaultUnit) await loadInsumosForUnit(defaultUnit)
  }

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredSaidas = saidas.filter((saida) => {
    const matchSearch =
      saida.insumoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      saida.responsavel.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTipo = tipoFiltro === 'todos' || saida.tipo === tipoFiltro
    return matchSearch && matchTipo
  })

  const selectedInsumo = insumos.find((i) => i.id === formData.insumoId)
  const motivoObrigatorio = formData.tipo !== 'uso'
  const motivoOpcoes = formData.tipo === 'descarte' ? MOTIVOS_DESCARTE : MOTIVOS_AJUSTE

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.unidadeId) {
      setError('Selecione uma unidade')
      return
    }

    if (!formData.insumoId) {
      setError('Selecione um insumo')
      return
    }

    if (motivoObrigatorio && !formData.motivo.trim()) {
      setError('Motivo é obrigatório para descarte e ajuste')
      return
    }

    if (selectedInsumo && formData.quantidade > selectedInsumo.quantidade) {
      setError(`Quantidade indisponível. Estoque atual: ${selectedInsumo.quantidade}`)
      return
    }

    setIsSubmitting(true)
    try {
      await saidasApi.create({
        insumoId: formData.insumoId,
        quantidade: formData.quantidade,
        tipo: formData.tipo,
        motivo: formData.motivo.trim() || undefined,
        observacao: formData.observacao.trim() || undefined,
      }, formData.unidadeId)
      const label = TIPO_SAIDA_LABELS[formData.tipo]
      toast.success(`${label} registrado com sucesso!`)
      setIsDialogOpen(false)
      setFormData(initialFormData)
      setInsumos([])
      await loadData()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError(err.message)
        } else {
          toast.error(err.message)
        }
      } else {
        toast.error('Erro inesperado ao registrar saída')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saídas</h1>
          <p className="text-muted-foreground">Registre uso clínico, descartes e ajustes de estoque</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Saída
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) { setIsDialogOpen(false); setFormData(initialFormData); setError(null); setInsumos([]) }
      }}>
          <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Registrar Saída</DialogTitle>
              <DialogDescription>
                Registre consumo, descarte por vencimento ou ajuste de estoque
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {/* Unidade */}
                <Field>
                  <FieldLabel>Unidade <span className="text-destructive">*</span></FieldLabel>
                  <Select
                    value={formData.unidadeId}
                    onValueChange={async (v) => {
                      setFormData({ ...formData, unidadeId: v, insumoId: '' })
                      await loadInsumosForUnit(v)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.filter((u) => u.ativa).map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {/* Tipo de saída */}
                <Field>
                  <FieldLabel>Tipo de Saída</FieldLabel>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v) =>
                      setFormData({ ...formData, tipo: v as TipoSaida, motivo: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uso">Uso Clínico</SelectItem>
                      <SelectItem value="descarte">
                        <span className="flex items-center gap-2">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          Descarte (vencimento / avaria)
                        </span>
                      </SelectItem>
                      <SelectItem value="ajuste">
                        <span className="flex items-center gap-2">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-yellow-500" />
                          Ajuste de Estoque (desvio)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {/* Motivo (obrigatório para descarte/ajuste) */}
                {motivoObrigatorio && (
                  <Field>
                    <FieldLabel>
                      Motivo <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Select
                      value={formData.motivo}
                      onValueChange={(v) => setFormData({ ...formData, motivo: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {motivoOpcoes.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.tipo === 'descarte' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Registra que o responsável {user?.name ?? 'usuário atual'} descartou este produto.
                      </p>
                    )}
                    {formData.tipo === 'ajuste' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Use para corrigir consumo que ocorreu sem registro no sistema.
                      </p>
                    )}
                  </Field>
                )}

                {/* Insumo */}
                <Field>
                  <FieldLabel>Insumo</FieldLabel>
                  <Select
                    value={formData.insumoId}
                    onValueChange={(v) => setFormData({ ...formData, insumoId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um insumo" />
                    </SelectTrigger>
                    <SelectContent>
                      {insumos.map((insumo) => (
                        <SelectItem key={insumo.id} value={insumo.id}>
                          {insumo.nome} - Lote {insumo.lote} (Estoque: {insumo.quantidade})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {selectedInsumo && (
                  <div className="p-3 rounded-lg bg-secondary/50 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lote:</span>
                      <span className="font-medium">{selectedInsumo.lote}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estoque disponível:</span>
                      <span className="font-medium">{selectedInsumo.quantidade} un</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vencimento:</span>
                      <span className="font-medium">
                        {format(new Date(selectedInsumo.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quantidade */}
                <Field>
                  <FieldLabel>Quantidade</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    max={selectedInsumo?.quantidade || 1}
                    value={formData.quantidade}
                    onChange={(e) =>
                      setFormData({ ...formData, quantidade: parseInt(e.target.value) || 1 })
                    }
                    required
                  />
                </Field>

                {/* Observação (sempre opcional) */}
                <Field>
                  <FieldLabel>Observação (opcional)</FieldLabel>
                  <Textarea
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    placeholder={
                      formData.tipo === 'uso'
                        ? 'Ex: Procedimento facial paciente X'
                        : formData.tipo === 'descarte'
                        ? 'Ex: Frasco aberto há mais de 30 dias'
                        : 'Ex: Consumo estimado da semana passada'
                    }
                    rows={2}
                  />
                </Field>

                {error && <FieldError>{error}</FieldError>}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                    variant={
                      formData.tipo === 'descarte'
                        ? 'destructive'
                        : formData.tipo === 'ajuste'
                        ? 'outline'
                        : 'default'
                    }
                  >
                    {isSubmitting ? 'Salvando...' : SUBMIT_LABELS[formData.tipo]}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por insumo ou responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={tipoFiltro}
              onValueChange={(v) => setTipoFiltro(v as TipoSaida | 'todos')}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="uso">Uso Clínico</SelectItem>
                <SelectItem value="descarte">Descarte</SelectItem>
                <SelectItem value="ajuste">Ajuste de Estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageMinus className="w-5 h-5" />
            Histórico de Saídas
          </CardTitle>
          <CardDescription>{filteredSaidas.length} registro(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead>Responsável</TableHead>
                  {isGlobalView && <TableHead>Unidade</TableHead>}
                  <TableHead>Data</TableHead>
                  <TableHead>Motivo / Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSaidas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isGlobalView ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      Nenhuma saída registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSaidas.map((saida) => {
                    const tipo = (saida.tipo ?? 'uso') as TipoSaida
                    const badge = TIPO_BADGE[tipo]
                    return (
                      <TableRow key={saida.id}>
                        <TableCell className="font-medium">
                          <div>{saida.insumoNome}</div>
                          <div className="text-xs text-muted-foreground">Lote: {saida.insumoLote}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={badge.className}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold text-sm">
                            -{saida.quantidade}
                          </span>
                        </TableCell>
                        <TableCell>{saida.responsavel}</TableCell>
                        {isGlobalView && (
                          <TableCell className="text-muted-foreground text-sm">{saida.unidadeNome}</TableCell>
                        )}
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(saida.dataRetirada), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {saida.motivo && (
                            <span className="font-medium text-foreground">{saida.motivo}</span>
                          )}
                          {saida.motivo && saida.observacao && <span className="mx-1">·</span>}
                          {saida.observacao && <span>{saida.observacao}</span>}
                          {!saida.motivo && !saida.observacao && '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

