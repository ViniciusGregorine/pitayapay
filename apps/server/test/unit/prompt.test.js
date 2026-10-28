import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSystemPrompt, buildUserMessage } from '../../src/llm/prompt.js'

test('system prompt receives today and the allowed categories as parameters', () => {
  const prompt = buildSystemPrompt(['Sementes', 'Outros'], '2026-10-28')

  assert.match(prompt, /Hoje é 2026-10-28\./)
  assert.match(prompt, /Categorias permitidas: "Sementes", "Outros"\./)
})

test('user message is the raw text when there is no previous extraction', () => {
  assert.equal(buildUserMessage('gastei 50', null), 'gastei 50')
})

test('user message carries the previous extraction for corrections', () => {
  const message = buildUserMessage('foi 60', { amount: 50 })

  assert.match(message, /Extração anterior:\n\{"amount":50\}/)
  assert.match(message, /foi 60/)
})
