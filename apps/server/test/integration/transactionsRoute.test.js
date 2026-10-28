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
