import { CATEGORIES, TRANSACTION_TYPES } from '@pitayapay/shared'
import { listTransactions, updateTransaction, deleteTransaction } from '../db/transactions.js'

const NOT_FOUND = { error: 'Lançamento não encontrado.' }

const idParamsSchema = {
  type: 'object',
  properties: { id: { type: 'integer' } },
}

const transactionBodySchema = {
  type: 'object',
  required: ['type', 'amountCents', 'date', 'category', 'description'],
  additionalProperties: false,
  properties: {
    type: { enum: TRANSACTION_TYPES },
    amountCents: { type: 'integer', minimum: 1 },
    date: { type: 'string', format: 'date' },
    category: { enum: CATEGORIES },
    description: { type: 'string' },
  },
}

function sumByType(transactions, type) {
  return transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amountCents, 0)
}

function toResponse({ id, type, amountCents, date, category, description }) {
  return { id, type, amountCents, date: date.toISOString().slice(0, 10), category, description }
}

export async function transactionRoutes(app) {
  app.get('/api/transactions', { onRequest: [app.authenticate] }, async (request) => {
    const transactions = await listTransactions(request.user.sub)
    return {
      transactions: transactions.map(toResponse),
      totals: {
        incomeCents: sumByType(transactions, 'income'),
        expenseCents: sumByType(transactions, 'expense'),
      },
    }
  })

  app.put(
    '/api/transactions/:id',
    { onRequest: [app.authenticate], schema: { params: idParamsSchema, body: transactionBodySchema } },
    async (request, reply) => {
      const updated = await updateTransaction(request.user.sub, request.params.id, request.body)
      return updated ? toResponse(updated) : reply.code(404).send(NOT_FOUND)
    },
  )

  app.delete(
    '/api/transactions/:id',
    { onRequest: [app.authenticate], schema: { params: idParamsSchema } },
    async (request, reply) => {
      const deleted = await deleteTransaction(request.user.sub, request.params.id)
      return deleted ? reply.code(204).send() : reply.code(404).send(NOT_FOUND)
    },
  )
}
