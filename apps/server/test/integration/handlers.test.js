import { test, before, beforeEach, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/db/client.js'
import { createHandlers } from '../../src/bot/handlers.js'
import { consumeLoginToken } from '../../src/db/loginTokens.js'
import * as msg from '../../src/bot/messages.js'
import { resetDatabase, disconnectDatabase } from '../helpers/db.js'
import { fakeCtx } from '../helpers/telegram.js'

const COMPLETE = { type: 'expense', amountCents: 25000, date: '2026-10-02', category: 'Combustível', description: 'Diesel', missing: [] }
const MISSING_AMOUNT = { ...COMPLETE, amountCents: null, missing: ['amountCents'] }

// Silences the temporary [debug] logs of the bot handlers.
before(() => mock.method(console, 'debug', () => {}))
beforeEach(resetDatabase)
after(disconnectDatabase)

function handlersWith(extractTransaction = async () => COMPLETE) {
  return createHandlers({ extractTransaction, publicUrl: 'http://test' })
}

function firstReply(ctx) {
  return ctx.reply.mock.calls[0].arguments
}

async function createPendingDraft(handlers, telegramId = 42) {
  await handlers.onText(fakeCtx({ text: 'gastei 250 de diesel', telegramId }))
  return prisma.draft.findFirstOrThrow({ orderBy: { id: 'desc' } })
}

function press(handlers, action, draftId, telegramId = 42) {
  const ctx = fakeCtx({ match: [`${action}:${draftId}`, action, String(draftId)], telegramId })
  return handlers.onDraftAction(ctx).then(() => ctx)
}

test('/start registers the user with the Telegram name and sends the welcome', async () => {
  const ctx = fakeCtx({ firstName: 'Ana' })

  await handlersWith().onStart(ctx)

  assert.deepEqual(firstReply(ctx), [msg.WELCOME])
  const user = await prisma.user.findUniqueOrThrow({ where: { telegramId: '42' } })
  assert.equal(user.name, 'Ana')
})

test('/painel replies with a single-use magic link for the user', async () => {
  const ctx = fakeCtx()

  await handlersWith().onPanel(ctx)

  const [text] = firstReply(ctx)
  const token = text.match(/http:\/\/test\/\?token=(\S+)$/)[1]
  const user = await prisma.user.findUniqueOrThrow({ where: { telegramId: '42' } })
  assert.equal(await consumeLoginToken(token), user.id)
})

test('a complete message becomes a pending draft with confirm/correct/cancel buttons', async () => {
  const ctx = fakeCtx({ text: 'gastei 250 de diesel' })

  await handlersWith().onText(ctx)

  const draft = await prisma.draft.findFirstOrThrow()
  assert.equal(draft.status, 'pending')
  assert.equal(draft.rawText, 'gastei 250 de diesel')
  assert.deepEqual(firstReply(ctx), [msg.confirmPrompt(COMPLETE), { reply_markup: msg.confirmKeyboard(draft.id) }])
})

test('an incomplete message asks only for what is missing and offers just cancel', async () => {
  const ctx = fakeCtx({ text: 'gastei de diesel' })

  await handlersWith(async () => MISSING_AMOUNT).onText(ctx)

  const draft = await prisma.draft.findFirstOrThrow()
  assert.deepEqual(firstReply(ctx), [msg.askMissing(['amountCents']), { reply_markup: msg.cancelKeyboard(draft.id) }])
})

test('extracts with the São Paulo date, even when UTC is already the next day', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-03T02:00:00Z') })
  const extract = mock.fn(async () => COMPLETE)

  await handlersWith(extract).onText(fakeCtx({ text: 'gastei 250 hoje' }))

  assert.deepEqual(extract.mock.calls[0].arguments, ['gastei 250 hoje', '2026-10-02', undefined])
})

test('a message while a draft is pending corrects that draft instead of creating another', async () => {
  const extract = mock.fn(async () => MISSING_AMOUNT)
  const handlers = handlersWith(extract)
  await handlers.onText(fakeCtx({ text: 'gastei de diesel' }))
  extract.mock.mockImplementation(async () => COMPLETE)
  const ctx = fakeCtx({ text: 'foi 250' })

  await handlers.onText(ctx)

  assert.deepEqual(extract.mock.calls[1].arguments[2], MISSING_AMOUNT)
  const drafts = await prisma.draft.findMany()
  assert.equal(drafts.length, 1)
  assert.equal(drafts[0].rawText, 'gastei de diesel\nfoi 250')
  assert.deepEqual(JSON.parse(drafts[0].parsedJson), COMPLETE)
  assert.deepEqual(firstReply(ctx), [msg.confirmPrompt(COMPLETE), { reply_markup: msg.confirmKeyboard(drafts[0].id) }])
})

