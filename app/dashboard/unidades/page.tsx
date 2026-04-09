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
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { unidadesApi, UnidadeApi, ApiError } from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { useUnidade } from '@/contexts/unidade-context'

export default function UnidadesPage() {
  const { user } = useAuth()
  const { reloadUnidades } = useUnidade()
  const [unidades, setUnidades] = useState<UnidadeApi[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUnidade, setEditingUnidade] = useState<UnidadeApi | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UnidadeApi | null>(null)
  const [formData, setFormData] = useState({ nome: '', endereco: '', telefone: '' })
  const [isSaving, setIsSaving] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadUnidades()
  }, [])

  async function loadUnidades() {
    try {
      setIsLoading(true)
      const data = await unidadesApi.list()
      setUnidades(data)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao carregar unidades')
    } finally {
      setIsLoading(false)
    }
  }

  function openCreate() {
    setEditingUnidade(null)
    setFormData({ nome: '', endereco: '', telefone: '' })
    setDialogOpen(true)
  }

  function openEdit(unidade: UnidadeApi) {
    setEditingUnidade(unidade)
    setFormData({
      nome: unidade.nome,
      endereco: unidade.endereco ?? '',
      telefone: unidade.telefone ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        nome: formData.nome.trim(),
        ...(formData.endereco.trim() ? { endereco: formData.endereco.trim() } : {}),
        ...(formData.telefone.trim() ? { telefone: formData.telefone.trim() } : {}),
      }

      if (editingUnidade) {
        await unidadesApi.update(editingUnidade.id, payload)
        toast.success('Unidade atualizada')
      } else {
        await unidadesApi.create(payload)
        toast.success('Unidade criada')
      }

      setDialogOpen(false)
      loadUnidades()
      reloadUnidades()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar unidade')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await unidadesApi.delete(deleteTarget.id)
      toast.success('Unidade desativada')
      setDeleteTarget(null)
      loadUnidades()
      reloadUnidades()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao desativar unidade')
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Acesso restrito a administradores</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidades</h1>
          <p className="text-muted-foreground">Gerencie as unidades da clínica</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Unidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
              <DialogDescription>
                {editingUnidade ? 'Atualize os dados da unidade.' : 'Preencha os dados da nova unidade.'}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel>Nome *</FieldLabel>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Unidade Centro"
                />
              </Field>
              <Field>
                <FieldLabel>Endereço</FieldLabel>
                <Input
                  value={formData.endereco}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endereco: e.target.value }))}
                  placeholder="Ex: Rua das Flores, 123"
                />
              </Field>
              <Field>
                <FieldLabel>Telefone</FieldLabel>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, telefone: e.target.value }))}
                  placeholder="Ex: (11) 99999-9999"
                />
              </Field>
            </FieldGroup>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Salvando...' : editingUnidade ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Unidades Cadastradas
          </CardTitle>
          <CardDescription>{unidades.length} unidade(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : unidades.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma unidade cadastrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unidades.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell>{u.endereco || '—'}</TableCell>
                    <TableCell>{u.telefone || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={u.ativa ? 'default' : 'secondary'}>
                        {u.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {u.ativa && (
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(u)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar unidade?</AlertDialogTitle>
            <AlertDialogDescription>
              A unidade &quot;{deleteTarget?.nome}&quot; será desativada. Dados existentes serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
