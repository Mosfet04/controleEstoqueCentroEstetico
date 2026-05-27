import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { TZDate } from '@date-fns/tz'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const SP_TIMEZONE = 'America/Sao_Paulo'

/** Returns the current instant as a TZDate anchored to São Paulo. */
export function nowSP(): TZDate {
  return new TZDate(new Date(), SP_TIMEZONE)
}

/** Wraps an existing Date/string in a TZDate anchored to São Paulo for display. */
export function toSP(date: Date | string | number): TZDate {
  return new TZDate(typeof date === 'string' || typeof date === 'number' ? new Date(date) : date, SP_TIMEZONE)
}

/**
 * Converts a date stored as UTC midnight (date-only convention) to the
 * YYYY-MM-DD string expected by <input type="date">. Reads UTC components
 * directly so the calendar date does not shift across timezones.
 */
export function dateOnlyToInput(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Converts a YYYY-MM-DD string from <input type="date"> to an ISO string
 * anchored at UTC midnight — the canonical storage form for date-only fields.
 */
export function inputDateToISO(yyyy_mm_dd: string): string {
  return new Date(`${yyyy_mm_dd}T00:00:00.000Z`).toISOString()
}

/**
 * Formats a date-only stored value (UTC midnight ISO) as dd/MM/yyyy for display.
 * Reads UTC components directly so the date never shifts across timezones.
 */
export function dateOnlyToDisplay(value: Date | string): string {
  const [y, m, d] = dateOnlyToInput(value).split('-')
  return `${d}/${m}/${y}`
}

/**
 * Days from "today" (São Paulo calendar) until a date-only target, treating
 * both as pure calendar dates. Negative numbers mean the target has passed.
 * Use this instead of date-fns differenceInDays for date-only fields, which
 * is sensitive to time-of-day and timezone drift.
 */
export function dateOnlyDaysFromNow(target: Date | string): number {
  const targetDate = typeof target === 'string' ? new Date(target) : target
  const targetUTC = Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate()
  )
  const todaySP = nowSP()
  const todayUTC = Date.UTC(
    todaySP.getFullYear(),
    todaySP.getMonth(),
    todaySP.getDate()
  )
  return Math.round((targetUTC - todayUTC) / 86_400_000)
}

/**
 * Converts a YYYY-MM-DD string from a date filter input to an ISO string,
 * interpreting it as São Paulo wall-clock time (UTC-3, fixed since 2019).
 * - kind='start': 00:00:00.000 SP → 03:00:00.000 UTC same date
 * - kind='end':   23:59:59.999 SP → 02:59:59.999 UTC next date
 */
export function inputDateRangeToISO(yyyy_mm_dd: string, kind: 'start' | 'end'): string {
  if (kind === 'start') return `${yyyy_mm_dd}T03:00:00.000Z`
  const startMs = new Date(`${yyyy_mm_dd}T03:00:00.000Z`).getTime()
  return new Date(startMs + 86_400_000 - 1).toISOString()
}

/**
 * Variant of inputDateRangeToISO for filtering against date-only fields stored
 * at UTC midnight (e.g. Insumo.dataEntrada / dataVencimento). Bounds align with
 * the UTC calendar day so records on the boundary date are included exactly once.
 */
export function inputDateRangeToISODateOnly(yyyy_mm_dd: string, kind: 'start' | 'end'): string {
  if (kind === 'start') return `${yyyy_mm_dd}T00:00:00.000Z`
  return `${yyyy_mm_dd}T23:59:59.999Z`
}

/** Normalizes a name string for deduplication: removes accents, lowercases, trims, collapses spaces. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}
