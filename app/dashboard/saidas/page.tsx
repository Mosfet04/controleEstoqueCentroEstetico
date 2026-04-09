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
import { FieldGroup, Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Plus, PackageMinus, Search } from 'lucide-react'
import { getInsumos, getSaidas, createSaida } from '@/lib/store'
import { Insumo, SaidaInsumo, User } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface SaidaFormData {
  insumoId: string
  quantidade: number
  observacao: string
}

const initialFormData: SaidaFormData = {
  insumoId: '',
  quantidade: 1,
  observacao: '',
}

export default function SaidasPage() {
  const [saidas, setSaidas] = useState<SaidaInsumo[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<SaidaFormData>(initialFormData)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = () => {
    setSaidas(getSaidas())
    setInsumos(getInsumos().filter((i) => i.quantidade > 0))
  }

  useEffect(() => {
    loadData()
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const filteredSaidas = saidas.filter(
    (saida) =>
      saida.insumoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      saida.responsavel.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedInsumo = insumos.find((i) => i.id === formData.insumoId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.insumoId) {
      setError('Selecione um insumo')
      return
    }

    if (!selectedInsumo) {
      setError('Insumo não encontrado')
      return
    }

    if (formData.quantidade > selectedInsumo.quantidade) {
      setError(`Quantidade indisponível. Estoque atual: ${selectedInsumo.quantidade}`)
      return
    }

    const result = createSaida({
      insumoId: formData.insumoId,
      insumoNome: selectedInsumo.nome,
      quantidade: formData.quantidade,
      responsavel: user?.name || 'Usuário',
      observacao: formData.observacao || undefined,
      dataRetirada: new Date(),
    })

    if (result) {
      toast.success('Saída registrada com sucesso!')
      setIsDialogOpen(false)
      setFormData(initialFormData)
      loadData()
    } else {
      setError('Erro ao registrar saída')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saídas</h1>
          <p className="text-muted-foreground">Registre e acompanhe as retiradas de insumos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setFormData(initialFormData); setError(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Saída
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Saída</DialogTitle>
              <DialogDescription>
                Selecione o insumo e a quantidade a ser retirada
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
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
                          {insumo.nome} (Estoque: {insumo.quantidade})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {selectedInsumo && (
                  <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lote:</span>
                      <span className="font-medium">{selectedInsumo.lote}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">Estoque disponível:</span>
                      <span className="font-medium">{selectedInsumo.quantidade} un</span>
                    </div>
                  </div>
                )}

                <Field>
                  <FieldLabel>Quantidade</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    max={selectedInsumo?.quantidade || 1}
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 1 })}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel>Observação (opcional)</FieldLabel>
                  <Textarea
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    placeholder="Ex: Procedimento facial"
                    rows={3}
                  />
                </Field>

                {error && <FieldError>{error}</FieldError>}

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    Registrar Saída
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por insumo ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSaidas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma saída registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSaidas.map((saida) => (
                    <TableRow key={saida.id}>
                      <TableCell className="font-medium">{saida.insumoNome}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold text-sm">
                          -{saida.quantidade}
                        </span>
                      </TableCell>
                      <TableCell>{saida.responsavel}</TableCell>
                      <TableCell>{format(saida.dataRetirada, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell className="text-muted-foreground">{saida.observacao || '-'}</TableCell>
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
