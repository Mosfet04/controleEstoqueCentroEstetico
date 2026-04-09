'use client'

import { useState, useEffect } from 'react'
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
  DialogTrigger,
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
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { insumosApi, InsumoApi, ApiError } from '@/lib/api'

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
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

function StatusBadge({ status }: { status: StatusEstoque }) {
  const variants: Record<StatusEstoque, { className: string }> = {
    bom: { className: 'bg-green-100 text-green-700 border-green-200' },
    atencao: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    critico: { className: 'bg-red-100 text-red-700 border-red-200' },
  }
  return <Badge variant="outline" className={variants[status].className}>{STATUS_LABELS[status]}</Badge>
}

function TipoBadge({ tipo }: { tipo: TipoInsumo }) {
  const variants: Record<TipoInsumo, { className: string }> = {
    injetavel: { className: 'bg-blue-100 text-blue-700 border-blue-200' },
    descartavel: { className: 'bg-gray-100 text-gray-700 border-gray-200' },
    peeling: { className: 'bg-purple-100 text-purple-700 border-purple-200' },
  }
  return <Badge variant="outline" className={variants[tipo].className}>{TIPO_LABELS[tipo]}</Badge>
}

interface InsumoFormData {
  nome: string
  lote: string
  tipo: TipoInsumo
  fornecedor: string
  quantidade: number
  quantidadeMinima: number
  dataEntrada: string
  dataVencimento: string
}

const initialFormData: InsumoFormData = {
  nome: '',
  lote: '',
  tipo: 'injetavel',
  fornecedor: '',
  quantidade: 0,
  quantidadeMinima: 0,
  dataEntrada: new Date().toISOString().split('T')[0],
  dataVencimento: '',
}

export default function InsumosPage() {
  const [insumos, setInsumos] = useState<InsumoApi[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState<TipoInsumo | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<StatusEstoque | 'all'>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInsumo, setEditingInsumo] = useState<InsumoApi | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState<InsumoFormData>(initialFormData)

  const loadInsumos = async () => {
    try {
      const data = await insumosApi.list()
      setInsumos(data)
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        toast.error('Erro ao carregar insumos')
      }
    }
  }

  useEffect(() => {
    loadInsumos()
  }, [])

  const filteredInsumos = insumos.filter((insumo) => {
    const matchesSearch =
      insumo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insumo.lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insumo.fornecedor.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === 'all' || insumo.tipo === filterTipo
    const matchesStatus = filterStatus === 'all' || insumo.status === filterStatus
    return matchesSearch && matchesTipo && matchesStatus
  })

  const handleOpenDialog = (insumo?: InsumoApi) => {
    if (insumo) {
      setEditingInsumo(insumo)
      setFormData({
        nome: insumo.nome,
        lote: insumo.lote,
        tipo: insumo.tipo,
        fornecedor: insumo.fornecedor,
        quantidade: insumo.quantidade,
        quantidadeMinima: insumo.quantidadeMinima,
        dataEntrada: format(new Date(insumo.dataEntrada), 'yyyy-MM-dd'),
        dataVencimento: format(new Date(insumo.dataVencimento), 'yyyy-MM-dd'),
      })
    } else {
      setEditingInsumo(null)
      setFormData(initialFormData)
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      nome: formData.nome,
      lote: formData.lote,
      tipo: formData.tipo,
      fornecedor: formData.fornecedor,
      quantidade: formData.quantidade,
      quantidadeMinima: formData.quantidadeMinima,
      dataEntrada: new Date(formData.dataEntrada).toISOString(),
      dataVencimento: new Date(formData.dataVencimento).toISOString(),
    }

    try {
      if (editingInsumo) {
        await insumosApi.update(editingInsumo.id, payload)
        toast.success('Insumo atualizado com sucesso!')
      } else {
        await insumosApi.create(payload)
        toast.success('Insumo cadastrado com sucesso!')
      }
      setIsDialogOpen(false)
      await loadInsumos()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Erro inesperado ao salvar insumo')
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await insumosApi.delete(deleteId)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insumos</h1>
          <p className="text-muted-foreground">Gerencie o estoque de insumos da clínica</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Insumo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInsumo ? 'Editar Insumo' : 'Novo Insumo'}</DialogTitle>
              <DialogDescription>
                {editingInsumo ? 'Atualize as informações do insumo' : 'Preencha os dados para cadastrar um novo insumo'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel>Nome</FieldLabel>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Botox 100U"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Lote</FieldLabel>
                  <Input
                    value={formData.lote}
                    onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                    placeholder="Ex: BTX-2024-001"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Tipo</FieldLabel>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v as TipoInsumo })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="injetavel">Injetável</SelectItem>
                      <SelectItem value="descartavel">Descartável</SelectItem>
                      <SelectItem value="peeling">Peeling</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Fornecedor</FieldLabel>
                  <Input
                    value={formData.fornecedor}
                    onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                    placeholder="Ex: Allergan"
                    required
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Quantidade</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      value={formData.quantidade}
                      onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Qtd. Mínima</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      value={formData.quantidadeMinima}
                      onChange={(e) => setFormData({ ...formData, quantidadeMinima: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Data de Entrada</FieldLabel>
                    <Input
                      type="date"
                      value={formData.dataEntrada}
                      onChange={(e) => setFormData({ ...formData, dataEntrada: e.target.value })}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Data de Vencimento</FieldLabel>
                    <Input
                      type="date"
                      value={formData.dataVencimento}
                      onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                      required
                    />
                  </Field>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingInsumo ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
            <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v as TipoInsumo | 'all')}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="injetavel">Injetável</SelectItem>
                <SelectItem value="descartavel">Descartável</SelectItem>
                <SelectItem value="peeling">Peeling</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as StatusEstoque | 'all')}>
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
          <CardDescription>{filteredInsumos.length} insumo(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-center">Qtd.</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInsumos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum insumo encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInsumos.map((insumo) => (
                    <TableRow key={insumo.id}>
                      <TableCell className="font-medium">{insumo.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{insumo.lote}</TableCell>
                      <TableCell><TipoBadge tipo={insumo.tipo} /></TableCell>
                      <TableCell>{insumo.fornecedor}</TableCell>
                      <TableCell className="text-center font-semibold">{insumo.quantidade}</TableCell>
                      <TableCell>{format(new Date(insumo.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell><StatusBadge status={insumo.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(insumo)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(insumo.id)}>
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