test('replies with a friendly message and saves nothing when the LLM fails', async (t) => {
  const logged = t.mock.method(console, 'error', () => {})
  const ctx = fakeCtx({ text: 'oi' })

  await handlersWith(async () => { throw new Error('timeout') }).onText(ctx)

  assert.deepEqual(firstReply(ctx), [msg.LLM_ERROR])
  assert.equal(logged.mock.callCount(), 1)
  assert.equal(await prisma.draft.count(), 0)
})

test('confirm saves the transaction and replaces the summary with the saved message', async () => {
  const handlers = handlersWith()
  const draft = await createPendingDraft(handlers)

  const ctx = await press(handlers, 'confirm', draft.id)

  const transaction = await prisma.transaction.findFirstOrThrow()
  assert.equal(transaction.amountCents, 25000)
  assert.deepEqual(ctx.editMessageText.mock.calls[0].arguments, [msg.savedMessage(COMPLETE)])
  assert.equal(ctx.answerCallbackQuery.mock.callCount(), 1)
})

test('pressing confirm twice saves only one transaction', async () => {
  const handlers = handlersWith()
  const draft = await createPendingDraft(handlers)
  await press(handlers, 'confirm', draft.id)

  const ctx = await press(handlers, 'confirm', draft.id)

  assert.equal(await prisma.transaction.count(), 1)
  assert.deepEqual(ctx.answerCallbackQuery.mock.calls[0].arguments, [msg.DRAFT_NOT_FOUND])
})

test('confirm is refused while required fields are missing', async () => {
  const handlers = handlersWith(async () => MISSING_AMOUNT)
  const draft = await createPendingDraft(handlers)

  const ctx = await press(handlers, 'confirm', draft.id)

  assert.equal(await prisma.transaction.count(), 0)
  assert.deepEqual(ctx.answerCallbackQuery.mock.calls[0].arguments, [msg.DRAFT_INCOMPLETE])
})

test('cancel discards the draft without saving a transaction', async () => {
  const handlers = handlersWith()
  const draft = await createPendingDraft(handlers)

  const ctx = await press(handlers, 'cancel', draft.id)

  const { status } = await prisma.draft.findUniqueOrThrow({ where: { id: draft.id } })
  assert.equal(status, 'cancelled')
  assert.equal(await prisma.transaction.count(), 0)
  assert.deepEqual(ctx.editMessageText.mock.calls[0].arguments, [msg.cancelledMessage()])
})

test('correct asks for the correction in free text and keeps the draft pending', async () => {
  const handlers = handlersWith()
  const draft = await createPendingDraft(handlers)

  const ctx = await press(handlers, 'correct', draft.id)

  assert.deepEqual(firstReply(ctx), [msg.ASK_CORRECTION])
  const { status } = await prisma.draft.findUniqueOrThrow({ where: { id: draft.id } })
  assert.equal(status, 'pending')
})

test('a user cannot confirm the draft of another user', async () => {
  const handlers = handlersWith()
  const draft = await createPendingDraft(handlers, 1)

  const ctx = await press(handlers, 'confirm', draft.id, 2)

  assert.equal(await prisma.transaction.count(), 0)
  assert.deepEqual(ctx.answerCallbackQuery.mock.calls[0].arguments, [msg.DRAFT_NOT_FOUND])
})

test('an old button of a finished draft does not act on the current pending draft', async () => {
  const handlers = handlersWith()
  const finished = await createPendingDraft(handlers)
  await press(handlers, 'confirm', finished.id)
  const current = await createPendingDraft(handlers)

  const ctx = await press(handlers, 'confirm', finished.id)

  assert.equal(await prisma.transaction.count(), 1)
  const { status } = await prisma.draft.findUniqueOrThrow({ where: { id: current.id } })
  assert.equal(status, 'pending')
  assert.deepEqual(ctx.answerCallbackQuery.mock.calls[0].arguments, [msg.DRAFT_NOT_FOUND])
})
