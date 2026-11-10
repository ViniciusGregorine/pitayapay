import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createOpenAICompatibleTranscriber } from '../../src/llm/transcribers/openaiCompatible.js'

const transcribe = createOpenAICompatibleTranscriber({ apiKey: 'key', baseUrl: 'http://stt/v1', model: 'whisper-x' })
const AUDIO = new Uint8Array([79, 103, 103, 83])

function fakeFetch(t, { status = 200, body }) {
  return t.mock.method(globalThis, 'fetch', async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }))
}

test('posts the voice note as an OGG file for Portuguese transcription and returns the trimmed text', async (t) => {
  const fetch = fakeFetch(t, { body: { text: ' Gastei 250 reais de diesel. ' } })

  const text = await transcribe(AUDIO)

  const [url, { method, headers, body }] = fetch.mock.calls[0].arguments
  const file = body.get('file')
  assert.equal(text, 'Gastei 250 reais de diesel.')
  assert.equal(url, 'http://stt/v1/audio/transcriptions')
  assert.equal(method, 'POST')
  assert.deepEqual(headers, { Authorization: 'Bearer key' })
  assert.deepEqual([body.get('model'), body.get('language'), body.get('response_format')], ['whisper-x', 'pt', 'json'])
  assert.deepEqual([file.name, file.type], ['voice.ogg', 'audio/ogg'])
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), AUDIO)
})

test('throws with status and body when the provider fails', async (t) => {
  fakeFetch(t, { status: 429, body: 'rate limited' })

  await assert.rejects(transcribe(AUDIO), /Transcription request failed: 429 rate limited/)
})

test('throws when the provider returns no text', async (t) => {
  fakeFetch(t, { body: { error: 'oops' } })

  await assert.rejects(transcribe(AUDIO), /Transcription returned no text: {"error":"oops"}/)
})
