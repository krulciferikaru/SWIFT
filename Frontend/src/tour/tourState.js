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

const PREF_KEY = 'swift.showTourButtons'
const readPref = () => {
  try {
    return localStorage.getItem(PREF_KEY) !== 'false'
  } catch {
    return true
  }
}
let showButtons = readPref()
const prefListeners = new Set()

export function setShowTourButtons(value) {
  showButtons = value
  try {
    localStorage.setItem(PREF_KEY, String(value))
  } catch {
    // storage blocked: the choice just lasts until the page is reloaded
  }
  prefListeners.forEach((l) => l())
}

const subscribePref = (cb) => {
  prefListeners.add(cb)
  return () => prefListeners.delete(cb)
}

// Whether the "Take a tour" buttons are shown (a per-device setting in Settings).
export function useShowTourButtons() {
  return useSyncExternalStore(subscribePref, () => showButtons)
}

// True while any tour is running. Pages use it to show sample content.
export function useTourActive() {
  return useSyncExternalStore(subscribe, () => active)
}
