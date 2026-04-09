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
import { Plus, Users, Pencil, Trash2, Shield, User as UserIcon, UserX, RotateCcw } from 'lucide-react'
import { usuariosApi, unidadesApi, UserApi, UnidadeApi, ApiError } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

type UserRole = 'admin' | 'clinico'

interface UserFormData {
  name: string
  email: string
  role: UserRole
  password: string
  unidadeIds: string[]
}

const initialFormData: UserFormData = {
  name: '',
  email: '',
  role: 'clinico',
  password: '',
  unidadeIds: [],
}

export default function UsuariosPage() {
  const router = useRouter()
  const { user: currentUser, isLoading } = useAuth()
  const [users, setUsers] = useState<UserApi[]>([])
  const [allUnidades, setAllUnidades] = useState<UnidadeApi[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserApi | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [reactivateId, setReactivateId] = useState<string | null>(null)
  const [formData, setFormData] = useState<UserFormData>(initialFormData)

  const loadUsers = async () => {
    try {
      const [data, unidades] = await Promise.all([usuariosApi.list(), unidadesApi.list()])
      setUsers(data)
      setAllUnidades(unidades)
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        toast.error('Erro ao carregar usuários')
      }
    }
  }

  useEffect(() => {
    if (!isLoading && currentUser) {
      if (currentUser.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      loadUsers()
    }
  }, [isLoading, currentUser, router])

  const handleOpenDialog = (user?: UserApi) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        password: '',
        unidadeIds: user.unidades?.map((u) => u.id) ?? [],
      })
    } else {
      setEditingUser(null)
      setFormData(initialFormData)
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingUser) {
        await usuariosApi.update(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          unidadeIds: formData.unidadeIds,
        } as Parameters<typeof usuariosApi.update>[1])
        toast.success('Usuário atualizado com sucesso!')
      } else {
        await usuariosApi.create({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.password,
          unidadeIds: formData.unidadeIds,
        } as Parameters<typeof usuariosApi.create>[0])
        toast.success('Usuário criado com sucesso!')
      }
      setIsDialogOpen(false)
      await loadUsers()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Erro inesperado ao salvar usuário')
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    if (deleteId === currentUser?.id) {
      toast.error('Você não pode excluir seu próprio usuário!')
      setDeleteId(null)
      return
    }
    try {
      const result = await usuariosApi.delete(deleteId)
      if (result.deactivated) {
        toast.success('Acesso do usuário revogado. O histórico de saídas foi preservado.')
      } else {
        toast.success('Usuário removido com sucesso!')
      }
      setDeleteId(null)
      await loadUsers()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Erro ao remover usuário')
      }
    }
  }

  const handleReactivate = async () => {
    if (!reactivateId) return
    try {
      await usuariosApi.reactivate(reactivateId)
      toast.success('Acesso do usuário reativado com sucesso!')
      setReactivateId(null)
      await loadUsers()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Erro ao reativar usuário')
      }
    }
  }

  if (isLoading || !currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Atualize as informações do usuário' : 'Preencha os dados para criar um novo usuário'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel>Nome</FieldLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Dr. João Silva"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>E-mail</FieldLabel>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ex: joao@clinica.com"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Função</FieldLabel>
                  <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="clinico">Clínico</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>Unidades</FieldLabel>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                    {allUnidades.filter((u) => u.ativa).map((u) => {
                      const checked = formData.unidadeIds.includes(u.id)
                      return (
                        <label key={u.id} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setFormData((prev) => ({
                                ...prev,
                                unidadeIds: checked
                                  ? prev.unidadeIds.filter((id) => id !== u.id)
                                  : [...prev.unidadeIds, u.id],
                              }))
                            }}
                            className="rounded border-input"
                          />
                          <span className="text-sm">{u.nome}</span>
                        </label>
                      )
                    })}
                  </div>
                </Field>

                {!editingUser && (
                  <Field>
                    <FieldLabel>Senha temporária</FieldLabel>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                    />
                  </Field>
                )}

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingUser ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Lista de Usuários
          </CardTitle>
          <CardDescription>{users.length} usuário(s) cadastrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Unidades</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                          user.ativo === false
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={`font-medium ${user.ativo === false ? 'text-muted-foreground line-through' : ''}`}>{user.name}</span>
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">Você</Badge>
                        )}
                        {user.ativo === false && (
                          <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500 border-gray-300">
                            <UserX className="w-3 h-3 mr-1" />
                            Desativado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                            : 'bg-blue-100 text-blue-700 border-blue-200'
                        }
                      >
                        {user.role === 'admin' ? (
                          <><Shield className="w-3 h-3 mr-1" /> Administrador</>
                        ) : (
                          <><UserIcon className="w-3 h-3 mr-1" /> Clínico</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.unidades?.map((u) => (
                          <Badge key={u.id} variant="outline" className="text-xs">{u.nome}</Badge>
                        ))}
                        {(!user.unidades || user.unidades.length === 0) && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {user.ativo === false ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setReactivateId(user.id)}
                            title="Reativar acesso"
                          >
                            <RotateCcw className="w-4 h-4 text-green-600" />
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(user.id)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão/desativação */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar acesso do usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Se o usuário possui registros de saídas, o acesso será <strong>desativado</strong> (histórico preservado).
              Caso contrário, o usuário será <strong>excluído permanentemente</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de reativação */}
      <AlertDialog open={!!reactivateId} onOpenChange={() => setReactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reativar acesso do usuário</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário voltará a ter acesso ao sistema normalmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate}>
              Reativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
