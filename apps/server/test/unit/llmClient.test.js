import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLLMClient } from '../../src/llm/client.js'

const callLLM = createLLMClient({ apiKey: 'key', baseUrl: 'http://llm/v1', model: 'gpt-x' })
const MESSAGES = [{ role: 'user', content: 'oi' }]

function fakeFetch(t, { status = 200, body }) {
  return t.mock.method(globalThis, 'fetch', async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }))
}

test('posts a deterministic JSON-mode chat completion and returns the content', async (t) => {
  const fetch = fakeFetch(t, { body: { choices: [{ message: { content: '{"type":"income"}' } }] } })

  const content = await callLLM(MESSAGES)

  const [url, options] = fetch.mock.calls[0].arguments
  assert.equal(content, '{"type":"income"}')
  assert.equal(url, 'http://llm/v1/chat/completions')
  assert.equal(options.headers.Authorization, 'Bearer key')
  assert.deepEqual(JSON.parse(options.body), {
    model: 'gpt-x',
    messages: MESSAGES,
    temperature: 0,
    response_format: { type: 'json_object' },
  })
})

test('throws with status and body when the provider fails', async (t) => {
  fakeFetch(t, { status: 429, body: 'rate limited' })

  await assert.rejects(callLLM(MESSAGES), /LLM request failed: 429 rate limited/)
})

test('throws when the provider returns no content', async (t) => {
  fakeFetch(t, { body: { choices: [] } })

  await assert.rejects(callLLM(MESSAGES), /LLM returned no content/)
})
