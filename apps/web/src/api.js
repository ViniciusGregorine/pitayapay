const SESSION_KEY = 'pitayapay.session'

async function request(path, options = {}) {
  const response = await fetch(path, options)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Erro inesperado. Tente novamente.')
  return body
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

export async function fetchTransactions() {
  try {
    return await request('/api/transactions', {
      headers: { Authorization: `Bearer ${sessionStorage.getItem(SESSION_KEY)}` },
    })
  } catch (error) {
    sessionStorage.removeItem(SESSION_KEY)
    throw error
  }
}
