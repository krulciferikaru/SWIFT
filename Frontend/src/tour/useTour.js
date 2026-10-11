import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useAuth } from '../context/AuthContext'
import { TOURS } from './tours'
import { setTourActive } from './tourState'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const isVisible = (el) => el.getClientRects().length > 0

// First visible match: the same data-tour value can exist in desktop and phone markup.
const findVisible = (selector) =>
  Array.from(document.querySelectorAll(selector)).find(isVisible) || null

// After clicking a tab the old content can linger for a moment and then be replaced
// once data loads, so wait until the same element has stayed on screen for `settle` ms.
async function waitForStable(selector, { timeout = 4000, settle = 450 } = {}) {
  const end = Date.now() + timeout
  let current = null
  let since = 0
  while (Date.now() < end) {
    const el = findVisible(selector)
    if (el && el === current) {
      if (Date.now() - since >= settle) return el
    } else {
      current = el
      since = Date.now()
    }
    await sleep(75)
  }
  return null
}

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

let running = false
let current = null

// Clicks each selector in turn to put the page back how the tour found it.
async function restorePage(selectors) {
  for (const sel of [].concat(selectors)) {
    findVisible(sel)?.click()
    await sleep(150)
  }
}

// Step options (see tours.js):
//   selector  element to highlight
//   click     selector to click first (e.g. switch a tab), then wait for `selector`
//   roles     only show for these roles
// Steps without `click` are dropped if their element is not on screen.
export async function runTour(id, { user, onEnd } = {}) {
  const tour = TOURS[id]
  // ignore a second start while one is live (or still starting); a stale flag is reset
  if (!tour || (running && (!current || current.isActive()))) return false
  running = true
  setTourActive(true)
  // let pages render their sample content before we look for elements
  await sleep(80)

  const role = user?.role
  const steps = tour.steps
    .filter((s) => !s.roles || s.roles.includes(role))
    .filter((s) => s.click || findVisible(s.selector))

  let ended = false
  let switchedTabs = false
  // Escape should only end the tour. Capture it first so a dialog the tour is
  // running inside (e.g. the Add Subscriber form) does not also close.
  const onKeyDown = (e) => {
    if (e.key !== 'Escape') return
    e.stopImmediatePropagation()
    e.preventDefault()
    close()
  }
  window.addEventListener('keydown', onKeyDown, true)
  // Driver.js only fires its own onDestroyed when an element is highlighted, so
  // cleanup is done here, once, for every way the tour can end.
  const finish = () => {
    if (ended) return
    ended = true
    window.removeEventListener('keydown', onKeyDown, true)
    running = false
    current = null
    setTourActive(false)
    markSeen(user, id)
    if (tour.restore && switchedTabs) restorePage(tour.restore)
    onEnd?.()
  }

  let d
  const close = () => {
    d.destroy()
    finish()
  }

  if (steps.length === 0) {
    d = driver({ allowClose: true, popoverClass: 'swift-tour', onDestroyStarted: close })
    current = d
    d.highlight({
      popover: {
        title: 'Nothing to show yet',
        description: 'Wait for the page to finish loading, then try the tour again.',
      },
    })
    return false
  }

  let moving = false
  const goTo = async (from, dir) => {
    if (moving || ended) return
    moving = true
    try {
      let idx = from
      while (idx >= 0 && idx < steps.length) {
        const s = steps[idx]
        if (s.click) {
          switchedTabs = true
          findVisible(s.click)?.click()
          if (!(await waitForStable(s.selector))) {
            idx += dir
            continue
          }
        }
        if (!ended) d.drive(idx)
        return
      }
      if (dir > 0 && !ended) close()
    } finally {
      moving = false
    }
  }

  d = driver({
    steps: steps.map((s) => ({
      element: () => findVisible(s.selector),
      popover: { title: s.title, description: s.description, side: s.side },
    })),
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    allowClose: true,
    overlayOpacity: 0.5,
    stagePadding: 6,
    popoverClass: 'swift-tour',
    onNextClick: () => goTo(d.getActiveIndex() + 1, 1),
    onPrevClick: () => goTo(d.getActiveIndex() - 1, -1),
    onDestroyStarted: close,
  })
  current = d

  await goTo(0, 1)
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
    const first = TOURS[id]?.steps.find((s) => !s.roles || s.roles.includes(user?.role))?.selector
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
