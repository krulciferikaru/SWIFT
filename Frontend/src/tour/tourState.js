import { useSyncExternalStore } from 'react'

let active = false
const listeners = new Set()

export function setTourActive(value) {
  if (active === value) return
  active = value
  listeners.forEach((l) => l())
}

const subscribe = (cb) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// True while any tour is running. Pages use it to show sample content.
export function useTourActive() {
  return useSyncExternalStore(subscribe, () => active)
}
