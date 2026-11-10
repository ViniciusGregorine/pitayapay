const TELEGRAM_FILE_URL = 'https://api.telegram.org/file/bot'

// The download URL carries the bot token, so it never goes into errors or logs.
export function createFileDownloader(token) {
  return async function downloadFile(filePath) {
    const response = await fetch(`${TELEGRAM_FILE_URL}${token}/${filePath}`)
    if (!response.ok) throw new Error(`Telegram file download failed: ${response.status} (${filePath})`)
    return new Uint8Array(await response.arrayBuffer())
  }
}
