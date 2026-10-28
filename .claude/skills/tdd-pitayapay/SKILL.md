---
name: tdd-pitayapay
description: Test-Driven Development and automated testing strategy for the PitayaPay project (node:test, Prisma/SQLite, Fastify, grammY, LLM extraction). Use whenever writing, changing, refactoring or fixing ANY code in apps/server or packages/shared, when adding or reviewing tests, when fixing a bug, or when the user mentions tests, TDD, coverage, test pyramid, mocks or regressions. Enforces red-green-refactor, the test pyramid and coverage gates.
---

# TDD e testes automatizados — PitayaPay

Todo código de produção nasce de um teste que falhou. Sem exceção para "mudança pequena".
Esta skill complementa `skills/SKILL.md`: KISS e YAGNI valem também para testes.

Padrões e exemplos de código prontos: `references/test-patterns.md`.

## Ciclo obrigatório: Red → Green → Refactor

1. **Red:** escreva UM teste que descreve o próximo comportamento. Rode e **veja falhar pelo motivo certo** (asserção, não erro de import ou typo). Mostre a falha ao usuário.
2. **Green:** escreva o mínimo de código para passar. Nada além do que o teste exige (YAGNI).
3. **Refactor:** com tudo verde, melhore nomes, remova duplicação (no código e nos testes). Rode de novo.
4. Repita. Passos pequenos: um comportamento por ciclo.

**Bug fix:** primeiro um teste que reproduz o bug (red), depois a correção. O teste fica como regressão.

**Proibido:**
- Escrever o código e depois o teste "para cobrir".
- Alterar uma asserção só para o teste passar sem entender por que falhou.
- Deixar `test.skip`/`test.only`/`todo` no commit.
- Apagar ou enfraquecer testes existentes para acomodar uma mudança, sem avisar o usuário.

## Pirâmide de testes

| Camada | Pasta | Proporção | O que testa | Dependências |
|---|---|---|---|---|
| **Unit** | `apps/server/test/unit/` | ~70% | Funções puras: `llm/extractor`, `llm/prompt`, `bot/messages`, `config`, `packages/shared` | Nenhuma real. Fakes injetados. Sem DB, sem rede. |
| **Integration** | `apps/server/test/integration/` | ~25% | `db/*` contra SQLite real; `routes/*` via `app.inject`; `bot/handlers` com ctx fake + DB real | SQLite de teste (`prisma/test.db`). LLM e Telegram sempre fake. |
| **E2E** | `apps/server/test/e2e/` | ~5% | O fluxo do critério de pronto do MVP: texto → rascunho → confirmar → `/painel` → login → `GET /api/transactions` | Handlers + DB + server reais; só LLM e Telegram fakes. |

Regras:
- Teste a lógica na camada mais baixa possível. Se uma regra pode ser testada em unit, não a teste em integration.
- **Nunca** chame a LLM real nem a API do Telegram em testes automatizados. Eles são não determinísticos, custam dinheiro e exigem rede.
- Integração com o Prisma é testada com **banco real** (SQLite), não com mock do Prisma. Mockar o ORM testa o mock.
- E2E cobre só o caminho feliz do MVP e 1–2 caminhos críticos (correção, cancelamento). Não multiplique.

## Comandos

```bash
npm run test:unit       # rápido, sem DB — use no ciclo red/green
npm test                # recria prisma/test.db e roda tudo
npm run test:coverage   # tudo + portão de cobertura (falha abaixo do mínimo)
npm run test:watch -w @pitayapay/server   # unit em modo watch
```

`npm test` usa `DATABASE_URL=file:./test.db` e `--test-concurrency=1` (os arquivos de integração compartilham um SQLite). **Nunca** aponte testes para `dev.db`.

## Cobertura

Portão em `apps/server/package.json` (`test:coverage`): **linhas ≥ 80%, branches ≥ 70%, funções ≥ 80%**.

- Metas por camada (orientação, não portão): `llm/` e `db/` ≥ 95%; `bot/handlers` e `routes/` ≥ 85%.
- Fora da medição: `src/index.js` (entrypoint; validado rodando o app).
- `test/unit/coverage-guard.test.js` importa todos os módulos de `src/` para que arquivos sem teste apareçam com 0%, em vez de sumirem do relatório. Arquivo novo em `src/` entra automaticamente.
- Cobertura é consequência do TDD, não objetivo. 100% com asserções fracas vale menos que 85% com asserções precisas. Nunca escreva teste sem asserção só para subir o número.
- Não baixe os limites para fazer o portão passar. Se for necessário, pergunte ao usuário.

## Como escrever bons testes

- **Comportamento, não implementação:** asserte o que sai (retorno, linha no DB, resposta HTTP, mensagem ao usuário), não quais funções internas foram chamadas. Exceção: fronteiras externas (`callLLM`, `ctx.reply`), onde a chamada É o comportamento.
- **Nome descreve o comportamento** em inglês, como frase: `'rejects a magic link token that was already used'`.
- **Arrange / Act / Assert**, separados por linha em branco. Um comportamento por teste.
- **Determinismo:** sem `Date.now()`/`new Date()` soltos. Passe `today` como parâmetro ou use `mock.timers`. Sem rede, sem ordem entre testes, sem `setTimeout` para "esperar".
- **Isolamento:** `beforeEach(resetDatabase)` em todo arquivo de integração. Cada teste cria os próprios dados.
- **Dados mínimos e explícitos:** só os campos relevantes para o teste. Factories pequenas em `test/helpers/` quando houver repetição real (≥ 3 usos), não antes.
- **Casos de borda obrigatórios** para dinheiro e datas: zero, negativo, vírgula decimal, arredondamento de centavos, data inválida, virada de dia no fuso `America/Sao_Paulo`.
- **Erros explícitos:** para cada `try/catch` de produção, um teste do caminho de erro (LLM falha → mensagem amigável; token inválido → 401).
- **Asserções:** `node:assert/strict`. Prefira `deepEqual` do objeto inteiro a várias asserções parciais.

## Fakes e test doubles

A arquitetura já injeta dependências nas fronteiras. Use isso:

| Fronteira | Como substituir |
|---|---|
| LLM | `createExtractor(fakeCallLLM)` ou passar `extractTransaction` fake para `createHandlers` |
| Telegram | objeto `ctx` fake com `mock.fn()` em `reply`, `editMessageText`, `answerCallbackQuery` |
| HTTP | `buildServer({ jwtSecret })` + `app.inject()` — sem abrir porta |
| Tempo | `mock.timers.enable({ apis: ['Date'], now })` |
| Banco | SQLite real de teste — não substituir |

Se algo é difícil de testar, é sinal de design: prefira injetar a dependência a criar mock de módulo. Sem bibliotecas de mock/teste extras (`node:test` + `node:assert` bastam). Adicionar Jest/Vitest/Sinon exige justificativa ao usuário.

## Checklist antes de concluir qualquer tarefa

- [ ] Cada comportamento novo/alterado tem teste que foi visto falhando antes.
- [ ] `npm test` verde.
- [ ] `npm run test:coverage` verde (ou o usuário foi informado do motivo).
- [ ] Nenhum `only`/`skip`, nenhum `console.log` de debug nos testes.
- [ ] Testes rodam offline e em qualquer ordem.
- [ ] Ao relatar, informe quais testes foram criados e o resultado real da execução.
