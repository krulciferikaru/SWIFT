import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useAuth } from '../context/AuthContext'
import { TOURS } from './tours'

const isVisible = (el) => el.getClientRects().length > 0

// First visible match: the same data-tour value can exist in desktop and phone markup.
const findVisible = (selector) =>
  Array.from(document.querySelectorAll(selector)).find(isVisible) || null

const storageKey = (user, id) => `swift.tourSeen.${user?.id ?? user?.email ?? 'anon'}.${id}`

const readSeen = (user, id) => {
  try {
    return localStorage.getItem(storageKey(user, id)) === '1'
  } catch {
    return false
  }
}

const markSeen = (user, id) => {
  try {
    localStorage.setItem(storageKey(user, id), '1')
  } catch {
    // storage blocked: the tour just may show again next time
  }
}

export function runTour(id, { user, onEnd } = {}) {
  const tour = TOURS[id]
  if (!tour) return false

  const steps = tour.steps
    .map((s) => ({ ...s, element: findVisible(s.selector) }))
    .filter((s) => s.element)
    .map((s) => ({
      element: s.element,
      popover: { title: s.title, description: s.description, side: s.side },
    }))

  const finish = () => {
    markSeen(user, id)
    onEnd?.()
  }

  if (steps.length === 0) {
    const d = driver({ allowClose: true, popoverClass: 'swift-tour', onDestroyed: finish })
    d.highlight({
      popover: {
        title: 'Nothing to show yet',
        description: 'Wait for the page to finish loading, then try the tour again.',
      },
    })
    return false
  }

  const d = driver({
    steps,
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    allowClose: true,
    overlayOpacity: 0.5,
    stagePadding: 6,
    popoverClass: 'swift-tour',
    onDestroyed: finish,
  })
  d.drive()
  return true
}

export function useTour(id) {
  const { user } = useAuth()
  const start = useCallback(() => runTour(id, { user }), [id, user])
  return { start }
}

// Opens the tour when the page is reached with ?tour=1 (used by the Guide's "Show me").
export function useAutoStartTour(id) {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const wanted = params.get('tour') === '1'

  useEffect(() => {
    if (!wanted) return
    const first = TOURS[id]?.steps[0]?.selector
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      if ((first && findVisible(first)) || tries > 25) {
        clearInterval(timer)
        const next = new URLSearchParams(params)
        next.delete('tour')
        setParams(next, { replace: true })
        runTour(id, { user })
      }
    }, 200)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, id])
}

// Shows the welcome tour once per user, the first time they land in the app.
export function useFirstVisitTour(id) {
  const { user } = useAuth()

  useEffect(() => {
    if (!user || readSeen(user, id)) return
    const timer = setTimeout(() => runTour(id, { user }), 900)
    return () => clearTimeout(timer)
  }, [user, id])
}
