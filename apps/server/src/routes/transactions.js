import { listTransactions } from '../db/transactions.js'

function sumByType(transactions, type) {
  return transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amountCents, 0)
}

export async function transactionRoutes(app) {
  app.get('/api/transactions', { onRequest: [app.authenticate] }, async (request) => {
    const transactions = await listTransactions(request.user.sub)
    return {
      transactions: transactions.map(({ id, type, amountCents, date, category, description }) => ({
        id,
        type,
        amountCents,
        date: date.toISOString().slice(0, 10),
        category,
        description,
      })),
      totals: {
        incomeCents: sumByType(transactions, 'income'),
        expenseCents: sumByType(transactions, 'expense'),
      },
    }
  })
}
