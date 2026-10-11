// A tiny bridge between the request layer and the "Confirm your password" window.
//
// When the server answers 423 ("confirm your password first"), the request layer calls
// requestPasswordConfirmation(), the window opens, and the original request is sent again once
// the person has confirmed. Pages do not have to know any of this happens.

let handler = null

/** The window registers itself here while it is mounted. */
export function registerPasswordConfirmHandler(fn) {
  handler = fn
  return () => {
    if (handler === fn) handler = null
  }
}

/** Resolves true once the password is confirmed, false if the person cancels. */
export function requestPasswordConfirmation() {
  return handler ? handler() : Promise.resolve(false)
}
