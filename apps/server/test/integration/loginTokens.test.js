import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/db/client.js'
import { findOrCreateUser } from '../../src/db/users.js'
import { createLoginToken, consumeLoginToken } from '../../src/db/loginTokens.js'
import { resetDatabase, disconnectDatabase } from '../helpers/db.js'

beforeEach(resetDatabase)
after(disconnectDatabase)

test('a magic link token can be redeemed only once', async () => {
  const user = await findOrCreateUser('111', 'Ana')
  const token = await createLoginToken(user.id)

  assert.equal(await consumeLoginToken(token), user.id)
  assert.equal(await consumeLoginToken(token), null)
})

test('an expired magic link token is rejected', async () => {
  const user = await findOrCreateUser('222', 'Bia')
  await prisma.loginToken.create({
    data: { token: 'expired', userId: user.id, expiresAt: new Date(Date.now() - 1000) },
  })

  assert.equal(await consumeLoginToken('expired'), null)
})

test('an unknown magic link token is rejected', async () => {
  assert.equal(await consumeLoginToken('does-not-exist'), null)
})
