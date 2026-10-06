import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Firebase throws on startup without config, so don't even load the app until .env.local is filled in
const configured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID)
const App = lazy(() => import('./App.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {configured ? (
      <Suspense fallback={<main className="center muted">Loading…</main>}>
        <App />
      </Suspense>
    ) : (
      <main className="center">
        <h1>Bookshelf</h1>
        <p className="muted">Firebase isn’t configured yet — copy .env.example to .env.local and fill it in.</p>
      </main>
    )}
  </StrictMode>,
)
