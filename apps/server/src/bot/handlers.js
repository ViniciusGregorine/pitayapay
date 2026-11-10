import { APP_TIMEZONE, MAX_VOICE_SECONDS } from '../config.js'
import { findOrCreateUser } from '../db/users.js'
import { createDraft, findPendingDraft, findPendingDraftById, updateDraft, cancelDraft } from '../db/drafts.js'
import { confirmDraftAsTransaction } from '../db/transactions.js'
import { createLoginToken } from '../db/loginTokens.js'
import * as msg from './messages.js'

function todayIso() {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(new Date())
}

function currentUser(ctx) {
  return findOrCreateUser(String(ctx.from.id), ctx.from.first_name || 'Usuário')
}

async function replyWithDraft(ctx, draft) {
  const { parsed } = draft
  if (parsed.missing.length > 0) {
    return ctx.reply(msg.askMissing(parsed.missing), { reply_markup: msg.cancelKeyboard(draft.id) })
  }
  return ctx.reply(msg.confirmPrompt(parsed), { reply_markup: msg.confirmKeyboard(draft.id) })
}

export function createHandlers({ extractTransaction, transcribe, downloadFile, publicUrl }) {
  async function onStart(ctx) {
    await currentUser(ctx)
    await ctx.reply(msg.WELCOME)
  }

  async function onPanel(ctx) {
    const user = await currentUser(ctx)
    const token = await createLoginToken(user.id)
    await ctx.reply(msg.panelLink(`${publicUrl}/?token=${token}`))
  }

  // A pending draft absorbs the next message as a correction or missing info (M3).
  async function registerText(ctx, text) {
    const user = await currentUser(ctx)
    const pending = await findPendingDraft(user.id)

    let parsed
    try {
      parsed = await extractTransaction(text, todayIso(), pending?.parsed)
    } catch (error) {
      console.error('Extraction failed:', error)
      return ctx.reply(msg.LLM_ERROR)
    }

    const draft = pending
      ? await updateDraft(pending.id, `${pending.rawText}\n${text}`, parsed)
      : await createDraft(user.id, text, parsed)
    await replyWithDraft(ctx, draft)
  }

  function onText(ctx) {
    return registerText(ctx, ctx.message.text)
  }

  // Once transcribed, a voice message follows exactly the text flow (RF05).
  async function onVoice(ctx) {
    if (ctx.message.voice.duration > MAX_VOICE_SECONDS) return ctx.reply(msg.voiceTooLong(MAX_VOICE_SECONDS))

    let text
    try {
      const file = await ctx.getFile()
      text = await transcribe(await downloadFile(file.file_path))
    } catch (error) {
      console.error('Voice transcription failed:', error)
      return ctx.reply(msg.VOICE_ERROR)
    }
    if (!text) return ctx.reply(msg.VOICE_NOT_UNDERSTOOD)

    // Echoing the transcript lets the user catch a misheard amount before confirming.
    await ctx.reply(msg.heardVoice(text))
    await registerText(ctx, text)
  }

  async function onDraftAction(ctx) {
    const [, action, draftId] = ctx.match
    console.debug('[debug] draft action', { action, draftId })
    const user = await currentUser(ctx)
    const draft = await findPendingDraftById(user.id, Number(draftId))
    console.debug('[debug] pending draft found:', Boolean(draft))
    if (!draft) return ctx.answerCallbackQuery(msg.DRAFT_NOT_FOUND)

    if (action === 'confirm') {
      if (draft.parsed.missing.length > 0) return ctx.answerCallbackQuery(msg.DRAFT_INCOMPLETE)
      await confirmDraftAsTransaction(draft)
      console.debug('[debug] transaction saved, editing message')
      await ctx.editMessageText(msg.savedMessage(draft.parsed))
      console.debug('[debug] message edited')
    } else if (action === 'cancel') {
      await cancelDraft(draft.id)
      await ctx.editMessageText(msg.cancelledMessage())
    } else {
      await ctx.reply(msg.ASK_CORRECTION)
    }
    await ctx.answerCallbackQuery()
  }

  return { onStart, onPanel, onText, onVoice, onDraftAction }
}
