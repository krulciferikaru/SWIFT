// One set of plain-language messages for a request that never got an answer.

export const OFFLINE_MESSAGE =
  "You're offline. Nothing was sent, and what you typed is still here. Try again when your connection is back."

export const NETWORK_MESSAGE =
  "Can't reach the server. Check your internet connection and try again."

export const TIMEOUT_MESSAGE =
  'The server took too long to answer. Please try again in a moment.'

/** True when the request failed before the server answered (offline, dropped, timed out). */
export const isNetworkError = (err) => !!err?.isNetworkError

/**
 * What to show a person when a request fails. Works for every kind of failure, so pages can
 * write `errorMessage(err, 'Failed to save plan.')` instead of reading err.response themselves.
 */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (isNetworkError(err)) return err.response.data.message
  const first = err?.response?.data?.errors && Object.values(err.response.data.errors)[0]?.[0]
  return err?.response?.data?.message || first || fallback
}
