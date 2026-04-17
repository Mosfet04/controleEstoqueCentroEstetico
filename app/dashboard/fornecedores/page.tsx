'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { TrendingDown, TrendingUp, DollarSign, Store, ChevronsUpDown, Check } from 'lucide-react'
import { fornecedoresApi, FornecedorComparativo, ApiError } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { toSP } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'

const TIPO_LABELS: Record<string, string> = {
  injetavel: 'Injetável',
  descartavel: 'Descartável',
  peeling: 'Peeling',
}

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  disabled,
}: {
  options: string[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((s) => s !== value)
        : [...selected, value]
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder
              : selected.length === 1
                ? selected[0]
                : `${selected.length} selecionado(s)`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>Nenhum resultado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => toggle(option)}
                >
                  <Checkbox
                    checked={selected.includes(option)}
                    className="mr-2"
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function FornecedoresPage() {
  const [data, setData] = useState<FornecedorComparativo[]>([])
  const [allData, setAllData] = useState<FornecedorComparativo[]>([])
  const [loading, setLoading] = useState(false)
  const [filterProdutos, setFilterProdutos] = useState<string[]>([])
  const [filterFornecedores, setFilterFornecedores] = useState<string[]>([])
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const datesReady = filterFrom !== '' && filterTo !== ''

  // Fetch all data for the date range (no product/supplier filter)
  const loadAllData = useCallback(async () => {
    if (!datesReady) {
      setAllData([])
      setData([])
      setFilterProdutos([])
      setFilterFornecedores([])
      return
    }

    setLoading(true)
    try {
      const result = await fornecedoresApi.compare({
        from: new Date(filterFrom).toISOString(),
        to: new Date(filterTo).toISOString(),
      })
      setAllData(result)
      setData(result)
      setFilterProdutos([])
      setFilterFornecedores([])
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        toast.error('Erro ao carregar dados de fornecedores')
      }
    } finally {
      setLoading(false)
    }
  }, [filterFrom, filterTo, datesReady])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Apply client-side filters for product/supplier selections
  useEffect(() => {
    if (!datesReady) return

    let filtered = allData
    if (filterProdutos.length > 0) {
      filtered = filtered.filter((d) => filterProdutos.includes(d.produto))
    }
    if (filterFornecedores.length > 0) {
      filtered = filtered.filter((d) => filterFornecedores.includes(d.fornecedor))
    }
    setData(filtered)
  }, [filterProdutos, filterFornecedores, allData, datesReady])

  // Available options from allData (unfiltered for the date range)
  const availableProdutos = useMemo(
    () => [...new Set(allData.map((d) => d.produto))].sort(),
    [allData]
  )

  const availableFornecedores = useMemo(
    () => [...new Set(allData.map((d) => d.fornecedor))].sort(),
    [allData]
  )

  // Unique products for chart grouping from filtered data
  const produtos = useMemo(
    () => [...new Set(data.map((d) => d.produto))].sort(),
    [data]
  )

  const fornecedores = useMemo(
    () => [...new Set(data.map((d) => d.fornecedor))].sort(),
    [data]
  )

  // Find best price per product
  const bestPriceByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of data) {
      if (item.precoMedio != null) {
        const current = map.get(item.produto)
        if (current === undefined || item.precoMedio < current) {
          map.set(item.produto, item.precoMedio)
        }
      }
    }
    return map
  }, [data])

  // Chart data: group by product, each fornecedor as a bar
  const chartData = useMemo(() => {
    return produtos.map((produto) => {
      const row: Record<string, string | number> = { produto }
      for (const item of data) {
        if (item.produto === produto && item.precoMedio != null) {
          row[item.fornecedor] = item.precoMedio
        }
      }
      return row
    })
  }, [data, produtos])

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ]

  // Summary metrics
  const totalFornecedores = fornecedores.length
  const totalProdutos = produtos.length
  const totalEntradas = data.reduce((s, d) => s + d.entradas, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comparativo de Fornecedores</h1>
        <p className="text-muted-foreground">Compare preços unitários entre fornecedores por produto</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
              <Store className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalFornecedores}</p>
              <p className="text-sm text-muted-foreground">Fornecedores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
              <DollarSign className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalProdutos}</p>
              <p className="text-sm text-muted-foreground">Produtos com preço</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
              <TrendingUp className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalEntradas}</p>
              <p className="text-sm text-muted-foreground">Entradas analisadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione o período para habilitar os filtros de produto e fornecedor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field>
              <FieldLabel>Data Início <span className="text-destructive">*</span></FieldLabel>
              <Input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Data Fim <span className="text-destructive">*</span></FieldLabel>
              <Input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Produtos</FieldLabel>
              <MultiSelect
                options={availableProdutos}
                selected={filterProdutos}
                onChange={setFilterProdutos}
                placeholder="Todos os produtos"
                disabled={!datesReady}
              />
            </Field>
            <Field>
              <FieldLabel>Fornecedores</FieldLabel>
              <MultiSelect
                options={availableFornecedores}
                selected={filterFornecedores}
                onChange={setFilterFornecedores}
                placeholder="Todos os fornecedores"
                disabled={!datesReady}
              />
            </Field>
          </div>
          {!datesReady && (
            <p className="text-sm text-muted-foreground mt-3">
              Preencha as datas de início e fim para visualizar os dados e habilitar os filtros.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && fornecedores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preço Médio por Produto</CardTitle>
            <CardDescription>Comparação de preço médio unitário (R$) entre fornecedores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="produto" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend />
                  {fornecedores.map((f, i) => (
                    <Bar key={f} dataKey={f} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento</CardTitle>
          <CardDescription>
            {loading ? 'Carregando...' : `${data.length} combinação(ões) fornecedor/produto encontrada(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Entradas</TableHead>
                  <TableHead className="text-right">Preço Médio</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Máximo</TableHead>
                  <TableHead>Última Entrada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {loading ? 'Carregando...' : !datesReady ? 'Selecione o período para visualizar os dados.' : 'Nenhum dado encontrado. Cadastre insumos com preço unitário.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => {
                    const isBest = bestPriceByProduct.get(item.produto) === item.precoMedio
                    const isWorst =
                      item.precoMedio != null &&
                      data
                        .filter((d) => d.produto === item.produto && d.precoMedio != null)
                        .every((d) => (d.precoMedio ?? 0) <= (item.precoMedio ?? 0)) &&
                      data.filter((d) => d.produto === item.produto).length > 1

                    return (
                      <TableRow key={`${item.fornecedor}-${item.produto}`}>
                        <TableCell className="font-medium">{item.fornecedor}</TableCell>
                        <TableCell>{item.produto}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{TIPO_LABELS[item.tipo] ?? item.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{item.entradas}</TableCell>
                        <TableCell className="text-right">
                          <span className={isBest ? 'text-green-600 font-semibold' : isWorst ? 'text-red-600 font-semibold' : ''}>
                            {item.precoMedio != null ? `R$ ${item.precoMedio.toFixed(2)}` : '—'}
                            {isBest && data.filter((d) => d.produto === item.produto).length > 1 && (
                              <TrendingDown className="inline w-4 h-4 ml-1" />
                            )}
                            {isWorst && (
                              <TrendingUp className="inline w-4 h-4 ml-1" />
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.precoMinimo != null ? `R$ ${item.precoMinimo.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.precoMaximo != null ? `R$ ${item.precoMaximo.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell>
                          {item.ultimaEntrada
                            ? format(toSP(item.ultimaEntrada), 'dd/MM/yyyy', { locale: ptBR })
                            : '—'}
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
