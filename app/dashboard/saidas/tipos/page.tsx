'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Switch } from '@/components/ui/switch'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Plus, Pencil, Trash2, PackageMinus } from 'lucide-react'
import { tiposSaidaApi, TipoSaidaApi, ApiError } from '@/lib/api'
import { COR_BADGE_MAP, CATEGORIA_SAIDA_LABELS, CategoriaSaida } from '@/lib/types'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

const CORES_DISPONIVEIS = [
  { slug: 'blue',   label: 'Azul' },
  { slug: 'gray',   label: 'Cinza' },
  { slug: 'purple', label: 'Roxo' },
  { slug: 'green',  label: 'Verde' },
  { slug: 'red',    label: 'Vermelho' },
  { slug: 'yellow', label: 'Amarelo' },
  { slug: 'pink',   label: 'Rosa' },
  { slug: 'orange', label: 'Laranja' },
  { slug: 'indigo', label: 'Índigo' },
  { slug: 'teal',   label: 'Teal' },
]

const COR_DOT_MAP: Record<string, string> = {
  blue:   'bg-blue-500',
  gray:   'bg-gray-500',
  purple: 'bg-purple-500',
  green:  'bg-green-500',
  red:    'bg-red-500',
  yellow: 'bg-yellow-500',
  pink:   'bg-pink-500',
  orange: 'bg-orange-500',
  indigo: 'bg-indigo-500',
  teal:   'bg-teal-500',
}

interface FormData {
  nome: string
  slug: string
  categoria: CategoriaSaida
  cor: string
  ativo: boolean
}

