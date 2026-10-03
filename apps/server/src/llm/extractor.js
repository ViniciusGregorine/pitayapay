import { CATEGORIES, FALLBACK_CATEGORY, TRANSACTION_TYPES } from '@pitayapay/shared'
import { buildSystemPrompt, buildUserMessage } from './prompt.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function toCents(amount) {
  const value = typeof amount === 'string' ? Number(amount.replace(',', '.')) : amount
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null
}

function toIsoDate(date) {
  return typeof date === 'string' && ISO_DATE.test(date) && !Number.isNaN(Date.parse(date)) ? date : null
}

// Validates the raw LLM output; never trust the model's shape or its own idea of what's missing.
export function normalizeExtraction(raw, categories = CATEGORIES) {
  const extraction = {
    type: TRANSACTION_TYPES.includes(raw.type) ? raw.type : null,
    amountCents: toCents(raw.amount),
    date: toIsoDate(raw.date),
    category: categories.includes(raw.category) ? raw.category : FALLBACK_CATEGORY,
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
  }
  extraction.missing = ['type', 'amountCents', 'date'].filter((field) => extraction[field] === null)
  return extraction
}

function toLLMShape({ type, amountCents, date, category, description }) {
  return { type, amount: amountCents === null ? null : amountCents / 100, date, category, description }
}

export function createExtractor(callLLM, categories = CATEGORIES) {
  return async function extractTransaction(text, today, previous = null) {
    const messages = [
      { role: 'system', content: buildSystemPrompt(categories, today) },
      { role: 'user', content: buildUserMessage(text, previous && toLLMShape(previous)) },
    ]
    const content = await callLLM(messages)

    let raw
    try {
      raw = JSON.parse(content)
    } catch (error) {
      throw new Error(`LLM returned invalid JSON: ${content}`, { cause: error })
    }
    return normalizeExtraction(raw, categories)
  }
}
