import { prisma, nullIfNotFound } from './client.js'

// Confirming a draft and saving the transaction must happen together (M4).
export function confirmDraftAsTransaction(draft) {
  const { type, amountCents, date, category, description } = draft.parsed
  return prisma.$transaction(async (tx) => {
    await tx.draft.update({ where: { id: draft.id }, data: { status: 'confirmed' } })
    return tx.transaction.create({
      data: {
        userId: draft.userId,
        type,
        amountCents,
        date: new Date(date),
        category,
        description,
        rawText: draft.rawText,
      },
    })
  })
}

export function listTransactions(userId) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
  })
}

// rawText is kept as the record of what the user originally sent.
export function updateTransaction(userId, id, { type, amountCents, date, category, description }) {
  return nullIfNotFound(
    prisma.transaction.update({
      where: { id, userId },
      data: { type, amountCents, date: new Date(date), category, description },
    }),
  )
}

export async function deleteTransaction(userId, id) {
  const deleted = await nullIfNotFound(prisma.transaction.delete({ where: { id, userId } }))
  return deleted !== null
}
