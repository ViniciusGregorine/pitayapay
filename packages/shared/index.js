export const CATEGORIES = [
  'Combustível',
  'Insumos agrícolas',
  'Mão de obra',
  'Manutenção de equipamentos',
  'Alimentação',
  'Transporte',
  'Vendas / Receitas',
  'Serviços recebidos',
  'Impostos e taxas',
  'Outros',
]

export const FALLBACK_CATEGORY = 'Outros'

export const TRANSACTION_TYPES = ['income', 'expense']

export const TYPE_LABELS = {
  income: 'Receita',
  expense: 'Despesa',
}

export function formatCents(amountCents) {
  return (amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Integer part: plain digits or pt-BR thousand groups ("1.250"); then up to 2 decimals after "," or ".".
const AMOUNT_PATTERN = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:[,.](\d{1,2}))?$/

// Parses what a user types as a value in reais, without going through floats. Returns null if invalid or not positive.
export function parseAmountToCents(text) {
  const match = text.replace(/R\$|\s/g, '').match(AMOUNT_PATTERN)
  if (!match) return null
  const [, reais, decimals = ''] = match
  const cents = Number(reais.replaceAll('.', '')) * 100 + Number(decimals.padEnd(2, '0'))
  return cents > 0 ? cents : null
}

export function centsToAmountInput(amountCents) {
  const reais = Math.trunc(amountCents / 100)
  const cents = String(amountCents % 100).padStart(2, '0')
  return `${reais},${cents}`
}
