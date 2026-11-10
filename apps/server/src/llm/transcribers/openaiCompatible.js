const LANGUAGE = 'pt'

// Works with any provider exposing the OpenAI /audio/transcriptions API (Groq, OpenAI…): switching is an .env change.
export function createOpenAICompatibleTranscriber({ apiKey, baseUrl, model }) {
  return async function transcribe(audio) {
    const body = new FormData()
    body.append('model', model)
    body.append('language', LANGUAGE)
    body.append('response_format', 'json')
    // Telegram voice notes are OGG/Opus; providers detect the format from the file name.
    body.append('file', new Blob([audio], { type: 'audio/ogg' }), 'voice.ogg')

    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Transcription request failed: ${response.status} ${text}`)
    }

    const data = await response.json()
    if (typeof data.text !== 'string') throw new Error(`Transcription returned no text: ${JSON.stringify(data)}`)
    return data.text.trim()
  }
}
