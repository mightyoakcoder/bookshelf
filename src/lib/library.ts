import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import type { Book, BookData } from '../types/book'
import { auth, db, googleProvider } from './firebase'

export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined) // undefined = still checking
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  return user
}

export const signIn = () => signInWithPopup(auth, googleProvider)
export const signOutUser = () => signOut(auth)

const booksCol = (uid: string) => collection(db, 'users', uid, 'books')

// Live view of the library. Fires immediately from the local cache, then again when the server answers.
export function useBooks(uid: string) {
  const [books, setBooks] = useState<Book[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = query(booksCol(uid), orderBy('addedAt', 'desc'))
    return onSnapshot(
      q,
      (snap) => setBooks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as BookData) }))),
      (err) => setError(err.code === 'permission-denied' ? 'This account isn’t allowed to use this library.' : err.message),
    )
  }, [uid])

  return { books, error }
}

// Writes go to the local cache instantly and sync in the background, so we don't await them —
// awaiting would hang while offline. Failures are reported through onError.
export function saveBook(uid: string, id: string, data: BookData, onError: (msg: string) => void) {
  setDoc(doc(booksCol(uid), id), data).catch((err) => onError(err.message))
}

export function updateBook(uid: string, id: string, data: Partial<BookData>, onError: (msg: string) => void) {
  updateDoc(doc(booksCol(uid), id), data).catch((err) => onError(err.message))
}

export function removeBook(uid: string, id: string, onError: (msg: string) => void) {
  deleteDoc(doc(booksCol(uid), id)).catch((err) => onError(err.message))
}

export function newManualId() {
  return `manual-${Date.now().toString(36)}`
}
