import { test, before, beforeEach, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/db/client.js'
import { createBot } from '../../src/bot/index.js'
import * as msg from '../../src/bot/messages.js'
import { resetDatabase, disconnectDatabase } from '../helpers/db.js'
import { captureTelegramApi, deliver, textUpdate, buttonUpdate } from '../helpers/telegram.js'

const COMPLETE = { type: 'expense', amountCents: 25000, date: '2026-10-02', category: 'Combustível', description: 'Diesel', missing: [] }

// Silences the temporary [debug] logs of the bot.
before(() => mock.method(console, 'debug', () => {}))
beforeEach(resetDatabase)
after(disconnectDatabase)

function testBot(options) {
  const bot = createBot({ token: 'test-token', extractTransaction: async () => COMPLETE, publicUrl: 'http://test' })
  const calls = captureTelegramApi(bot, options)
  return { bot, calls }
}

function sentTexts(calls) {
  return calls.filter((c) => c.method === 'sendMessage').map((c) => c.payload.text)
}

test('routes /start to the welcome message', async () => {
  const { bot, calls } = testBot()

  await deliver(bot, textUpdate('/start'))

  assert.deepEqual(sentTexts(calls), [msg.WELCOME])
})

test('routes /painel to the magic link', async () => {
  const { bot, calls } = testBot()

  await deliver(bot, textUpdate('/painel'))

  assert.match(sentTexts(calls)[0], /http:\/\/test\/\?token=/)
})

test('routes free text to the extraction and the draft buttons to their actions', async () => {
  const { bot, calls } = testBot()
  await deliver(bot, textUpdate('gastei 250 de diesel'))
  const draft = await prisma.draft.findFirstOrThrow()

  await deliver(bot, buttonUpdate(`confirm:${draft.id}`))

  assert.deepEqual(sentTexts(calls), [msg.confirmPrompt(COMPLETE)])
  assert.equal(calls.find((c) => c.method === 'editMessageText').payload.text, msg.savedMessage(COMPLETE))
  assert.equal(await prisma.transaction.count(), 1)
})

test('ignores buttons with unknown actions', async () => {
  const { bot, calls } = testBot()

  await deliver(bot, buttonUpdate('delete:1'))

  assert.equal(calls.some((c) => c.method === 'sendMessage' || c.method === 'editMessageText'), false)
})

test('logs unexpected errors and tells the user something went wrong', async (t) => {
  const logged = t.mock.method(console, 'error', () => {})
  const { bot, calls } = testBot({ failOn: ['editMessageText'] })
  await deliver(bot, textUpdate('gastei 250 de diesel'))
  const draft = await prisma.draft.findFirstOrThrow()

  await deliver(bot, buttonUpdate(`cancel:${draft.id}`))

  assert.equal(sentTexts(calls).at(-1), msg.GENERIC_ERROR)
  assert.match(logged.mock.calls[0].arguments[0], /^Bot error on update \d+:$/)
})

test('logs when even the error message cannot be delivered', async (t) => {
  const logged = t.mock.method(console, 'error', () => {})
  const { bot } = testBot({ failOn: ['sendMessage'] })

  await deliver(bot, textUpdate('/start'))

  assert.deepEqual(logged.mock.calls.map((c) => c.arguments[0]).slice(-1), ['Failed to send error message to user:'])
})
