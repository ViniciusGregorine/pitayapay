import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig } from '../../src/config.js'

const ENV = {
  TELEGRAM_TOKEN: 'tg',
  LLM_API_KEY: 'key',
  LLM_BASE_URL: 'http://llm',
  LLM_MODEL: 'model',
  JWT_SECRET: 'secret',
  DATABASE_URL: 'file:./x.db',
}

test('builds the config from the environment', () => {
  const config = loadConfig({ ...ENV, PORT: '3000', PUBLIC_URL: 'https://pitaya.example' })

  assert.deepEqual(config, {
    telegramToken: 'tg',
    llm: { apiKey: 'key', baseUrl: 'http://llm', model: 'model' },
    jwtSecret: 'secret',
    port: 3000,
    publicUrl: 'https://pitaya.example',
  })
})

test('defaults the port and derives the public url from it', () => {
  const config = loadConfig(ENV)

  assert.equal(config.port, 3001)
  assert.equal(config.publicUrl, 'http://localhost:3001')
})

test('fails fast naming every missing required variable', (t) => {
  const exit = t.mock.method(process, 'exit', () => { throw new Error('exit') })
  const error = t.mock.method(console, 'error', () => {})
  const { TELEGRAM_TOKEN, JWT_SECRET, ...incomplete } = ENV

  assert.throws(() => loadConfig(incomplete), /exit/)
  assert.deepEqual(exit.mock.calls[0].arguments, [1])
  assert.equal(error.mock.calls[0].arguments[0], 'Missing required env vars: TELEGRAM_TOKEN, JWT_SECRET')
})
