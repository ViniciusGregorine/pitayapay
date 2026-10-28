import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeExtraction, createExtractor } from '../../src/llm/extractor.js'

test('normalizes a complete extraction and converts amount to cents', () => {
  const result = normalizeExtraction({
    type: 'expense',
    amount: 250.1,
    date: '2026-10-02',
    category: 'Combustível',
    description: ' Diesel ',
  })
  assert.deepEqual(result, {
    type: 'expense',
    amountCents: 25010,
    date: '2026-10-02',
    category: 'Combustível',
    description: 'Diesel',
    missing: [],
  })
})

test('reports missing required fields instead of trusting the model', () => {
  const result = normalizeExtraction({ type: 'gasto', amount: null, date: '02/10/2026' })
  assert.deepEqual(result.missing, ['type', 'amountCents', 'date'])
})

test('falls back to "Outros" for unknown categories', () => {
  assert.equal(normalizeExtraction({ category: 'Lazer' }).category, 'Outros')
})

test('rejects non-positive amounts and accepts comma decimals', () => {
  assert.equal(normalizeExtraction({ amount: -10 }).amountCents, null)
  assert.equal(normalizeExtraction({ amount: '12,5' }).amountCents, 1250)
})

test('sends the previous extraction back to the LLM in reais for corrections', async () => {
  let sent
  const extract = createExtractor(async (messages) => {
    sent = messages
    return JSON.stringify({ type: 'income', amount: 300, date: '2026-10-03', category: 'Outros', description: 'x' })
  })
  const previous = { type: 'income', amountCents: 20000, date: '2026-10-03', category: 'Outros', description: 'x' }
  const result = await extract('na verdade foi 300', '2026-10-03', previous)

  assert.match(sent[1].content, /"amount":200/)
  assert.equal(result.amountCents, 30000)
})

test('throws a descriptive error on invalid JSON', async () => {
  const extract = createExtractor(async () => 'not json')
  await assert.rejects(extract('oi', '2026-10-03'), /invalid JSON/)
})
