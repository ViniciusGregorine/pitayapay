# Padrões de teste — PitayaPay

Todos os exemplos abaixo foram executados contra o código atual. Copie e adapte.

## Contents
- Estrutura de pastas
- Unit: função pura
- Unit: extrator com LLM fake
- Integration: db/
- Integration: rotas Fastify
- Integration: handlers do bot
- E2E: critério de pronto do MVP
- Tempo e fuso horário
- Respostas reais da LLM como fixtures
- Anti-padrões

## Estrutura de pastas

```
apps/server/test/
├─ unit/          # sem DB, sem rede (npm run test:unit)
├─ integration/   # SQLite real de teste
├─ e2e/           # fluxo completo do MVP
├─ fixtures/      # respostas reais da LLM salvas em JSON (quando existirem)
└─ helpers/       # resetDatabase, fakeCtx, factories (só com uso repetido)
```

Um arquivo de teste por módulo: `src/db/drafts.js` → `test/integration/drafts.test.js`.

Helpers existentes (reuse antes de criar outro):

| Arquivo | Exporta | Uso |
|---|---|---|
| `helpers/db.js` | `resetDatabase`, `disconnectDatabase`, `seedTransaction` | Isolamento e dados de lançamentos |
| `helpers/server.js` | `buildTestServer`, `loginAs` | Fastify sem logger + sessão JWT válida |
| `helpers/telegram.js` | `fakeCtx` | `ctx` falso para chamar handlers direto |
| `helpers/telegram.js` | `captureTelegramApi`, `deliver`, `textUpdate`, `buttonUpdate` | `Bot` real do grammY offline; `deliver` repete o long polling (erros vão para `bot.catch`) |

Modelos completos por camada: `test/integration/handlers.test.js`, `test/integration/bot.test.js`, `test/integration/transactionsRoute.test.js` e `test/e2e/mvpFlow.test.js`.

## Unit: função pura

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { askMissing } from '../../src/bot/messages.js'

test('asks for every missing field in a single sentence', () => {
  const text = askMissing(['amountCents', 'date'])

  assert.equal(text, 'Para registrar, preciso saber o valor e a data. Pode me dizer?')
})
```

## Unit: extrator com LLM fake

O `callLLM` é injetado; o fake devolve a string que a LLM devolveria.

```js
const extract = createExtractor(async () => JSON.stringify({ type: 'income', amount: 300, date: '2026-10-03' }))

const result = await extract('vendi 300', '2026-10-03')

assert.equal(result.amountCents, 30000)
```

Para verificar o que foi enviado à LLM (o prompt É o comportamento nessa fronteira), capture os `messages` no fake.

## Integration: db/

Banco real. Cada arquivo limpa as tabelas antes de cada teste e desconecta no fim.

```js
import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { resetDatabase, disconnectDatabase } from '../helpers/db.js'

beforeEach(resetDatabase)
after(disconnectDatabase)
```

Ver `test/integration/loginTokens.test.js` como modelo. Para estados difíceis de criar pela API (ex.: token expirado), use o `prisma` direto **só no Arrange**; o Act e o Assert usam as funções de `db/`.

## Integration: rotas Fastify

`app.inject` não abre porta. Sempre `await app.close()` no fim.

```js
import { buildServer } from '../../src/server.js'
import { findOrCreateUser } from '../../src/db/users.js'
import { createLoginToken } from '../../src/db/loginTokens.js'

