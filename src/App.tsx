import type { User } from 'firebase/auth'
import { useMemo, useState } from 'react'
import { BookEditor } from './components/BookEditor'
import { Cover } from './components/Cover'
import { Scanner, type ScanOutcome } from './components/Scanner'
import { downloadCsv } from './lib/csv'
import { cleanIsbn, isValidIsbn, toIsbn13 } from './lib/isbn'
import { newManualId, removeBook, saveBook, signIn, signOutUser, updateBook, useBooks, useUser } from './lib/library'
import { lookupIsbn } from './lib/lookup'
import type { Book } from './types/book'

function App() {
  const user = useUser()

  if (user === undefined) return <main className="center muted">Loading…</main>
  if (user === null) {
    return (
      <main className="center">
        <h1>Bookshelf</h1>
        <p className="muted">Every book I own, one scan at a time.</p>
        <button type="button" onClick={() => signIn().catch((err) => alert(err.message))}>
          Sign in with Google
        </button>
      </main>
    )
  }
  return <Library user={user} />
}

type SortKey = 'recent' | 'title' | 'author'

function Library({ user }: { user: User }) {
  const { books, error: loadError } = useBooks(user.uid)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [editing, setEditing] = useState<Book | 'new' | null>(null)
  const [isbnInput, setIsbnInput] = useState('')
  const [isbnStatus, setIsbnStatus] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [onlyNeedsInfo, setOnlyNeedsInfo] = useState(false)

  const byId = useMemo(() => new Map((books ?? []).map((b) => [b.id, b])), [books])
  const needsInfoCount = books?.filter((b) => b.needsInfo).length ?? 0

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = (books ?? []).filter(
      (b) =>
        (!onlyNeedsInfo || b.needsInfo) &&
        (!term ||
          b.title.toLowerCase().includes(term) ||
          b.authors.some((a) => a.toLowerCase().includes(term)) ||
          b.isbn13?.includes(term)),
    )
    if (sort === 'title') return [...list].sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'author') return [...list].sort((a, b) => authorKey(a).localeCompare(authorKey(b)))
    return list // already newest-first from Firestore
  }, [books, search, sort, onlyNeedsInfo])

  // Shared by the camera scanner and the typed-ISBN box
  async function addByIsbn(raw: string): Promise<ScanOutcome> {
    const cleaned = cleanIsbn(raw)
    if (!isValidIsbn(cleaned)) return { status: 'error', message: 'not a valid ISBN' }
    const isbn13 = toIsbn13(cleaned)

    const existing = byId.get(isbn13)
    if (existing) return { status: 'duplicate', title: existing.title }

    try {
      const found = await lookupIsbn(isbn13)
      if (found) {
        saveBook(user.uid, isbn13, { ...found, addedAt: Date.now() }, setError)
        return { status: 'added', title: found.title }
      }
      // Nothing knows this book — save a placeholder so the scan isn't lost
      saveBook(
        user.uid,
        isbn13,
        { isbn13, title: `Unknown book (${isbn13})`, authors: [], source: 'manual', addedAt: Date.now(), needsInfo: true },
        setError,
      )
      return { status: 'notfound' }
    } catch (err) {
      return { status: 'error', message: err instanceof Error ? err.message : String(err) }
    }
  }

  async function handleIsbnSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isbnInput.trim()) return
    setIsbnStatus('Looking up…')
    const outcome = await addByIsbn(isbnInput)
    setIsbnStatus(describe(outcome))
    if (outcome.status !== 'error') setIsbnInput('')
  }

  if (scanning) return <Scanner onIsbn={addByIsbn} onClose={() => setScanning(false)} />

  return (
    <main>
      <header className="top">
        <div>
          <h1>Bookshelf</h1>
          <p className="muted small">{books ? `${books.length} book${books.length === 1 ? '' : 's'}` : 'Loading…'}</p>
        </div>
        <button type="button" className="ghost small" onClick={signOutUser}>
          Sign out
        </button>
      </header>

      {(loadError || error) && (
        <p className="error" onClick={() => setError(null)}>
          {loadError ?? error}
        </p>
      )}

      <button type="button" className="scan-button" onClick={() => setScanning(true)}>
        Scan books
      </button>

      <form onSubmit={handleIsbnSubmit} className="row">
        <input
          inputMode="numeric"
          placeholder="…or type an ISBN"
          value={isbnInput}
          onChange={(e) => setIsbnInput(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
      {isbnStatus && <p className="muted small">{isbnStatus}</p>}

      <div className="row controls">
        <input type="search" placeholder="Search title, author, ISBN" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort">
          <option value="recent">Recent</option>
          <option value="title">Title</option>
          <option value="author">Author</option>
        </select>
      </div>

      <div className="row chips">
        {needsInfoCount > 0 && (
          <button type="button" className={`chip ${onlyNeedsInfo ? 'active' : ''}`} onClick={() => setOnlyNeedsInfo(!onlyNeedsInfo)}>
            {needsInfoCount} need info
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="ghost small" onClick={() => setEditing('new')}>
          + Add by hand
        </button>
        {books && books.length > 0 && (
          <button type="button" className="ghost small" onClick={() => downloadCsv(books)}>
            Export CSV
          </button>
        )}
      </div>

      <ul className="books">
        {visible.map((b) => (
          <li key={b.id} onClick={() => setEditing(b)}>
            <Cover book={b} />
            <div>
              <div className="title">
                {b.needsInfo ? <span className="badge">needs info</span> : null}
                {b.needsInfo ? b.isbn13 : b.title}
              </div>
              <div className="muted small">{b.authors.join(', ')}</div>
            </div>
          </li>
        ))}
        {books && visible.length === 0 && (
          <li className="muted empty">{books.length === 0 ? 'No books yet — tap “Scan books” to start.' : 'No matches.'}</li>
        )}
      </ul>

      {editing && (
        <BookEditor
          book={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(data, isbn13) => {
            if (editing === 'new') {
              const id = isbn13 ?? newManualId()
              saveBook(user.uid, id, { authors: [], title: '', ...data, isbn13, source: 'manual', addedAt: Date.now() }, setError)
            } else {
              updateBook(user.uid, editing.id, data, setError)
            }
          }}
          onDelete={editing === 'new' ? undefined : () => removeBook(user.uid, editing.id, setError)}
        />
      )}
    </main>
  )
}

// Sort by the first author's last name
function authorKey(b: Book) {
  return b.authors[0]?.split(' ').at(-1) ?? '￿'
}

function describe(outcome: ScanOutcome) {
  switch (outcome.status) {
    case 'added':
      return `Added “${outcome.title}”`
    case 'duplicate':
      return `Already in your library: “${outcome.title}”`
    case 'notfound':
      return 'Not found in any database — saved it so you can fill in the details'
    case 'error':
      return `Error: ${outcome.message}`
  }
}

export default App
