# Arquitetura PitayaPay

## Contents
- Estrutura do monorepo
- Modelo de dados
- Camadas e responsabilidades
- Rotas HTTP
- Deploy

## Estrutura do monorepo

pitayapay/
├─ apps/
│  ├─ server/          # Fastify + grammY + LLM + rotas /api
│  │  ├─ src/
│  │  │  ├─ bot/       # handlers do Telegram (grammY)
│  │  │  ├─ llm/       # prompt de extração, chamada à API, parser
│  │  │  ├─ db/        # Prisma client, queries
│  │  │  ├─ routes/    # rotas HTTP Fastify (/api/*)
│  │  │  └─ index.js   # entrypoint: inicia Fastify + bot
│  │  └─ package.json
│  └─ web/             # React (1 página, só leitura)
│     ├─ src/
│     │  └─ App.jsx    # lista de lançamentos + totais
│     └─ package.json
├─ packages/
│  └─ shared/          # tipos JS e lista de categorias
│     └─ index.js
├─ prisma/
│  └─ schema.prisma
└─ package.json        # npm workspaces

## Modelo de dados

model User {
  id          Int           @id @default(autoincrement())
  telegramId  String        @unique
  name        String
  createdAt   DateTime      @default(now())
  drafts      Draft[]
  transactions Transaction[]
  loginTokens LoginToken[]
}

model Draft {
  id         Int      @id @default(autoincrement())
  userId     Int
  rawText    String
  parsedJson String   -- JSON string do que a LLM extraiu
  status     String   -- "pending" | "confirmed" | "cancelled"
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])
}

model Transaction {
  id          Int      @id @default(autoincrement())
  userId      Int
  type        String   -- "income" | "expense"
  amountCents Int      -- valor em centavos (evita float)
  date        DateTime
  category    String
  description String
  rawText     String
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}

model LoginToken {
  token     String   @id
  userId    Int
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id])
}

## Camadas e responsabilidades

Camada	Arquivo(s)	Faz	Não faz
Bot handlers	apps/server/src/bot/	Recebe updates Telegram, chama llm/, db/, manda resposta	Lógica de negócio
LLM	apps/server/src/llm/	Monta prompt, chama API, valida JSON retornado	Acesso ao DB
DB	apps/server/src/db/	CRUD via Prisma	Lógica de bot ou LLM
Routes	apps/server/src/routes/	Endpoints REST para o front (GET /api/transactions, POST /api/auth)	Bot
Shared	packages/shared/	Lista de categorias, tipos JS reutilizados	Lógica de runtime
Rotas HTTP

GET /api/transactions # lista de lançamentos do usuário autenticado
POST /api/auth/magic # valida token magic link → retorna JWT curto
GET /* # serve o build estático do web/

Autenticação nas rotas: JWT de sessão curta (1h) gerado após validar o magic link.
Deploy

    Um único processo Node (apps/server) serve a API e os arquivos estáticos do web/ (Fastify @fastify/static).

    Bot via long polling (sem necessidade de domínio público no MVP).

    Variáveis de ambiente obrigatórias:

TELEGRAM_TOKEN=
LLM_API_KEY=
LLM_BASE_URL=https://routellm.abacus.ai/v1
LLM_MODEL=
JWT_SECRET=
DATABASE_URL=file:./dev.db
PORT=3000

