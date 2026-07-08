'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Combobox } from '@/components/ui/combobox'
import { Plus, Search, Pencil, Trash2, PackageCheck, Ban } from 'lucide-react'
import { InsumoFormDialog, InsumoFormData, emptyInsumoForm } from '@/components/insumo-form-dialog'
import {
  pedidosApi,
  PedidoApi,
  insumosApi,
  tiposInsumoApi,
  TipoInsumoApi,
  InsumoPayload,
  ApiError,
} from '@/lib/api'
import { STATUS_PEDIDO_LABELS, STATUS_PEDIDO_BADGE, StatusPedido } from '@/lib/types'
import { useUnidade } from '@/contexts/unidade-context'
import { toast } from 'sonner'
import { dateOnlyToInput, dateOnlyToDisplay, inputDateToISO, toSP } from '@/lib/utils'

function StatusBadge({ status }: { status: StatusPedido }) {
  return (
    <Badge variant="outline" className={STATUS_PEDIDO_BADGE[status]}>
      {STATUS_PEDIDO_LABELS[status]}
    </Badge>
  )
}

interface PedidoFormState {
  open: boolean
  editingId: string | null
  unidadeId: string
  fornecedor: string
  produto: string
  quantidade: string
  dataPrevista: string
  observacao: string
}

const emptyPedidoForm: PedidoFormState = {
  open: false,
  editingId: null,
  unidadeId: '',
  fornecedor: '',
  produto: '',
  quantidade: '1',
  dataPrevista: '',
  observacao: '',
}

