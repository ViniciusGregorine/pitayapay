import { Bot } from 'grammy'
import { createHandlers } from './handlers.js'
import { GENERIC_ERROR } from './messages.js'

export function createBot({ token, extractTransaction, publicUrl }) {
  const bot = new Bot(token)
  const handlers = createHandlers({ extractTransaction, publicUrl })

  bot.command('start', handlers.onStart)
  bot.command('painel', handlers.onPanel)
  bot.callbackQuery(/^(confirm|correct|cancel):(\d+)$/, handlers.onDraftAction)
  bot.on('message:text', handlers.onText)

  bot.catch(async ({ ctx, error }) => {
    console.error(`Bot error on update ${ctx.update.update_id}:`, error)
    try {
      await ctx.reply(GENERIC_ERROR)
    } catch (replyError) {
      console.error('Failed to send error message to user:', replyError)
    }
  })

  return bot
}
