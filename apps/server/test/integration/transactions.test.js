import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/db/client.js'
import { findOrCreateUser } from '../../src/db/users.js'
import { createDraft } from '../../src/db/drafts.js'
import { confirmDraftAsTransaction, listTransactions, updateTransaction, deleteTransaction } from '../../src/db/transactions.js'
import { resetDatabase, disconnectDatabase, seedTransaction } from '../helpers/db.js'

const PARSED = { type: 'income', amountCents: 120000, date: '2026-10-02', category: 'Vendas / Receitas', description: 'Tomate', missing: [] }

let ana
beforeEach(async () => {
  await resetDatabase()
  ana = await findOrCreateUser('1', 'Ana')
})
after(disconnectDatabase)

test('confirming a draft saves the transaction and marks the draft as confirmed', async () => {
  const draft = await createDraft(ana.id, 'vendi tomate por 1200', PARSED)

  const { id, createdAt, ...saved } = await confirmDraftAsTransaction(draft)

  assert.deepEqual(saved, {
    userId: ana.id,
    type: 'income',
    amountCents: 120000,
    date: new Date('2026-10-02T00:00:00.000Z'),
    category: 'Vendas / Receitas',
    description: 'Tomate',
    rawText: 'vendi tomate por 1200',
  })
  const { status } = await prisma.draft.findUniqueOrThrow({ where: { id: draft.id } })
  assert.equal(status, 'confirmed')
})

test('rejects confirming a draft that no longer exists without saving a transaction', async () => {
  const draft = await createDraft(ana.id, 'x', PARSED)
  await prisma.draft.delete({ where: { id: draft.id } })

  await assert.rejects(confirmDraftAsTransaction(draft))

  assert.equal(await prisma.transaction.count(), 0)
})

test('lists only the user transactions, newest date first and then newest id', async () => {
  const bia = await findOrCreateUser('2', 'Bia')
  const old = await seedTransaction(ana.id, { date: new Date('2026-09-01') })
  const sameDayFirst = await seedTransaction(ana.id, { date: new Date('2026-10-01') })
  const sameDaySecond = await seedTransaction(ana.id, { date: new Date('2026-10-01') })
  await seedTransaction(bia.id)

  const transactions = await listTransactions(ana.id)

  assert.deepEqual(transactions.map((t) => t.id), [sameDaySecond.id, sameDayFirst.id, old.id])
})

test('filters by period including both ends', async () => {
  await seedTransaction(ana.id, { date: new Date('2026-09-30') })
  const first = await seedTransaction(ana.id, { date: new Date('2026-10-01') })
  const last = await seedTransaction(ana.id, { date: new Date('2026-10-31') })
  await seedTransaction(ana.id, { date: new Date('2026-11-01') })

  const transactions = await listTransactions(ana.id, { from: '2026-10-01', to: '2026-10-31' })

  assert.deepEqual(transactions.map((t) => t.id), [last.id, first.id])
})

test('filters by an open-ended period', async () => {
  const old = await seedTransaction(ana.id, { date: new Date('2026-09-30') })
  const recent = await seedTransaction(ana.id, { date: new Date('2026-10-01') })

  const since = await listTransactions(ana.id, { from: '2026-10-01' })
  const until = await listTransactions(ana.id, { to: '2026-09-30' })

  assert.deepEqual(since.map((t) => t.id), [recent.id])
  assert.deepEqual(until.map((t) => t.id), [old.id])
})

test('filters by type and category together', async () => {
  const fuel = await seedTransaction(ana.id, { type: 'expense', category: 'Combustível' })
  await seedTransaction(ana.id, { type: 'expense', category: 'Outros' })
  await seedTransaction(ana.id, { type: 'income', category: 'Combustível' })

  const transactions = await listTransactions(ana.id, { type: 'expense', category: 'Combustível' })

  assert.deepEqual(transactions.map((t) => t.id), [fuel.id])
})

test('filters never show transactions of another user', async () => {
  const bia = await findOrCreateUser('2', 'Bia')
  await seedTransaction(bia.id, { type: 'expense' })

  assert.deepEqual(await listTransactions(ana.id, { type: 'expense' }), [])
})

const CHANGES = { type: 'income', amountCents: 50000, date: '2026-10-05', category: 'Vendas / Receitas', description: 'Milho' }

test('updates the editable fields of a user transaction and keeps the original text', async () => {
  const original = await seedTransaction(ana.id, { rawText: 'gastei 10' })

  const { createdAt, ...updated } = await updateTransaction(ana.id, original.id, CHANGES)

  assert.deepEqual(updated, {
    id: original.id,
    userId: ana.id,
    type: 'income',
    amountCents: 50000,
    date: new Date('2026-10-05T00:00:00.000Z'),
    category: 'Vendas / Receitas',
    description: 'Milho',
    rawText: 'gastei 10',
  })
})

test('does not update a transaction of another user', async () => {
  const bia = await findOrCreateUser('2', 'Bia')
  const theirs = await seedTransaction(bia.id, { amountCents: 1000 })

  const result = await updateTransaction(ana.id, theirs.id, CHANGES)

  assert.equal(result, null)
  const { amountCents } = await prisma.transaction.findUniqueOrThrow({ where: { id: theirs.id } })
  assert.equal(amountCents, 1000)
})

test('rethrows database errors other than not found', async () => {
  const original = await seedTransaction(ana.id)

  await assert.rejects(updateTransaction(ana.id, original.id, { ...CHANGES, amountCents: 'not a number' }))
})

test('deletes a user transaction', async () => {
  const original = await seedTransaction(ana.id)

  const deleted = await deleteTransaction(ana.id, original.id)

  assert.equal(deleted, true)
  assert.equal(await prisma.transaction.count(), 0)
})

test('does not delete a transaction of another user', async () => {
  const bia = await findOrCreateUser('2', 'Bia')
  const theirs = await seedTransaction(bia.id)

  const deleted = await deleteTransaction(ana.id, theirs.id)

  assert.equal(deleted, false)
  assert.equal(await prisma.transaction.count(), 1)
})
