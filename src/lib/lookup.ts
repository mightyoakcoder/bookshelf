import type { BookLookupResult } from '../types/book'
import { cleanIsbn, isValidIsbn, toIsbn13 } from './isbn'

// Given an ISBN (10 or 13 digits, maybe with dashes), return book info, or null if no source has it.
// Throws for invalid ISBNs and for API failures, so "not found" never hides a real error.
export async function lookupIsbn(input: string): Promise<BookLookupResult | null> {
  const cleaned = cleanIsbn(input)
  if (!isValidIsbn(cleaned)) throw new Error(`"${input}" isn't a valid ISBN`)

  const isbn13 = toIsbn13(cleaned)
  return (await fetchFromOpenLibrary(isbn13)) ?? (await fetchFromGoogleBooks(isbn13))
}

async function fetchFromOpenLibrary(isbn13: string): Promise<BookLookupResult | null> {
  const bibkey = `ISBN:${isbn13}`
  const url = `https://openlibrary.org/api/books?bibkeys=${bibkey}&format=json&jscmd=data`

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Open Library error ${response.status}`)

  const data = await response.json()
  const book = data[bibkey]
  if (!book) return null

  return {
    isbn13,
    title: book.subtitle ? `${book.title}: ${book.subtitle}` : book.title,
    authors: book.authors?.map((a: { name: string }) => a.name) ?? [],
    publisher: book.publishers?.[0]?.name,
    publishedDate: book.publish_date,
    pageCount: book.number_of_pages,
    coverUrl: book.cover?.medium ?? book.cover?.large,
    source: 'openlibrary',
  }
}

async function fetchFromGoogleBooks(isbn13: string): Promise<BookLookupResult | null> {
  const key = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}` + (key ? `&key=${key}` : '')

  const response = await fetch(url)
  if (response.status === 429) throw new Error('Google Books quota exceeded — add an API key')
  if (!response.ok) throw new Error(`Google Books error ${response.status}`)

  const data = await response.json()
  const info = data.items?.[0]?.volumeInfo
  if (!info) return null

  return {
    isbn13,
    title: info.subtitle ? `${info.title}: ${info.subtitle}` : info.title,
    authors: info.authors ?? [],
    publisher: info.publisher,
    publishedDate: info.publishedDate,
    pageCount: info.pageCount,
    // Google returns http:// thumbnails, which browsers block on an https page
    coverUrl: info.imageLinks?.thumbnail?.replace(/^http:/, 'https:'),
    source: 'googlebooks',
  }
}
