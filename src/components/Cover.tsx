import { useState } from 'react'
import type { Book } from '../types/book'

// Saved cover if we have one, otherwise try Open Library's cover-by-ISBN endpoint,
// otherwise a plain placeholder with the title's first letter.
export function Cover({ book }: { book: Book }) {
  const fallback = book.isbn13 ? `https://covers.openlibrary.org/b/isbn/${book.isbn13}-M.jpg?default=false` : null
  const [src, setSrc] = useState(book.coverUrl ?? fallback)

  if (!src) {
    return <div className="cover cover-placeholder">{book.title.charAt(0)}</div>
  }
  return (
    <img
      className="cover"
      src={src}
      alt=""
      loading="lazy"
      onError={() => setSrc(src === fallback || !fallback ? null : fallback)}
    />
  )
}
