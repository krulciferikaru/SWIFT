// Where the sign-in token is kept.
//  - "Keep me signed in" ticked: localStorage, so it survives closing the browser.
//  - Not ticked: sessionStorage, so it is gone when the browser or tab is closed.
// The server also expires every token (a working day, or 30 days when kept), so a token
// left behind on a shared computer does not stay valid forever.

const KEY = 'token'

const safe = (fn, fallback = null) => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export const getToken = () => safe(() => sessionStorage.getItem(KEY)) ?? safe(() => localStorage.getItem(KEY))

export function setToken(token, remember = false) {
  clearToken()
  // If the browser blocks storage there is nothing we can do; the person just has to sign in again.
  safe(() => (remember ? localStorage : sessionStorage).setItem(KEY, token))
}

export function clearToken() {
  safe(() => sessionStorage.removeItem(KEY))
  safe(() => localStorage.removeItem(KEY))
}
