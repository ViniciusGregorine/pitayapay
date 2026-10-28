import { test, beforeEach, afterEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { findOrCreateUser } from '../../src/db/users.js'
import { createLoginToken } from '../../src/db/loginTokens.js'
import { resetDatabase, disconnectDatabase } from '../helpers/db.js'
import { buildTestServer } from '../helpers/server.js'

let app
beforeEach(async () => {
  await resetDatabase()
  app = await buildTestServer()
})
afterEach(() => app.close())
after(disconnectDatabase)

function redeem(payload) {
  return app.inject({ method: 'POST', url: '/api/auth/magic', payload })
}

test('trades a valid magic link token for a one-hour session JWT of the user', async () => {
  const user = await findOrCreateUser('42', 'Ana')

  const response = await redeem({ token: await createLoginToken(user.id) })

  assert.equal(response.statusCode, 200)
  const session = app.jwt.verify(response.json().token)
  assert.equal(session.sub, user.id)
  assert.equal(session.exp - session.iat, 60 * 60)
})

test('rejects a magic link token that was already used', async () => {
  const user = await findOrCreateUser('42', 'Ana')
  const token = await createLoginToken(user.id)
  await redeem({ token })

  const response = await redeem({ token })

  assert.equal(response.statusCode, 401)
  assert.match(response.json().error, /Link inválido ou expirado/)
})

test('rejects a request without a token', async () => {
  const response = await redeem({})

  assert.equal(response.statusCode, 400)
})
