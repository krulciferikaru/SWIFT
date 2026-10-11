// Text size for people who find the normal size small. Everything in SWIFT is sized in rem,
// so changing the page's base font size scales the whole app.

export const TEXT_SIZES = [
  { key: 'normal', label: 'Normal', px: 16 },
  { key: 'large', label: 'Large', px: 19 },
  { key: 'xlarge', label: 'Extra large', px: 22 },
]

const STORAGE_KEY = 'swift.textSize'
const EVENT = 'swift:textsize'

export function getTextSize() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return TEXT_SIZES.some((s) => s.key === value) ? value : 'normal'
  } catch {
    return 'normal'
  }
}

export function applyTextSize(key = getTextSize()) {
  const size = TEXT_SIZES.find((s) => s.key === key) ?? TEXT_SIZES[0]
  document.documentElement.style.fontSize = `${size.px}px`
}

export function setTextSize(key) {
  try {
    localStorage.setItem(STORAGE_KEY, key)
  } catch {
    // The choice just will not be remembered.
  }
  applyTextSize(key)
  window.dispatchEvent(new Event(EVENT))
}

export function subscribeTextSize(callback) {
  window.addEventListener(EVENT, callback)
  return () => window.removeEventListener(EVENT, callback)
}
