import { test } from 'node:test'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SRC_DIR = fileURLToPath(new URL('../../src/', import.meta.url))
// The entrypoint boots the bot and the server, so it is exercised by running the app, not by tests.
const NOT_IMPORTABLE = ['index.js']

// Node only reports coverage for loaded files; importing every module keeps untested ones visible at 0%.
test('every source module is loaded so coverage reports untested files', async () => {
  const files = readdirSync(SRC_DIR, { recursive: true })
    .filter((file) => file.endsWith('.js') && !NOT_IMPORTABLE.includes(file))
  for (const file of files) await import(new URL(file, `file://${SRC_DIR}`))
})
