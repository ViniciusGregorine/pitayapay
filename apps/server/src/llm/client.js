// The only module that knows the LLM transport; swap it to change providers.
export function createLLMClient({ apiKey, baseUrl, model }) {
  return async function callLLM(messages) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`LLM request failed: ${response.status} ${body}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error(`LLM returned no content: ${JSON.stringify(data)}`)
    return content
  }
}
