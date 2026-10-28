import { test, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/db/client.js'
import { createBot } from '../../src/bot/index.js'
import { createExtractor } from '../../src/llm/extractor.js'
import { resetDatabase, disconnectDatabase } from '../helpers/db.js'
import { buildTestServer } from '../helpers/server.js'
import { captureTelegramApi, deliver, textUpdate, buttonUpdate } from '../helpers/telegram.js'

// What the LLM answers for each user message, in its own shape (amount in reais).
const LLM_SCRIPT = {
  'gastei 250 de diesel ontem': { type: 'expense', amount: 250, date: '2026-10-01', category: 'Combustível', description: 'Diesel' },
  'vendi 30 caixas de tomate': { type: 'income', amount: null, date: '2026-10-02', category: 'Vendas / Receitas', description: 'Tomate' },
  'por 1.200': { type: 'income', amount: 1200, date: '2026-10-02', category: 'Vendas / Receitas', description: 'Tomate' },
  'paguei 100 pro ajudante': { type: 'expense', amount: 100, date: '2026-10-02', category: 'Mão de obra', description: 'Ajudante' },
  'na verdade foi 150': { type: 'expense', amount: 150, date: '2026-10-02', category: 'Mão de obra', description: 'Ajudante' },
}

async function scriptedLLM(messages) {
  const userMessage = messages.at(-1).content
  const text = Object.keys(LLM_SCRIPT).find((key) => userMessage.includes(key))
  return JSON.stringify(LLM_SCRIPT[text])
}

before(async () => {
  await resetDatabase()
  mock.method(console, 'debug', () => {})
})
after(disconnectDatabase)

test('MVP: a new user records 3 entries (one corrected) on Telegram and sees them on the web panel', async () => {
  const bot = createBot({ token: 'test-token', extractTransaction: createExtractor(scriptedLLM), publicUrl: 'http://test' })
  const calls = captureTelegramApi(bot)
  const app = await buildTestServer()
  const send = (text) => deliver(bot, textUpdate(text))
  const lastReply = () => calls.filter((c) => c.method === 'sendMessage').at(-1).payload
  const press = (label) => {
    const button = lastReply().reply_markup.inline_keyboard.flat().find((b) => b.text.includes(label))
    return deliver(bot, buttonUpdate(button.callback_data))
  }
  assert.equal(await prisma.user.count(), 0)

  await send('gastei 250 de diesel ontem')
  await press('Confirmar')

  await send('vendi 30 caixas de tomate')
  assert.match(lastReply().text, /preciso saber o valor/)
  await send('por 1.200')
  await press('Confirmar')

  await send('paguei 100 pro ajudante')
  await press('Corrigir')
  await send('na verdade foi 150')
  await press('Confirmar')

  await send('/painel')
  const magicToken = new URL(lastReply().text.split('\n').at(-1)).searchParams.get('token')
  const login = await app.inject({ method: 'POST', url: '/api/auth/magic', payload: { token: magicToken } })
  const panel = await app.inject({
    method: 'GET',
    url: '/api/transactions',
    headers: { authorization: `Bearer ${login.json().token}` },
  })
  await app.close()

  assert.equal(panel.statusCode, 200)
  const { transactions, totals } = panel.json()
  assert.deepEqual(
    transactions.map(({ type, amountCents, date, category, description }) => [type, amountCents, date, category, description]),
    [
      ['expense', 15000, '2026-10-02', 'Mão de obra', 'Ajudante'],
      ['income', 120000, '2026-10-02', 'Vendas / Receitas', 'Tomate'],
      ['expense', 25000, '2026-10-01', 'Combustível', 'Diesel'],
    ],
  )
  assert.deepEqual(totals, { incomeCents: 120000, expenseCents: 40000 })
})
