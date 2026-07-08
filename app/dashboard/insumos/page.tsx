'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Plus, Search, Pencil, Trash2, Copy } from 'lucide-react'
import { InsumoFormDialog, InsumoFormData, emptyInsumoForm } from '@/components/insumo-form-dialog'
import { insumosApi, tiposInsumoApi, TipoInsumoApi, InsumoApi, InsumoPayload, ApiError } from '@/lib/api'
import { COR_BADGE_MAP } from '@/lib/types'
import { useUnidade } from '@/contexts/unidade-context'
import { toast } from 'sonner'
import { dateOnlyToInput, dateOnlyToDisplay } from '@/lib/utils'

type StatusEstoque = 'bom' | 'atencao' | 'critico'

const PAGE_SIZE = 20

const STATUS_LABELS: Record<StatusEstoque, string> = {
  bom: 'Bom',
  atencao: 'Atenção',
  critico: 'Crítico',
}

function StatusBadge({ status }: { status: StatusEstoque }) {
  const variants: Record<StatusEstoque, { className: string }> = {
    bom: { className: 'bg-green-100 text-green-700 border-green-200' },
    atencao: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    critico: { className: 'bg-red-100 text-red-700 border-red-200' },
  }
  return <Badge variant="outline" className={variants[status].className}>{STATUS_LABELS[status]}</Badge>
}

function TipoBadge({ nome, cor }: { nome: string; cor: string }) {
  const className = COR_BADGE_MAP[cor] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return <Badge variant="outline" className={className}>{nome}</Badge>
}

type DialogMode = 'create' | 'edit' | 'entrada'

interface DialogState {
  open: boolean
  mode: DialogMode
  editingId: string | null
  initial: InsumoFormData
}

const DIALOG_TEXTS: Record<DialogMode, { title: string; description: string; submitLabel: string }> = {
  create: {
    title: 'Novo Insumo',
    description: 'Preencha os dados para cadastrar um novo insumo',
    submitLabel: 'Cadastrar',
  },
  edit: {
    title: 'Editar Insumo',
    description: 'Atualize as informações do insumo',
    submitLabel: 'Salvar',
  },
  entrada: {
    title: 'Nova Entrada (novo lote)',
    description: 'Os dados do produto já vêm preenchidos — informe apenas o novo lote, quantidade e validade',
    submitLabel: 'Cadastrar',
  },
}

