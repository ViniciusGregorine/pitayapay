1. Prisma Studio (interface visual)
cd /workspace && npx prisma studio
Abre no navegador e mostra as tabelas User, Draft e Transaction. No devcontainer, talvez seja preciso encaminhar a porta 5555.

2. Script Node (linha de comando)

Salve como apps/server/q.mjs e rode com cd apps/server && node q.mjs:
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient({ datasources: { db: { url: 'file:/workspace/prisma/dev.db' } } })
console.log('drafts', await p.draft.groupBy({ by: ['status'], _count: true
console.log(await p.transaction.findMany({ orderBy: { id: 'desc' }, take: 10 }))
await p.$disconnect()

3. SQL puro

O sqlite3 não está instalado no container. Instale com sudo apt-get install -y sqlite3 (pode ser bloqueado pelo firewall do devcontainer). Depois rode:
sqlite3 /workspace/prisma/dev.db "SELECT id, type, amountCents, category, description, createdAt FROM Transaction ORDER BY id DESC;"

Se preferir, rode direto aqui no prompt com ! <comando>, por exemplo ! cd /workspace && npx prisma studio.

Qual deles você prefere? Se quiser outro SQL, como totais por tipo ou lançamentos de hoje, me diga o que quer ver.