test('lists no transactions and zero totals for a new user', async () => {
  const app = await buildServer({ jwtSecret: 'test-secret' })
  const user = await findOrCreateUser('42', 'Ana')
  const login = await app.inject({
    method: 'POST', url: '/api/auth/magic', payload: { token: await createLoginToken(user.id) },
  })

  const response = await app.inject({
    method: 'GET', url: '/api/transactions', headers: { authorization: `Bearer ${login.json().token}` },
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { transactions: [], totals: { incomeCents: 0, expenseCents: 0 } })
  await app.close()
})
```

Casos obrigatórios por rota: sucesso, sem token (401), token inválido/expirado (401), body inválido (400), e **isolamento entre usuários** (usuário A nunca vê dados de B).

## Integration: handlers do bot

`ctx` fake com `mock.fn()` + `extractTransaction` fake + DB real.

```js
import { mock } from 'node:test'
import { createHandlers } from '../../src/bot/handlers.js'

function fakeCtx({ text, match, telegramId = 42 } = {}) {
  return {
    from: { id: telegramId, first_name: 'Ana' },
    message: text && { text },
    match,
    reply: mock.fn(async () => {}),
    editMessageText: mock.fn(async () => {}),
    answerCallbackQuery: mock.fn(async () => {}),
  }
}

const COMPLETE = {
  type: 'expense', amountCents: 25000, date: '2026-10-02',
  category: 'Combustível', description: 'Diesel', missing: [],
}

test('confirming the same draft twice saves only one transaction', async () => {
  const handlers = createHandlers({ extractTransaction: async () => COMPLETE, publicUrl: 'http://test' })
  await handlers.onText(fakeCtx({ text: 'gastei 250 de diesel' }))
  const draft = await prisma.draft.findFirstOrThrow()

  await handlers.onDraftAction(fakeCtx({ match: ['', 'confirm', String(draft.id)] }))
  await handlers.onDraftAction(fakeCtx({ match: ['', 'confirm', String(draft.id)] }))

  assert.equal(await prisma.transaction.count(), 1)
})
```

Caminho de erro (silencie o `console.error` esperado com `mock.method`):

```js
test('replies with a friendly message when the LLM fails', async (t) => {
  t.mock.method(console, 'error', () => {})
  const handlers = createHandlers({ extractTransaction: async () => { throw new Error('boom') }, publicUrl: 'http://test' })
  const ctx = fakeCtx({ text: 'oi' })

  await handlers.onText(ctx)

  assert.match(ctx.reply.mock.calls[0].arguments[0], /Não consegui interpretar/)
})
```

Casos obrigatórios: rascunho completo → botões ✅✏️❌; campo faltando → pergunta + só ❌; correção atualiza o rascunho pendente; confirmar/cancelar rascunho de outro usuário não tem efeito; clique repetido não duplica.

## E2E: critério de pronto do MVP

`test/e2e/mvpFlow.test.js` reproduz o critério de `skills/SKILL.md`: usuário novo → 3 lançamentos (um com correção) via `onText`/`onDraftAction` → `onPanel` (extrair o token da URL de `ctx.reply`) → `POST /api/auth/magic` → `GET /api/transactions` retorna os 3 com os totais certos. Usa o `Bot` real (`captureTelegramApi` + `deliver`) e o extrator real com `callLLM` roteirizado por mensagem; os ids dos rascunhos vêm dos botões enviados, como faria o usuário. Mantenha um único teste E2E; casos novos vão para integration.

## Tempo e fuso horário

`handlers.js` calcula "hoje" com `new Date()`. Congele o relógio:

```js
test('uses the São Paulo date late at night UTC', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-03T02:00:00Z') })
  // 02:00 UTC = 23:00 do dia 02 em São Paulo
  ...
})
```

## Respostas reais da LLM como fixtures

Quando um bug vier de uma resposta inesperada da LLM, salve a resposta real em `test/fixtures/llm/<caso>.json` e escreva um teste unit de `normalizeExtraction` com ela. Assim o contrato "nunca confiar na saída da IA" é verificado com dados reais, sem chamar a API.

## Anti-padrões

- Mock do Prisma ou de `db/*` em testes de integração.
- Chamar a LLM ou o Telegram reais.
- Testes que dependem da ordem ou de dados de outro teste.
- `assert.ok(result)` quando dá para comparar o valor exato.
- Testar detalhes privados (ex.: chamar `toCents` exportado só para teste). Teste via `normalizeExtraction`.
- `setTimeout`/`sleep` para esperar algo.
- Chamar `bot.handleUpdates` (interno do grammY); use `deliver`.
- Literais com `R$ 250,10`: o `Intl` usa espaço não separável. Escreva `'R$\u00a0250,10'`.
- Snapshot de mensagens inteiras quando só uma parte importa — use `assert.match`.
