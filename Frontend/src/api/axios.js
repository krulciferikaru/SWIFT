import axios from 'axios'
import { OFFLINE_MESSAGE, NETWORK_MESSAGE, TIMEOUT_MESSAGE } from '../utils/errors'
import { getToken, clearToken } from '../utils/authToken'
import { requestPasswordConfirmation } from '../utils/passwordConfirm'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// A failure that never reached the server gets a response-shaped body, so every page that
// reads err.response.data.message shows a plain explanation instead of its generic fallback.
function asNetworkError(error, message) {
  error.isNetworkError = true
  error.response = { status: 0, data: { message }, headers: {} }
  return error
}

// Attach token on every request (for when auth is ready)
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Saving while offline can't work. Stop here so the form stays open with what was typed,
  // instead of waiting for a timeout. Reading is still tried: the browser may be wrong about
  // being offline, and a cached or local response is fine.
  const method = (config.method || 'get').toLowerCase()
  if (!navigator.onLine && method !== 'get') {
    return Promise.reject(asNetworkError(new axios.AxiosError('Offline', 'ERR_OFFLINE', config), OFFLINE_MESSAGE))
  }
  return config
})

// Global error handler
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // A sensitive action (changing permissions, resetting a password, deleting for good) wants the
    // password typed again. Ask for it, then send the same request once more.
    if (
      error.response?.status === 423 &&
      error.response.data?.password_confirmation_required &&
      error.config &&
      !error.config._passwordConfirmed
    ) {
      const confirmed = await requestPasswordConfirmation()
      if (confirmed) {
        error.config._passwordConfirmed = true
        return api.request(error.config)
      }
      error.response.data.message = 'Cancelled. Your password was not confirmed, so nothing was changed.'
    }

    if (!error.response && !axios.isCancel(error)) {
      const message = !navigator.onLine
        ? OFFLINE_MESSAGE
        : error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
          ? TIMEOUT_MESSAGE
          : NETWORK_MESSAGE
      asNetworkError(error, message)
    }
    // An administrator who has not set up the authenticator app is sent to do it.
    if (error.response?.status === 403 && error.response.data?.mfa_setup_required && window.location.pathname !== '/security/mfa') {
      window.location.href = '/security/mfa'
    }

    // A wrong password is also a 401. That belongs on the sign-in page as a message; redirecting
    // there would reload the page and wipe what the person typed.
    const isSignInAttempt = error.config?.url === '/login'
    if (error.response?.status === 401 && !isSignInAttempt) {
      // Token expired or invalid: clear it and go to the sign-in page
      clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
