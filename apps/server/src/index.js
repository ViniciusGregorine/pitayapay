import { loadConfig } from './config.js'
import { createLLMClient } from './llm/client.js'
import { createExtractor } from './llm/extractor.js'
import { createBot } from './bot/index.js'
import { buildServer } from './server.js'
import { log } from 'node:console'

const config = loadConfig()

const extractTransaction = createExtractor(createLLMClient(config.llm))
const bot = createBot({ token: config.telegramToken, extractTransaction, publicUrl: config.publicUrl })
const app = await buildServer({ jwtSecret: config.jwtSecret })

await app.listen({ port: config.port, host: '0.0.0.0' })

// Long polling: no public domain needed for the MVP.

app.log.debug(`Starting bot with API KEY = ${config.telegramToken}`)
bot.start({ onStart: (me) => app.log.info(`Bot @${me.username} started`) }).catch((error) => {
  app.log.error({ err: error }, 'Telegram bot stopped')
  process.exit(1)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await bot.stop()
    await app.close()
    process.exit(0)
  })
}
