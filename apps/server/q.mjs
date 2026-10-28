import { PrismaClient } from '@prisma/client'
const p = new PrismaClient({ datasources: { db: { url: 'file:/workspace/prisma/dev.db' } } })



console.log('drafts', await p.draft.groupBy({ by: ['status'], _count: true }))
console.log(await p.transaction.findMany({ orderBy: { id: 'desc' }, take: 10 }))
await p.$disconnect()