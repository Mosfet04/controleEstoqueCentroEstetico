'use client'

import * as React from 'react'

import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ComboboxProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
  value: string
  onChange: (value: string) => void
  fetchSuggestions: (query: string) => Promise<string[]>
  emptyText?: string
}

export function Combobox({
  value,
  onChange,
  fetchSuggestions,
  emptyText = 'Nenhuma sugestão',
  className,
  onBlur,
  ...inputProps
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<string[]>([])
  const abortRef = React.useRef<AbortController | null>(null)
  const blurTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    const handle = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const results = await fetchSuggestions(value)
        if (!controller.signal.aborted) {
          setItems(results.filter((r) => r.toLowerCase() !== value.toLowerCase()))
        }
      } catch {
        if (!controller.signal.aborted) setItems([])
      }
    }, 200)

    return () => clearTimeout(handle)
  }, [value, fetchSuggestions])

  React.useEffect(() => () => abortRef.current?.abort(), [])

  const handleSelect = (item: string) => {
    onChange(item)
    setOpen(false)
  }

  return (
    <Popover open={open && items.length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          {...inputProps}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={(e) => {
            inputProps.onFocus?.(e)
            setOpen(true)
          }}
          onBlur={(e) => {
            onBlur?.(e)
            blurTimeoutRef.current = setTimeout(() => setOpen(false), 120)
          }}
          autoComplete="off"
          className={className}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        className={cn('w-(--radix-popover-trigger-width) p-0')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={() => {
          if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
          setOpen(false)
        }}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item}
                  value={item}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
                  }}
                  onSelect={() => handleSelect(item)}
                >
                  {item}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
