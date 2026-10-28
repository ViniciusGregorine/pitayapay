import { buildServer } from '../../src/server.js'
import { createLoginToken } from '../../src/db/loginTokens.js'

const JWT_SECRET = 'test-secret'

export function buildTestServer() {
  return buildServer({ jwtSecret: JWT_SECRET, logger: false })
}

export async function loginAs(app, userId) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/magic',
    payload: { token: await createLoginToken(userId) },
  })
  return response.json().token
}
