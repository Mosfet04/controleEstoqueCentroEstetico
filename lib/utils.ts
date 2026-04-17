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
