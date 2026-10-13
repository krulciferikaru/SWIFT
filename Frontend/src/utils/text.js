// Uppercases the first letter of every word (also after - and '), leaving the
// rest as typed. Staff rarely use shift/caps lock when encoding names.
export const capitalizeWords = (value = '') =>
  value.replace(/(^|[\s\-'’.])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())

export const BARANGAYS = [
  'Malete, Palayan City',
  'Santolan, Palayan City',
  'Caballero, Palayan City',
  'Ganaderia, Palayan City',
  'Caimito, Palayan City',
]

/**
 * "2026-10-14" -> "October 14, 2026". Shown under date boxes, because the browser's own date
 * box follows its language settings and month/day order can be misread.
 */
export function spelledDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return ''
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
