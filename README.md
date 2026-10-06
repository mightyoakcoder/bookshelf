# Bookshelf

A phone-first PWA for tracking the books I own. Scan a book's barcode, look it up, save it to my library.

**Stack:** React + Vite + TypeScript · `vite-plugin-pwa` · Firebase (Auth, Firestore, Hosting) · Open Library + Google Books APIs

## Run locally

```bash
cp .env.example .env.local   # fill in Firebase values
npm install
npm run dev                  # http://localhost:5175
```

## Roadmap

- [x] **0 — Scaffold:** Vite + PWA plugin + Firebase SDK wiring
- [ ] **1 — ISBN lookup:** type an ISBN → `src/lib/lookup.ts` → Open Library, fallback to Google Books
- [ ] **2 — Barcode scanning:** camera → native `BarcodeDetector` (Chrome on Android) → fills the lookup
- [ ] **3 — Save & list:** Firestore `users/{uid}/books/{isbn13}`, library list view
- [ ] **4 — Auth & polish:** Google sign-in, security rules, search/filter, manual add for lookup misses
- [ ] **5 — Ship:** Firebase Hosting deploy, install to home screen on the Pixel

## Notes

- A book's back-cover barcode is an EAN-13 that *is* the ISBN-13 (starts with 978/979).
- The camera needs HTTPS (or `localhost`). To test on the phone before deploying, use Chrome
  remote debugging port forwarding (`chrome://inspect` → Port forwarding 5175 → localhost:5175),
  or deploy to a Firebase Hosting preview channel.
