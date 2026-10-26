// Base API URL from environment variables with fallback
const rawUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')
const API_BASE = rawUrl.endsWith('/api') ? rawUrl.slice(0, -4) : rawUrl
const BASE_URL = API_BASE ? `${API_BASE}/api/auth` : '/api/auth'

/**
 * Shared fetch wrapper that always sends cookies and expects JSON.
 * Throws an Error with the server's message on non-2xx responses.
 */
async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',   // send/receive httpOnly cookie
    ...options,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`)
  }

  return data
}

/** POST /api/auth/register */
export const registerUser = ({ username, email, password }) =>
  request('/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  })

/** POST /api/auth/login */
export const loginUser = ({ email, password }) =>
  request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

/** GET /api/auth/logout */
export const logoutUser = () => request('/logout')

/** GET /api/auth/get-me  (protected — needs valid cookie) */
export const getMe = () => request('/get-me')
