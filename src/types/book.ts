// What we store in Firestore at users/{uid}/books/{id}
// id is the ISBN-13 when there is one, otherwise a generated id (books with no ISBN).
export interface BookData {
  isbn13?: string
  title: string
  authors: string[]
  publisher?: string
  publishedDate?: string
  pageCount?: number
  coverUrl?: string
  source: 'openlibrary' | 'googlebooks' | 'manual'
  addedAt: number // Date.now()
  notes?: string
  needsInfo?: boolean // scanned but no API had it — fill in by hand
}

export interface Book extends BookData {
  id: string
}

// What a lookup returns before it's saved
export type BookLookupResult = Omit<BookData, 'addedAt' | 'notes' | 'needsInfo'> & { isbn13: string }
