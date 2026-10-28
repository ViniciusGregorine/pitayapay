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
