const SESSION_KEY = 'pitayapay.session'
const NO_CONTENT = 204
const UNAUTHORIZED = 401

async function request(path, options = {}) {
  const response = await fetch(path, options)
  const body = response.status === NO_CONTENT ? null : await response.json()
  if (!response.ok) {
    if (response.status === UNAUTHORIZED) sessionStorage.removeItem(SESSION_KEY)
    throw new Error(body?.error || 'Erro inesperado. Tente novamente.')
  }
  return body
}

function authorizedRequest(path, { headers, ...options } = {}) {
  return request(path, {
    ...options,
    headers: { ...headers, Authorization: `Bearer ${sessionStorage.getItem(SESSION_KEY)}` },
  })
}

// Trades the one-time magic link token in the URL for a session JWT.
export async function loginFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const magicToken = params.get('token')
  if (!magicToken) return

  window.history.replaceState(null, '', window.location.pathname)
  const { token } = await request('/api/auth/magic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: magicToken }),
  })
  sessionStorage.setItem(SESSION_KEY, token)
}

export function hasSession() {
  return Boolean(sessionStorage.getItem(SESSION_KEY))
}

export function fetchTransactions() {
  return authorizedRequest('/api/transactions')
}

export function updateTransaction(id, fields) {
  return authorizedRequest(`/api/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
}

export function deleteTransaction(id) {
  return authorizedRequest(`/api/transactions/${id}`, { method: 'DELETE' })
}
