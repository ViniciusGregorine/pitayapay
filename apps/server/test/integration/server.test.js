import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Writable } from 'node:stream'
import { buildServer } from '../../src/server.js'

function captureLogs() {
  const entries = []
  const stream = new Writable({
    write(chunk, _encoding, done) {
      entries.push(JSON.parse(chunk))
      done()
    },
  })
  return { entries, stream }
}

test('keeps unexpected errors as a logged 500 instead of reporting them as invalid data', async () => {
  const logs = captureLogs()
  const app = await buildServer({ jwtSecret: 'test-secret', logger: { stream: logs.stream } })
  app.get('/fails', async () => {
    throw new Error('database is down')
  })

  const response = await app.inject({ method: 'GET', url: '/fails' })

  assert.equal(response.statusCode, 500)
  assert.equal(response.json().error, 'Internal Server Error')
  const errorLogs = logs.entries.filter((entry) => entry.level >= 50).map((entry) => entry.err.message)
  assert.deepEqual(errorLogs, ['database is down'])
  await app.close()
})
