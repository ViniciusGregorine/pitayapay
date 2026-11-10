const REQUIRED_ENV = [
  'TELEGRAM_TOKEN',
  'LLM_API_KEY',
  'LLM_BASE_URL',
  'LLM_MODEL',
  'JWT_SECRET',
  'DATABASE_URL',
  'TRANSCRIPTION_API_KEY',
  'TRANSCRIPTION_BASE_URL',
  'TRANSCRIPTION_MODEL',
]

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000
export const SESSION_TTL = '1h'
export const APP_TIMEZONE = 'America/Sao_Paulo'
// A transaction is said in a few seconds; longer voice notes are likely not one and cost more to transcribe.
export const MAX_VOICE_SECONDS = 60

export function loadConfig(env = process.env) {
  const missing = REQUIRED_ENV.filter((key) => !env[key])
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  const port = Number(env.PORT) || 3001
  return {
    telegramToken: env.TELEGRAM_TOKEN,
    llm: { apiKey: env.LLM_API_KEY, baseUrl: env.LLM_BASE_URL, model: env.LLM_MODEL },
    transcription: { apiKey: env.TRANSCRIPTION_API_KEY, baseUrl: env.TRANSCRIPTION_BASE_URL, model: env.TRANSCRIPTION_MODEL },
    jwtSecret: env.JWT_SECRET,
    port,
    publicUrl: env.PUBLIC_URL || `http://localhost:${port}`,
  }
}
