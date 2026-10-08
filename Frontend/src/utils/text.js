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
