import { test, beforeEach, afterEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { buildServer } from '../../src/server.js'
import { findOrCreateUser } from '../../src/db/users.js'
import { resetDatabase, disconnectDatabase, seedTransaction } from '../helpers/db.js'
import { buildTestServer, loginAs } from '../helpers/server.js'

let app
let ana
beforeEach(async () => {
  await resetDatabase()
  app = await buildTestServer()
  ana = await findOrCreateUser('1', 'Ana')
})
afterEach(() => app.close())
after(disconnectDatabase)

function listAs(token) {
  return app.inject({ method: 'GET', url: '/api/transactions', headers: token ? { authorization: `Bearer ${token}` } : {} })
}

test('lists the user transactions with ISO dates and income/expense totals', async () => {
  const sale = await seedTransaction(ana.id, { type: 'income', amountCents: 120000, date: new Date('2026-10-02'), category: 'Vendas / Receitas', description: 'Tomate' })
  const diesel = await seedTransaction(ana.id, { type: 'expense', amountCents: 25010, date: new Date('2026-10-01'), category: 'Combustível', description: 'Diesel' })
  await seedTransaction(ana.id, { type: 'expense', amountCents: 990, date: new Date('2026-09-30') })

  const response = await listAs(await loginAs(app, ana.id))

  assert.equal(response.statusCode, 200)
  const body = response.json()
  assert.deepEqual(body.transactions.slice(0, 2), [
    { id: sale.id, type: 'income', amountCents: 120000, date: '2026-10-02', category: 'Vendas / Receitas', description: 'Tomate' },
    { id: diesel.id, type: 'expense', amountCents: 25010, date: '2026-10-01', category: 'Combustível', description: 'Diesel' },
  ])
  assert.deepEqual(body.totals, { incomeCents: 120000, expenseCents: 26000 })
})

test('never shows transactions of another user', async () => {
  const bia = await findOrCreateUser('2', 'Bia')
  await seedTransaction(bia.id, { amountCents: 5000 })

  const response = await listAs(await loginAs(app, ana.id))

  assert.deepEqual(response.json(), { transactions: [], totals: { incomeCents: 0, expenseCents: 0 } })
})

test('rejects requests without a session', async () => {
  const response = await listAs(null)

  assert.equal(response.statusCode, 401)
  assert.match(response.json().error, /Envie \/painel/)
})

test('rejects a session signed with another secret', async () => {
  const otherApp = await buildServer({ jwtSecret: 'not-the-secret', logger: false })
  const forged = otherApp.jwt.sign({ sub: ana.id })
  await otherApp.close()

  assert.equal((await listAs(forged)).statusCode, 401)
})

test('rejects an expired session', async () => {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const expired = app.jwt.sign({ sub: ana.id, iat: nowSeconds - 7200, exp: nowSeconds - 3600 })

  assert.equal((await listAs(expired)).statusCode, 401)
})

const CHANGES = { type: 'income', amountCents: 50000, date: '2026-10-05', category: 'Vendas / Receitas', description: 'Milho' }

function updateAs(token, id, payload) {
  return app.inject({ method: 'PUT', url: `/api/transactions/${id}`, headers: { authorization: `Bearer ${token}` }, payload })
}

function deleteAs(token, id) {
  return app.inject({ method: 'DELETE', url: `/api/transactions/${id}`, headers: { authorization: `Bearer ${token}` } })
}

test('updates a transaction and returns it in the list format', async () => {
  const original = await seedTransaction(ana.id)
  const token = await loginAs(app, ana.id)

  const response = await updateAs(token, original.id, CHANGES)

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { id: original.id, ...CHANGES })
  assert.deepEqual((await listAs(token)).json().transactions, [{ id: original.id, ...CHANGES }])
})

test('does not update a transaction of another user', async () => {
  const bia = await findOrCreateUser('2', 'Bia')
  const theirs = await seedTransaction(bia.id, { amountCents: 1000 })

  const response = await updateAs(await loginAs(app, ana.id), theirs.id, CHANGES)

  assert.equal(response.statusCode, 404)
  assert.deepEqual(response.json(), { error: 'Lançamento não encontrado.' })
  assert.equal((await listAs(await loginAs(app, bia.id))).json().transactions[0].amountCents, 1000)
})

const INVALID_UPDATES = {
  'an unknown type': { ...CHANGES, type: 'transfer' },
  'a zero amount': { ...CHANGES, amountCents: 0 },
  'a fractional amount of cents': { ...CHANGES, amountCents: 10.5 },
  'a date that does not exist': { ...CHANGES, date: '2026-02-30' },
  'a date in another format': { ...CHANGES, date: '05/10/2026' },
  'a category outside the list': { ...CHANGES, category: 'Lazer' },
  'a missing field': { type: 'income', amountCents: 50000, date: '2026-10-05', category: 'Outros' },
}

for (const [name, payload] of Object.entries(INVALID_UPDATES)) {
  test(`rejects an update with ${name}`, async () => {
    const original = await seedTransaction(ana.id, { amountCents: 1000 })
    const token = await loginAs(app, ana.id)

    const response = await updateAs(token, original.id, payload)

    assert.equal(response.statusCode, 400)
    assert.match(response.json().error, /Dados inválidos/)
    assert.equal((await listAs(token)).json().transactions[0].amountCents, 1000)
  })
}

test('rejects updates without a session', async () => {
  const original = await seedTransaction(ana.id)

  assert.equal((await updateAs(null, original.id, CHANGES)).statusCode, 401)
})

test('deletes a transaction and updates the totals', async () => {
  const kept = await seedTransaction(ana.id, { type: 'income', amountCents: 3000 })
  const removed = await seedTransaction(ana.id, { type: 'income', amountCents: 2000 })
  const token = await loginAs(app, ana.id)

  const response = await deleteAs(token, removed.id)

  assert.equal(response.statusCode, 204)
  const list = (await listAs(token)).json()
  assert.deepEqual(list.transactions.map((t) => t.id), [kept.id])
  assert.deepEqual(list.totals, { incomeCents: 3000, expenseCents: 0 })
})

test('does not delete a transaction of another user', async () => {
  const bia = await findOrCreateUser('2', 'Bia')
  const theirs = await seedTransaction(bia.id)

  const response = await deleteAs(await loginAs(app, ana.id), theirs.id)

  assert.equal(response.statusCode, 404)
  assert.equal((await listAs(await loginAs(app, bia.id))).json().transactions.length, 1)
})

test('rejects a delete with a non-numeric id', async () => {
  const response = await deleteAs(await loginAs(app, ana.id), 'abc')

  assert.equal(response.statusCode, 400)
  assert.match(response.json().error, /Dados inválidos/)
})

test('rejects deletes without a session', async () => {
  const original = await seedTransaction(ana.id)

  assert.equal((await deleteAs(null, original.id)).statusCode, 401)
})
