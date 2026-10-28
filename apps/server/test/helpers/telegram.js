import { mock } from 'node:test'

const BOT_INFO = {
  id: 1,
  is_bot: true,
  first_name: 'PitayaPay',
  username: 'pitayapay_test_bot',
  can_join_groups: false,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
}

// Minimal grammY context for calling handlers directly.
export function fakeCtx({ text, match, telegramId = 42, firstName = 'Ana' } = {}) {
  return {
    from: { id: telegramId, first_name: firstName },
    message: text && { text },
    match,
    reply: mock.fn(async () => {}),
    editMessageText: mock.fn(async () => {}),
    answerCallbackQuery: mock.fn(async () => {}),
  }
}

// Intercepts every Telegram API call so a real grammY Bot runs fully offline.
export function captureTelegramApi(bot, { failOn = [] } = {}) {
  const calls = []
  bot.botInfo = BOT_INFO
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload })
    if (failOn.includes(method)) return { ok: false, error_code: 400, description: 'Bad Request: test failure' }
    const result = method === 'sendMessage' ? { message_id: calls.length, date: 0, chat: { id: payload.chat_id, type: 'private' }, text: payload.text } : true
    return { ok: true, result }
  })
  return calls
}

let nextUpdateId = 1

function user(telegramId) {
  return { id: telegramId, is_bot: false, first_name: 'Ana' }
}

export function textUpdate(text, telegramId = 42) {
  const entities = text.startsWith('/') ? [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }] : undefined
  return {
    update_id: nextUpdateId++,
    message: { message_id: nextUpdateId, date: 0, chat: { id: telegramId, type: 'private' }, from: user(telegramId), text, entities },
  }
}

export function buttonUpdate(data, telegramId = 42) {
  return {
    update_id: nextUpdateId++,
    callback_query: {
      id: String(nextUpdateId),
      from: user(telegramId),
      chat_instance: 'test',
      data,
      message: { message_id: 1, date: 0, chat: { id: telegramId, type: 'private' }, text: 'resumo' },
    },
  }
}

// Mirrors long polling: middleware errors go to the handler registered with bot.catch.
export async function deliver(bot, update) {
  try {
    await bot.handleUpdate(update)
  } catch (error) {
    await bot.errorHandler(error)
  }
}
