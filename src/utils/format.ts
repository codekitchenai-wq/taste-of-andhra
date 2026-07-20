const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
})

const dateFullFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'full',
  timeStyle: 'short',
})

export function formatPrice(value: number): string {
  return priceFormatter.format(value)
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(new Date(value))
}

export function formatDateTimeFull(value: string | Date): string {
  return dateFullFormatter.format(new Date(value))
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value))
}
