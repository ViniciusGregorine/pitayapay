import { prisma } from './client.js'

export function findOrCreateUser(telegramId, name) {
  return prisma.user.upsert({
    where: { telegramId },
    update: {},
    create: { telegramId, name },
  })
}