export default function InsumosPage() {
  const { isGlobalView, unidades, unidadeAtiva } = useUnidade()
  const [insumos, setInsumos] = useState<InsumoApi[]>([])
  const [tiposInsumo, setTiposInsumo] = useState<TipoInsumoApi[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<StatusEstoque | 'all'>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    mode: 'create',
    editingId: null,
    initial: emptyInsumoForm,
  })

  const loadInsumos = useCallback(async () => {
    try {
      const res = await insumosApi.listPaged({
        page,
        limit: PAGE_SIZE,
        q: debouncedSearch || undefined,
        tipoId: filterTipo !== 'all' ? filterTipo : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      })
      setInsumos(res.data)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        toast.error('Erro ao carregar insumos')
      }
    }
  }, [page, debouncedSearch, filterTipo, filterStatus])

  const loadTipos = async () => {
    try {
      const data = await tiposInsumoApi.list()
      setTiposInsumo(data.filter((t) => t.ativo))
    } catch {
      // silencioso — não bloqueia o uso
    }
  }

  useEffect(() => {
    loadTipos()
  }, [])

  useEffect(() => {
    loadInsumos()
  }, [loadInsumos])

  // Debounce da busca: volta para a página 1 e aplica o termo após a digitação parar.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(handle)
  }, [searchTerm])

  // Garante que a página atual nunca ultrapasse o total (ex.: após excluir o último item).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const openCreate = () => {
    setDialog({
      open: true,
      mode: 'create',
      editingId: null,
      initial: {
        ...emptyInsumoForm,
        dataEntrada: dateOnlyToInput(new Date()),
        tipoId: tiposInsumo[0]?.id ?? '',
        unidadeId: unidadeAtiva?.id ?? unidades.filter((u) => u.ativa)[0]?.id ?? '',
      },
    })
  }

  const openEdit = (insumo: InsumoApi) => {
    setDialog({
      open: true,
      mode: 'edit',
      editingId: insumo.id,
      initial: {
        unidadeId: insumo.unidadeId,
        nome: insumo.nome,
        lote: insumo.lote,
        tipoId: insumo.tipoId,
        fornecedor: insumo.fornecedor,
        quantidade: String(insumo.quantidade),
        quantidadeMinima: String(insumo.quantidadeMinima),
        precoUnitario: insumo.precoUnitario != null ? String(insumo.precoUnitario) : '',
        dataEntrada: dateOnlyToInput(insumo.dataEntrada),
        dataVencimento: dateOnlyToInput(insumo.dataVencimento),
      },
    })
  }

  // "Nova entrada": clona o produto (nome, tipo, fornecedor, qtd. mínima, preço) e
  // deixa lote/quantidade/validade em branco para o usuário só trocar o lote.
  const openDuplicate = (insumo: InsumoApi) => {
    setDialog({
      open: true,
      mode: 'entrada',
      editingId: null,
      initial: {
        unidadeId: insumo.unidadeId,
        nome: insumo.nome,
        lote: '',
        tipoId: insumo.tipoId,
        fornecedor: insumo.fornecedor,
        quantidade: '0',
        quantidadeMinima: String(insumo.quantidadeMinima),
        precoUnitario: insumo.precoUnitario != null ? String(insumo.precoUnitario) : '',
        dataEntrada: dateOnlyToInput(new Date()),
        dataVencimento: '',
      },
    })
  }

  const handleSubmit = async (payload: InsumoPayload, unidadeId: string) => {
    try {
      if (dialog.mode === 'edit' && dialog.editingId) {
        // Envia a unidade do próprio insumo para funcionar mesmo na visão "todas as unidades".
        await insumosApi.update(dialog.editingId, payload, unidadeId)
        toast.success('Insumo atualizado com sucesso!')
      } else {
        await insumosApi.create(payload, unidadeId)
        toast.success(dialog.mode === 'entrada' ? 'Nova entrada registrada com sucesso!' : 'Insumo cadastrado com sucesso!')
      }
      await loadInsumos()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erro inesperado ao salvar insumo')
      throw err // mantém o diálogo aberto
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      // Unidade do próprio insumo, para funcionar também na visão "todas as unidades".
      const alvo = insumos.find((i) => i.id === deleteId)
      await insumosApi.delete(deleteId, alvo?.unidadeId)
      toast.success('Insumo removido com sucesso!')
      setDeleteId(null)
      await loadInsumos()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Erro ao remover insumo')
      }
    }
  }

  const dialogText = DIALOG_TEXTS[dialog.mode]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insumos</h1>
          <p className="text-muted-foreground">Gerencie o estoque de insumos da clínica</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Insumo
        </Button>
      </div>

      <InsumoFormDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        title={dialogText.title}
        description={dialogText.description}
        submitLabel={dialogText.submitLabel}
        initialValues={dialog.initial}
        tiposInsumo={tiposInsumo}
        unidades={unidades}
        lockUnidade={dialog.mode === 'edit'}
        onSubmit={handleSubmit}
      />

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, lote ou fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTipo} onValueChange={(v) => { setFilterTipo(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {tiposInsumo.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v as StatusEstoque | 'all'); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="bom">Bom</SelectItem>
                <SelectItem value="atencao">Atenção</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Insumos</CardTitle>
          <CardDescription>{total} insumo(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isGlobalView && <TableHead>Unidade</TableHead>}
                  <TableHead>Nome</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-center">Qtd.</TableHead>
                  <TableHead className="text-right">Preço Unit.</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insumos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isGlobalView ? 10 : 9} className="text-center py-8 text-muted-foreground">
                      Nenhum insumo encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  insumos.map((insumo) => (
                    <TableRow key={insumo.id}>
                      {isGlobalView && (
                        <TableCell className="text-muted-foreground text-sm">{insumo.unidadeNome}</TableCell>
                      )}
                      <TableCell className="font-medium">{insumo.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{insumo.lote}</TableCell>
                      <TableCell><TipoBadge nome={insumo.tipoNome} cor={insumo.tipoCor} /></TableCell>
                      <TableCell>{insumo.fornecedor}</TableCell>
                      <TableCell className="text-center font-semibold">{insumo.quantidade}</TableCell>
                      <TableCell className="text-right">
                        {insumo.precoUnitario != null
                          ? `R$ ${Number(insumo.precoUnitario).toFixed(2)}`
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{dateOnlyToDisplay(insumo.dataVencimento)}</TableCell>
                      <TableCell><StatusBadge status={insumo.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" title="Nova entrada (novo lote)" onClick={() => openDuplicate(insumo)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(insumo)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Excluir" onClick={() => setDeleteId(insumo.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este insumo? Esta ação não pode ser desfeita.
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
