import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/db/client.js'
import { findOrCreateUser } from '../../src/db/users.js'
import { createDraft } from '../../src/db/drafts.js'
import { confirmDraftAsTransaction, listTransactions } from '../../src/db/transactions.js'
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
