// Remove everything except digits and X, and keep X only if it's the last character
export function cleanIsbn(input: string): string {
  const cleaned = input.replace(/[^0-9Xx]/g, '').toUpperCase()
  return cleaned.replace(/X(?!$)/g, '')
}

// Check digit for the first 12 digits of an ISBN-13: weights 1,3,1,3,…
function isbn13CheckDigit(first12: string): number {
  const sum = [...first12].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0)
  return (10 - (sum % 10)) % 10
}

export function isValidIsbn(isbn: string): boolean {
  if (/^\d{13}$/.test(isbn)) {
    return isbn13CheckDigit(isbn.slice(0, 12)) === Number(isbn[12])
  }
  if (/^\d{9}[\dX]$/.test(isbn)) {
    // weights 10,9,…,1; X = 10; total divisible by 11
    const sum = [...isbn].reduce((acc, d, i) => acc + (d === 'X' ? 10 : Number(d)) * (10 - i), 0)
    return sum % 11 === 0
  }
  return false
}

// ISBN-10 → ISBN-13: prefix 978, drop the old check digit, compute a new one
export function toIsbn13(isbn: string): string {
  if (isbn.length === 13) return isbn
  const core = '978' + isbn.slice(0, 9)
  return core + isbn13CheckDigit(core)
}

// A scanned EAN-13 is a book ISBN only if it starts with 978/979 and has a valid check digit
export function isBookBarcode(raw: string): boolean {
  return /^97[89]\d{10}$/.test(raw) && isValidIsbn(raw)
}
