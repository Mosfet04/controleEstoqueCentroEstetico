'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Combobox } from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
import { insumosApi, InsumoPayload, TipoInsumoApi, UnidadeApi } from '@/lib/api'
import { inputDateToISO } from '@/lib/utils'
import { toast } from 'sonner'

export interface InsumoFormData {
  unidadeId: string
  nome: string
  lote: string
  tipoId: string
  fornecedor: string
  quantidade: string
  quantidadeMinima: string
  precoUnitario: string
  dataEntrada: string
  dataVencimento: string
}

export const emptyInsumoForm: InsumoFormData = {
  unidadeId: '',
  nome: '',
  lote: '',
  tipoId: '',
  fornecedor: '',
  quantidade: '0',
  quantidadeMinima: '0',
  precoUnitario: '',
  dataEntrada: '',
  dataVencimento: '',
}

interface InsumoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  /** Valores iniciais aplicados sempre que o diálogo é aberto. */
  initialValues: InsumoFormData
  tiposInsumo: TipoInsumoApi[]
  unidades: UnidadeApi[]
  /** Exibe a unidade como texto (sem seletor) — usado em edição/recebimento. */
  lockUnidade?: boolean
  /** Bloqueia nome e fornecedor — usado no recebimento de pedido. */
  lockNomeFornecedor?: boolean
  /** Executa a persistência. Deve lançar em caso de erro para manter o diálogo aberto. */
  onSubmit: (payload: InsumoPayload, unidadeId: string) => Promise<void>
}

export function InsumoFormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  initialValues,
  tiposInsumo,
  unidades,
  lockUnidade = false,
  lockNomeFornecedor = false,
  onSubmit,
}: InsumoFormDialogProps) {
  const [formData, setFormData] = useState<InsumoFormData>(initialValues)
  const [submitting, setSubmitting] = useState(false)

  // Reaplica os valores iniciais toda vez que o diálogo abre.
  useEffect(() => {
    if (open) setFormData(initialValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const fetchNomeSuggestions = useCallback((q: string) => insumosApi.suggestions('nome', q), [])
  const fetchFornecedorSuggestions = useCallback((q: string) => insumosApi.suggestions('fornecedor', q), [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.unidadeId) {
      toast.error('Selecione uma unidade')
      return
    }

    const payload: InsumoPayload = {
      nome: formData.nome,
      lote: formData.lote,
      tipoId: formData.tipoId,
      fornecedor: formData.fornecedor,
      quantidade: parseInt(formData.quantidade, 10) || 0,
      quantidadeMinima: parseInt(formData.quantidadeMinima, 10) || 0,
      precoUnitario: formData.precoUnitario.trim() === '' ? null : parseFloat(formData.precoUnitario),
      dataEntrada: inputDateToISO(formData.dataEntrada),
      dataVencimento: inputDateToISO(formData.dataVencimento),
    }

    setSubmitting(true)
    try {
      await onSubmit(payload, formData.unidadeId)
      onOpenChange(false)
    } catch {
      // O chamador é responsável por exibir a mensagem de erro; mantemos o diálogo aberto.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Unidade <span className="text-destructive">*</span></FieldLabel>
              {lockUnidade ? (
                <p className="text-sm py-2 px-3 rounded-md bg-muted text-muted-foreground">
                  {unidades.find((u) => u.id === formData.unidadeId)?.nome ?? formData.unidadeId}
                </p>
              ) : (
                <Select
                  value={formData.unidadeId}
                  onValueChange={(v) => setFormData({ ...formData, unidadeId: v })}
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
              )}
            </Field>
            <Field>
              <FieldLabel>Nome</FieldLabel>
              {lockNomeFornecedor ? (
                <p className="text-sm py-2 px-3 rounded-md bg-muted text-muted-foreground">{formData.nome}</p>
              ) : (
                <Combobox
                  value={formData.nome}
                  onChange={(v) => setFormData({ ...formData, nome: v })}
                  fetchSuggestions={fetchNomeSuggestions}
                  placeholder="Ex: Botox 100U"
                  required
                />
              )}
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
              <Select value={formData.tipoId} onValueChange={(v) => setFormData({ ...formData, tipoId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposInsumo.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Fornecedor</FieldLabel>
              {lockNomeFornecedor ? (
                <p className="text-sm py-2 px-3 rounded-md bg-muted text-muted-foreground">{formData.fornecedor}</p>
              ) : (
                <Combobox
                  value={formData.fornecedor}
                  onChange={(v) => setFormData({ ...formData, fornecedor: v })}
                  fetchSuggestions={fetchFornecedorSuggestions}
                  placeholder="Ex: Allergan"
                  required
                />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Quantidade</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Qtd. Mínima</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantidadeMinima}
                  onChange={(e) => setFormData({ ...formData, quantidadeMinima: e.target.value })}
                  required
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Preço Unitário (R$)</FieldLabel>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.precoUnitario}
                onChange={(e) => setFormData({ ...formData, precoUnitario: e.target.value })}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">Informe o valor de cada unidade, não o total do lote</p>
            </Field>
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
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitLabel}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
