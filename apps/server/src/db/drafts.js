import { prisma } from './client.js'

function toDraft(row) {
  return row && { ...row, parsed: JSON.parse(row.parsedJson) }
}

export async function createDraft(userId, rawText, parsed) {
  const row = await prisma.draft.create({
    data: { userId, rawText, parsedJson: JSON.stringify(parsed), status: 'pending' },
  })
  return toDraft(row)
}

export async function findPendingDraft(userId) {
  const row = await prisma.draft.findFirst({
    where: { userId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })
  return toDraft(row)
}

export async function findPendingDraftById(userId, draftId) {
  const row = await prisma.draft.findFirst({ where: { id: draftId, userId, status: 'pending' } })
  return toDraft(row)
}

export async function updateDraft(draftId, rawText, parsed) {
  const row = await prisma.draft.update({
    where: { id: draftId },
    data: { rawText, parsedJson: JSON.stringify(parsed) },
  })
  return toDraft(row)
}

export function cancelDraft(draftId) {
  return prisma.draft.update({ where: { id: draftId }, data: { status: 'cancelled' } })
}