const initialForm: FormData = {
  nome: '',
  slug: '',
  categoria: 'uso',
  cor: 'blue',
  ativo: true,
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export default function TiposSaidaPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [tipos, setTipos] = useState<TipoSaidaApi[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTipo, setEditingTipo] = useState<TipoSaidaApi | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [slugEdited, setSlugEdited] = useState(false)

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [user, router])

  const loadTipos = async () => {
    try {
      setLoading(true)
      const data = await tiposSaidaApi.list()
      setTipos(data)
    } catch {
      toast.error('Erro ao carregar tipos de saída')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTipos()
  }, [])

  const handleOpenDialog = (tipo?: TipoSaidaApi) => {
    if (tipo) {
      setEditingTipo(tipo)
      setFormData({ nome: tipo.nome, slug: tipo.slug, categoria: tipo.categoria, cor: tipo.cor, ativo: tipo.ativo })
      setSlugEdited(true)
    } else {
      setEditingTipo(null)
      setFormData(initialForm)
      setSlugEdited(false)
    }
    setIsDialogOpen(true)
  }

  const handleNomeChange = (nome: string) => {
    setFormData((prev) => ({
      ...prev,
      nome,
      ...(slugEdited ? {} : { slug: slugify(nome) }),
    }))
  }

  const handleSlugChange = (slug: string) => {
    setSlugEdited(true)
    setFormData((prev) => ({ ...prev, slug: slug.replace(/[^a-z0-9_]/g, '') }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.slug) {
      toast.error('Informe um identificador (slug) para o tipo')
      return
    }
    setSubmitting(true)
    try {
      if (editingTipo) {
        const { categoria: _omit, ...updateData } = formData
        await tiposSaidaApi.update(editingTipo.id, updateData)
        toast.success('Tipo atualizado com sucesso!')
      } else {
        await tiposSaidaApi.create(formData)
        toast.success('Tipo criado com sucesso!')
      }
      setIsDialogOpen(false)
      await loadTipos()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Erro inesperado ao salvar tipo')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await tiposSaidaApi.delete(deleteId)
      toast.success('Tipo removido com sucesso!')
      setDeleteId(null)
      await loadTipos()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Erro ao remover tipo')
      }
    }
  }

  if (user?.role !== 'admin') return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <PackageMinus className="w-6 h-6" />
            Tipos de Saída
          </h1>
          <p className="text-muted-foreground">Gerencie os tipos de saída de estoque da clínica</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tipos cadastrados</CardTitle>
          <CardDescription>{tipos.length} tipo(s) no total</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Identificador</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead className="text-center">Saídas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tipos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum tipo cadastrado ainda
                      </TableCell>
                    </TableRow>
                  ) : (
                    tipos.map((tipo) => (
                      <TableRow key={tipo.id}>
                        <TableCell className="font-medium">
                          <Badge
                            variant="outline"
                            className={COR_BADGE_MAP[tipo.cor] ?? 'bg-gray-100 text-gray-700 border-gray-200'}
                          >
                            {tipo.nome}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{tipo.slug}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{CATEGORIA_SAIDA_LABELS[tipo.categoria]}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-3 h-3 rounded-full ${COR_DOT_MAP[tipo.cor] ?? 'bg-gray-400'}`} />
                            <span className="text-sm text-muted-foreground">
                              {CORES_DISPONIVEIS.find((c) => c.slug === tipo.cor)?.label ?? tipo.cor}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {tipo._count?.saidas ?? 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tipo.ativo ? 'text-green-700 border-green-300 bg-green-50' : 'text-gray-500 border-gray-200 bg-gray-50'}>
                            {tipo.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(tipo)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(tipo.id)}
                              disabled={(tipo._count?.saidas ?? 0) > 0}
                              title={(tipo._count?.saidas ?? 0) > 0 ? 'Não é possível excluir um tipo com saídas vinculadas' : 'Excluir'}
                            >
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
          )}
        </CardContent>
      </Card>

      {/* Dialog criar/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingTipo ? 'Editar Tipo de Saída' : 'Novo Tipo de Saída'}</DialogTitle>
            <DialogDescription>
              {editingTipo ? 'Atualize as informações do tipo de saída' : 'Defina o nome, categoria e a cor do novo tipo'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel>Nome <span className="text-destructive">*</span></FieldLabel>
                <Input
                  value={formData.nome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  placeholder="Ex: Uso Clínico, Vencimento, Botox..."
                  required
                />
              </Field>

              <Field>
                <FieldLabel>
                  Identificador (slug)
                  <span className="text-xs text-muted-foreground ml-1">usado internamente</span>
                </FieldLabel>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="uso_clinico"
                  pattern="[a-z0-9_]+"
                  title="Somente letras minúsculas, números e underscores"
                  required
                />
              </Field>

              <Field>
                <FieldLabel>Categoria <span className="text-destructive">*</span></FieldLabel>
                <Select
                  value={formData.categoria}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, categoria: v as CategoriaSaida }))}
                  disabled={!!editingTipo}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uso">Uso Clínico</SelectItem>
                    <SelectItem value="descarte">Descarte</SelectItem>
                    <SelectItem value="ajuste">Ajuste de Estoque</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {editingTipo
                    ? 'A categoria não pode ser alterada após a criação.'
                    : 'Define se este tipo exige motivo (descarte/ajuste sim, uso não).'}
                </p>
              </Field>

              <Field>
                <FieldLabel>Cor</FieldLabel>
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {CORES_DISPONIVEIS.map((cor) => (
                    <button
                      key={cor.slug}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, cor: cor.slug }))}
                      title={cor.label}
                      className={`h-10 rounded-lg border-2 transition-all flex items-center justify-center ${COR_BADGE_MAP[cor.slug] ?? 'bg-gray-100'} ${
                        formData.cor === cor.slug
                          ? 'border-foreground scale-105 shadow-md'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className="text-xs font-medium truncate px-1">{cor.label}</span>
                    </button>
                  ))}
                </div>
              </Field>

              {editingTipo && (
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel className="mb-0">Ativo</FieldLabel>
                    <Switch
                      checked={formData.ativo}
                      onCheckedChange={(v) => setFormData((prev) => ({ ...prev, ativo: v }))}
                    />
                  </div>
                </Field>
              )}

              {/* Preview */}
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Pré-visualização:</p>
                <Badge
                  variant="outline"
                  className={COR_BADGE_MAP[formData.cor] ?? 'bg-gray-100 text-gray-700 border-gray-200'}
                >
                  {formData.nome || 'Nome do tipo'}
                </Badge>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? 'Salvando...' : editingTipo ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este tipo de saída? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
