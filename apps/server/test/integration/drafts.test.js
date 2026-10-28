import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { findOrCreateUser } from '../../src/db/users.js'
import { createDraft, findPendingDraft, findPendingDraftById, updateDraft, cancelDraft } from '../../src/db/drafts.js'
import { resetDatabase, disconnectDatabase } from '../helpers/db.js'

const PARSED = { type: 'expense', amountCents: 5000, date: '2026-10-02', category: 'Outros', description: '', missing: [] }

let ana
let bia
beforeEach(async () => {
  await resetDatabase()
  ana = await findOrCreateUser('1', 'Ana')
  bia = await findOrCreateUser('2', 'Bia')
})
after(disconnectDatabase)

test('creates a pending draft and returns the parsed extraction as an object', async () => {
  const draft = await createDraft(ana.id, 'gastei 50', PARSED)

  assert.equal(draft.status, 'pending')
  assert.equal(draft.rawText, 'gastei 50')
  assert.deepEqual(draft.parsed, PARSED)
})

test('finds the most recent pending draft of the user', async () => {
  await createDraft(ana.id, 'primeiro', PARSED)
  const latest = await createDraft(ana.id, 'segundo', PARSED)

  const found = await findPendingDraft(ana.id)

  assert.equal(found.id, latest.id)
})

test('returns null when the user has no pending draft', async () => {
  const draft = await createDraft(ana.id, 'gastei 50', PARSED)
  await cancelDraft(draft.id)

  assert.equal(await findPendingDraft(ana.id), null)
  assert.equal(await findPendingDraft(bia.id), null)
})

test('finds a pending draft by id only for its owner', async () => {
  const draft = await createDraft(ana.id, 'gastei 50', PARSED)

  assert.equal((await findPendingDraftById(ana.id, draft.id)).id, draft.id)
  assert.equal(await findPendingDraftById(bia.id, draft.id), null)
})

test('does not find a cancelled draft by id', async () => {
  const draft = await createDraft(ana.id, 'gastei 50', PARSED)

  await cancelDraft(draft.id)

  assert.equal(await findPendingDraftById(ana.id, draft.id), null)
})

test('updates the raw text and the extraction of a draft', async () => {
  const draft = await createDraft(ana.id, 'gastei 50', PARSED)
  const corrected = { ...PARSED, amountCents: 6000 }

  const updated = await updateDraft(draft.id, 'gastei 50\nfoi 60', corrected)

  assert.equal(updated.rawText, 'gastei 50\nfoi 60')
  assert.deepEqual(updated.parsed, corrected)
  assert.equal(updated.status, 'pending')
})
