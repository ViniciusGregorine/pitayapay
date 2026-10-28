import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/db/client.js'
import { findOrCreateUser } from '../../src/db/users.js'
import { resetDatabase, disconnectDatabase } from '../helpers/db.js'

beforeEach(resetDatabase)
after(disconnectDatabase)

test('creates the user on first contact', async () => {
  const user = await findOrCreateUser('42', 'Ana')

  assert.equal(user.telegramId, '42')
  assert.equal(user.name, 'Ana')
})

test('returns the same user on later contacts without overwriting the name', async () => {
  const first = await findOrCreateUser('42', 'Ana')

  const again = await findOrCreateUser('42', 'Ana Maria')

  assert.equal(again.id, first.id)
  assert.equal(again.name, 'Ana')
  assert.equal(await prisma.user.count(), 1)
})
