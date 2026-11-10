import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createFileDownloader } from '../../src/bot/telegramFiles.js'

const downloadFile = createFileDownloader('123:secret')

function fakeFetch(t, response) {
  return t.mock.method(globalThis, 'fetch', async () => response)
}

test('downloads the file bytes from the Telegram file URL', async (t) => {
  const fetch = fakeFetch(t, new Response(new Uint8Array([1, 2, 3])))

  const bytes = await downloadFile('voice/file_7.oga')

  assert.deepEqual(fetch.mock.calls[0].arguments, ['https://api.telegram.org/file/bot123:secret/voice/file_7.oga'])
  assert.deepEqual(bytes, new Uint8Array([1, 2, 3]))
})

test('a failed download names the status and file but never the bot token', async (t) => {
  fakeFetch(t, new Response('not found', { status: 404 }))

  const error = await downloadFile('voice/file_7.oga').catch((err) => err)

  assert.equal(error.message, 'Telegram file download failed: 404 (voice/file_7.oga)')
  assert.doesNotMatch(error.message, /secret/)
})
