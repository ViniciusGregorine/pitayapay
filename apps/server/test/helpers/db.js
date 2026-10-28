import { prisma } from '../../src/db/client.js'

// Children first, so foreign keys never block the cleanup.
export async function resetDatabase() {
  await prisma.$transaction([
    prisma.loginToken.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.draft.deleteMany(),
    prisma.user.deleteMany(),
  ])
}

export function disconnectDatabase() {
  return prisma.$disconnect()
}

export function seedTransaction(userId, overrides = {}) {
  return prisma.transaction.create({
    data: {
      userId,
      type: 'expense',
      amountCents: 1000,
      date: new Date('2026-10-01'),
      category: 'Outros',
      description: '',
      rawText: '',
      ...overrides,
    },
  })
}
