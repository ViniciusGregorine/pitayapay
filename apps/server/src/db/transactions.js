import { prisma } from './client.js'

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
