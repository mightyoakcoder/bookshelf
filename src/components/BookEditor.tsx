import { useEffect, useRef, useState } from 'react'
import { cleanIsbn, isValidIsbn, toIsbn13 } from '../lib/isbn'
import type { Book, BookData } from '../types/book'

interface Props {
  book: Book | null // null = adding a new book by hand
  onSave: (data: Partial<BookData>, isbn13?: string) => void
  onDelete?: () => void
  onClose: () => void
}

export function BookEditor({ book, onSave, onDelete, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState(book?.needsInfo ? '' : (book?.title ?? ''))
  const [authors, setAuthors] = useState(book?.authors.join(', ') ?? '')
  const [isbn, setIsbn] = useState('')
  const [notes, setNotes] = useState(book?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Title is required')

    let isbn13: string | undefined
    if (!book && isbn.trim()) {
      const cleaned = cleanIsbn(isbn)
      if (!isValidIsbn(cleaned)) return setError('That ISBN isn’t valid — leave it blank if the book has none')
      isbn13 = toIsbn13(cleaned)
    }

    onSave(
      {
        title: title.trim(),
        authors: authors.split(',').map((a) => a.trim()).filter(Boolean),
        notes: notes.trim() || undefined,
        needsInfo: false,
      },
      isbn13,
    )
    onClose()
  }

  function handleDelete() {
    if (onDelete && confirm(`Remove “${book?.title}” from your library?`)) {
      onDelete()
      onClose()
    }
  }

  return (
    <dialog ref={dialogRef} className="editor" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <h2>{book ? 'Edit book' : 'Add a book by hand'}</h2>

        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={book?.title} autoFocus={!book} />
        </label>
        <label>
          Authors <span className="muted">(comma separated)</span>
          <input value={authors} onChange={(e) => setAuthors(e.target.value)} />
        </label>
        {!book && (
          <label>
            ISBN <span className="muted">(optional)</span>
            <input value={isbn} onChange={(e) => setIsbn(e.target.value)} inputMode="numeric" />
          </label>
        )}
        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>

        {book && (
          <p className="muted small">
            {[book.isbn13 && `ISBN ${book.isbn13}`, book.publisher, book.publishedDate, book.pageCount && `${book.pageCount} pages`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {error && <p className="error">{error}</p>}

        <div className="editor-actions">
          {onDelete && (
            <button type="button" className="danger" onClick={handleDelete}>
              Remove
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Save</button>
        </div>
      </form>
    </dialog>
  )
}
