import type { BookFormat } from '../types/book'

export function formatLabel(format: BookFormat) {
  return format === 'hardcover' ? 'Hardcover' : 'Paperback'
}
