import { randomBytes } from 'node:crypto'
import { prisma } from './client.js'
import { MAGIC_LINK_TTL_MS } from '../config.js'

const PRISMA_NOT_FOUND = 'P2025'

export async function createLoginToken(userId) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS)
  await prisma.loginToken.create({ data: { token, userId, expiresAt } })
  return token
}

// Single use: deleting and reading in one step means a token can't be redeemed twice.
export async function consumeLoginToken(token) {
  try {
    const row = await prisma.loginToken.delete({ where: { token } })
    return row.expiresAt > new Date() ? row.userId : null
  } catch (error) {
    if (error.code === PRISMA_NOT_FOUND) return null
    throw error
  }
}
