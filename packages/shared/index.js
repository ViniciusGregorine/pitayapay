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
