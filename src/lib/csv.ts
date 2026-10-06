import type { Book } from '../types/book'

// Backup/export of the whole library as a spreadsheet-friendly CSV download
export function downloadCsv(books: Book[]) {
  const header = ['isbn13', 'title', 'authors', 'publisher', 'publishedDate', 'pageCount', 'notes', 'addedAt']
  const rows = books.map((b) => [
    b.isbn13 ?? '',
    b.title,
    b.authors.join('; '),
    b.publisher ?? '',
    b.publishedDate ?? '',
    b.pageCount?.toString() ?? '',
    b.notes ?? '',
    new Date(b.addedAt).toISOString(),
  ])
  const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n')

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `bookshelf-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function escape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}
