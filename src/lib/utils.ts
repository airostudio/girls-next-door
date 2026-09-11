export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date))
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const TIER_COLORS: Record<string, string> = {
  ELITE:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  PREMIUM:  'text-purple-400 bg-purple-400/10 border-purple-400/30',
  STANDARD: 'text-blue-400  bg-blue-400/10  border-blue-400/30',
}

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  INACTIVE: 'text-red-400    bg-red-400/10    border-red-400/30',
  PENDING:  'text-amber-400  bg-amber-400/10  border-amber-400/30',
}

export const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  COMPLETED: 'text-blue-400   bg-blue-400/10   border-blue-400/30',
  DRAFT:     'text-stone-400  bg-stone-400/10  border-stone-400/30',
  PAUSED:    'text-amber-400  bg-amber-400/10  border-amber-400/30',
}

export const CLIENT_STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  PROSPECT: 'text-amber-400  bg-amber-400/10  border-amber-400/30',
  INACTIVE: 'text-stone-400  bg-stone-400/10  border-stone-400/30',
}

export const DEAL_STATUS_COLORS: Record<string, string> = {
  PROSPECT:    'text-stone-400  bg-stone-400/10  border-stone-400/30',
  NEGOTIATING: 'text-amber-400  bg-amber-400/10  border-amber-400/30',
  ACTIVE:      'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  COMPLETED:   'text-blue-400   bg-blue-400/10   border-blue-400/30',
  CANCELLED:   'text-red-400    bg-red-400/10    border-red-400/30',
}
