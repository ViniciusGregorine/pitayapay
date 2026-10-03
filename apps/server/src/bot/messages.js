import { InlineKeyboard } from 'grammy'
import { TYPE_LABELS, formatCents } from '@pitayapay/shared'

const FIELD_LABELS = {
  type: 'se é receita ou despesa',
  amountCents: 'o valor',
  date: 'a data',
}

export const WELCOME = `Olá! Eu sou o PitayaPay 🌵

Me mande uma mensagem descrevendo uma movimentação, por exemplo:
"Gastei 250 reais de diesel ontem"
"Vendi 30 caixas de tomate por 1.200"

Eu organizo o lançamento e você confirma antes de salvar.
Use /painel para ver seus lançamentos na web.`

export const ASK_CORRECTION = '✏️ Me diga o que corrigir, em texto livre.'
export const LLM_ERROR = '😕 Não consegui interpretar sua mensagem agora. Tente novamente em instantes.'
export const GENERIC_ERROR = '😕 Algo deu errado do meu lado. Tente novamente em instantes.'
export const DRAFT_NOT_FOUND = 'Este lançamento já foi finalizado.'
export const DRAFT_INCOMPLETE = 'Ainda faltam informações neste lançamento.'

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export function draftSummary(parsed) {
  return [
    `Tipo: ${TYPE_LABELS[parsed.type]}`,
    `Valor: ${formatCents(parsed.amountCents)}`,
    `Data: ${formatDate(parsed.date)}`,
    `Categoria: ${parsed.category}`,
    `Descrição: ${parsed.description || '—'}`,
  ].join('\n')
}

export function askMissing(missing) {
  const fields = missing.map((field) => FIELD_LABELS[field])
  return `Para registrar, preciso saber ${fields.join(' e ')}. Pode me dizer?`
}

export function confirmPrompt(parsed) {
  return `Confere o lançamento?\n\n${draftSummary(parsed)}`
}

export function confirmKeyboard(draftId) {
  return new InlineKeyboard()
    .text('✅ Confirmar', `confirm:${draftId}`)
    .text('✏️ Corrigir', `correct:${draftId}`)
    .text('❌ Cancelar', `cancel:${draftId}`)
}

export function cancelKeyboard(draftId) {
  return new InlineKeyboard().text('❌ Cancelar', `cancel:${draftId}`)
}

export function savedMessage(parsed) {
  return `✅ Lançamento salvo!\n\n${draftSummary(parsed)}`
}

export function cancelledMessage() {
  return '❌ Lançamento cancelado.'
}

export function panelLink(url) {
  return `Seu link de acesso ao painel (válido por 15 minutos, uso único):\n${url}`
}
