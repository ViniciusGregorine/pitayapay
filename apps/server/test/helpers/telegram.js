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

export const VOICE_FILE_PATH = 'voice/file_1.oga'

// Minimal grammY context for calling handlers directly.
export function fakeCtx({ text, voice, match, telegramId = 42, firstName = 'Ana' } = {}) {
  return {
    from: { id: telegramId, first_name: firstName },
    message: text ? { text } : voice && { voice },
    match,
    getFile: mock.fn(async () => ({ file_path: VOICE_FILE_PATH })),
    reply: mock.fn(async () => {}),
    editMessageText: mock.fn(async () => {}),
    answerCallbackQuery: mock.fn(async () => {}),
  }
}

function fakeResult(method, payload, messageId) {
  if (method === 'sendMessage') return { message_id: messageId, date: 0, chat: { id: payload.chat_id, type: 'private' }, text: payload.text }
  if (method === 'getFile') return { file_id: payload.file_id, file_unique_id: 'unique', file_path: VOICE_FILE_PATH }
  return true
}

// Intercepts every Telegram API call so a real grammY Bot runs fully offline.
export function captureTelegramApi(bot, { failOn = [] } = {}) {
  const calls = []
  bot.botInfo = BOT_INFO
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload })
    if (failOn.includes(method)) return { ok: false, error_code: 400, description: 'Bad Request: test failure' }
    return { ok: true, result: fakeResult(method, payload, calls.length) }
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

export function voiceUpdate(duration, telegramId = 42) {
  const voice = { file_id: 'voice-file', file_unique_id: 'unique', duration, mime_type: 'audio/ogg' }
  return {
    update_id: nextUpdateId++,
    message: { message_id: nextUpdateId, date: 0, chat: { id: telegramId, type: 'private' }, from: user(telegramId), voice },
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