export default function PedidosPage() {
  const { isGlobalView, unidades, unidadeAtiva } = useUnidade()
  const [pedidos, setPedidos] = useState<PedidoApi[]>([])
  const [tiposInsumo, setTiposInsumo] = useState<TipoInsumoApi[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusPedido | 'all'>('all')
  const [form, setForm] = useState<PedidoFormState>(emptyPedidoForm)
  const [receber, setReceber] = useState<PedidoApi | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const loadPedidos = async () => {
    try {
      const data = await pedidosApi.list()
      setPedidos(data)
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        toast.error('Erro ao carregar pedidos')
      }
    }
  }

  const loadTipos = async () => {
    try {
      const data = await tiposInsumoApi.list()
      setTiposInsumo(data.filter((t) => t.ativo))
    } catch {
      // silencioso
    }
  }

  useEffect(() => {
    loadPedidos()
    loadTipos()
  }, [])

  const filteredPedidos = pedidos.filter((p) => {
    const matchesSearch =
      p.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.produto.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const openNew = () => {
    setForm({
      ...emptyPedidoForm,
      open: true,
      unidadeId: unidadeAtiva?.id ?? unidades.filter((u) => u.ativa)[0]?.id ?? '',
    })
  }

  const openEdit = (p: PedidoApi) => {
    setForm({
      open: true,
      editingId: p.id,
      unidadeId: p.unidadeId,
      fornecedor: p.fornecedor,
      produto: p.produto,
      quantidade: String(p.quantidade),
      dataPrevista: p.dataPrevista ? dateOnlyToInput(p.dataPrevista) : '',
      observacao: p.observacao ?? '',
    })
  }

  const handlePedidoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.unidadeId) {
      toast.error('Selecione uma unidade')
      return
    }

    const payload = {
      fornecedor: form.fornecedor,
      produto: form.produto,
      quantidade: parseInt(form.quantidade, 10) || 0,
      observacao: form.observacao.trim() === '' ? undefined : form.observacao.trim(),
      dataPrevista: form.dataPrevista.trim() === '' ? null : inputDateToISO(form.dataPrevista),
    }

    try {
      if (form.editingId) {
        await pedidosApi.update(form.editingId, payload)
        toast.success('Pedido atualizado com sucesso!')
      } else {
        await pedidosApi.create(payload, form.unidadeId)
        toast.success('Pedido registrado com sucesso!')
      }
      setForm((f) => ({ ...f, open: false }))
      await loadPedidos()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erro ao salvar pedido')
    }
  }

  const receberInitial: InsumoFormData = receber
    ? {
        ...emptyInsumoForm,
        unidadeId: receber.unidadeId,
        nome: receber.produto,
        fornecedor: receber.fornecedor,
        quantidade: String(receber.quantidade),
        tipoId: tiposInsumo[0]?.id ?? '',
        dataEntrada: dateOnlyToInput(new Date()),
      }
    : emptyInsumoForm

  const handleReceber = async (payload: InsumoPayload) => {
    if (!receber) return
    try {
      await pedidosApi.receber(receber.id, payload)
      toast.success('Pedido recebido e entrada registrada no estoque!')
      await loadPedidos()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erro ao receber pedido')
      throw err // mantém o diálogo aberto
    }
  }

  const handleCancel = async () => {
    if (!cancelId) return
    try {
      await pedidosApi.update(cancelId, { status: 'cancelado' })
      toast.success('Pedido cancelado')
      setCancelId(null)
      await loadPedidos()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erro ao cancelar pedido')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await pedidosApi.delete(deleteId)
      toast.success('Pedido excluído')
      setDeleteId(null)
      await loadPedidos()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erro ao excluir pedido')
    }
  }

  const fetchNomeSuggestions = (q: string) => insumosApi.suggestions('nome', q)
  const fetchFornecedorSuggestions = (q: string) => insumosApi.suggestions('fornecedor', q)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pedidos a Fornecedores</h1>
          <p className="text-muted-foreground">Acompanhe os pedidos de compra e dê entrada ao recebê-los</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Pedido
        </Button>
      </div>

      {/* Diálogo de novo/editar pedido */}
      <Dialog open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{form.editingId ? 'Editar Pedido' : 'Novo Pedido'}</DialogTitle>
            <DialogDescription>
              {form.editingId ? 'Atualize as informações do pedido' : 'Registre um pedido de compra feito ao fornecedor'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePedidoSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel>Unidade <span className="text-destructive">*</span></FieldLabel>
                {form.editingId ? (
                  <p className="text-sm py-2 px-3 rounded-md bg-muted text-muted-foreground">
                    {unidades.find((u) => u.id === form.unidadeId)?.nome ?? form.unidadeId}
                  </p>
                ) : (
                  <Select value={form.unidadeId} onValueChange={(v) => setForm({ ...form, unidadeId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.filter((u) => u.ativa).map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field>
                <FieldLabel>Fornecedor</FieldLabel>
                <Combobox
                  value={form.fornecedor}
                  onChange={(v) => setForm({ ...form, fornecedor: v })}
                  fetchSuggestions={fetchFornecedorSuggestions}
                  placeholder="Ex: Allergan"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Produto</FieldLabel>
                <Combobox
                  value={form.produto}
                  onChange={(v) => setForm({ ...form, produto: v })}
                  fetchSuggestions={fetchNomeSuggestions}
                  placeholder="Ex: Botox 100U"
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Quantidade</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Previsão de Entrega</FieldLabel>
                  <Input
                    type="date"
                    value={form.dataPrevista}
                    onChange={(e) => setForm({ ...form, dataPrevista: e.target.value })}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Observação</FieldLabel>
                <Input
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  placeholder="Opcional"
                />
              </Field>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setForm((f) => ({ ...f, open: false }))}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {form.editingId ? 'Salvar' : 'Registrar'}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de recebimento: dá entrada no estoque */}
      <InsumoFormDialog
        open={!!receber}
        onOpenChange={(o) => { if (!o) setReceber(null) }}
        title="Receber Pedido (dar entrada no estoque)"
        description="Confira os dados e informe o lote, o tipo e a validade para dar entrada no estoque"
        submitLabel="Receber"
        initialValues={receberInitial}
        tiposInsumo={tiposInsumo}
        unidades={unidades}
        lockUnidade
        lockNomeFornecedor
        onSubmit={handleReceber}
      />

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por fornecedor ou produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as StatusPedido | 'all')}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="recebido">Recebido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
          <CardDescription>{filteredPedidos.length} pedido(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isGlobalView && <TableHead>Unidade</TableHead>}
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Qtd.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data do Pedido</TableHead>
                  <TableHead>Previsão</TableHead>
                  {!isGlobalView && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isGlobalView ? 7 : 7} className="text-center py-8 text-muted-foreground">
                      Nenhum pedido encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPedidos.map((p) => (
                    <TableRow key={p.id}>
                      {isGlobalView && (
                        <TableCell className="text-muted-foreground text-sm">{p.unidadeNome}</TableCell>
                      )}
                      <TableCell className="font-medium">{p.fornecedor}</TableCell>
                      <TableCell>{p.produto}</TableCell>
                      <TableCell className="text-center font-semibold">{p.quantidade}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell>{format(toSP(p.dataPedido), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>
                        {p.dataPrevista
                          ? dateOnlyToDisplay(p.dataPrevista)
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      {!isGlobalView && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {p.status === 'pendente' && (
                              <>
                                <Button variant="ghost" size="icon" title="Receber (dar entrada)" onClick={() => setReceber(p)}>
                                  <PackageCheck className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(p)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Cancelar pedido" onClick={() => setCancelId(p.id)}>
                                  <Ban className="w-4 h-4 text-amber-600" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" title="Excluir" onClick={() => setDeleteId(p.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmação de cancelamento */}
      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar pedido</AlertDialogTitle>
            <AlertDialogDescription>
              O pedido será marcado como cancelado. Você poderá excluí-lo depois, se desejar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-amber-600 text-white hover:bg-amber-700">
              Cancelar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
