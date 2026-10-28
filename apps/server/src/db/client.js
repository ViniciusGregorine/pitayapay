import { PrismaClient } from '@prisma/client'

const PRISMA_NOT_FOUND = 'P2025'

export const prisma = new PrismaClient()

// For update/delete scoped by owner: "not found" also means "not yours", so both become null.
export async function nullIfNotFound(query) {
  try {
    return await query
  } catch (error) {
    if (error.code === PRISMA_NOT_FOUND) return null
    throw error
  }
}
