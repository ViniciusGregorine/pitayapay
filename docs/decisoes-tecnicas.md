# Decisões técnicas — PitayaPay (MVP)

Registro do que foi implementado na primeira versão do core e por quê.
Referências: `docs/requisitos-funcionais.md`, `skills/references/mvp-scope.md`, `skills/references/principles.md`.

## 1. Status dos requisitos funcionais

Legenda: ✅ implementado · 🟡 parcial/simplificado · 🔁 substituído por outra solução · ⏸️ fora do MVP

| RF | Status | O que foi feito |
|----|--------|-----------------|
| RF01 — Criar conta | 🔁 | Sem cadastro. O Telegram ID é a conta; o usuário é criado automaticamente na primeira mensagem, com o nome do perfil do Telegram. |
| RF02 — Login/logout | 🔁 🟡 | Login por magic link: `/painel` gera um link de uso único válido por 15 min, trocado por um JWT de 1 h. Não há botão de logout: a sessão expira em 1 h e fica em `sessionStorage` (some ao fechar a aba). |
| RF03 — Perfil/contexto da atividade | ⏸️ | — |
| RF04 — Registro por texto livre | ✅ | Qualquer mensagem de texto ao bot vira um rascunho de lançamento (despesa ou receita). |
| RF05 — Registro por áudio | ⏸️ | — |
| RF06 — Tipo do lançamento | 🟡 | Apenas Receita e Despesa (como o próprio RF permite no MVP). |
| RF07 — Categoria e subcategoria | 🟡 | 1 categoria de uma lista fixa de 10 (`packages/shared`). Sem subcategoria. Categoria desconhecida vira "Outros". |
| RF08 — Identificar atividade (soja, milho…) | ⏸️ | — |
| RF09 — Sinalizar baixa confiança | 🟡 | Não há score de confiança. Se tipo, valor ou data não forem identificados (ou vierem inválidos), o bot pergunta especificamente o que falta e não permite confirmar até completar. |
| RF10 — Mostrar lançamento antes de confirmar | 🟡 | Resumo com Tipo, Valor, Data, Categoria e Descrição. Sem estabelecimento, atividade e forma de pagamento. |
| RF11 — Editar campos identificados pela IA | 🟡 | Botão ✏️ Corrigir: o usuário descreve a correção em texto livre e a IA refaz a extração a partir da anterior. Não há edição campo a campo. |
| RF12 — Só vale após confirmação | ✅ | Só o botão ✅ Confirmar grava em `Transaction`; antes disso é um `Draft`. Confirmar e salvar acontecem na mesma transação de banco. |
| RF13 — Aprender com correções | ⏸️ | O texto original e as correções ficam em `rawText`, mas não são usados para treinar/ajustar classificações. |
| RF14 — Listagem de lançamentos | 🟡 | Painel web com Data, Tipo, Valor, Categoria e Descrição + totais de Receitas, Despesas e Saldo. Sem coluna Atividade. |
| RF15 — Filtros | ⏸️ | — |
| RF16 — Alterar lançamento salvo | ✅ | Botão **Editar** em cada linha do painel abre um formulário na própria linha (tipo, valor, data, categoria, descrição). `PUT /api/transactions/:id`. |
| RF17 — Excluir lançamento | ✅ | Botão **Excluir** em cada linha, com confirmação. `DELETE /api/transactions/:id`. A exclusão é definitiva. |
| RF18–RF22 — Chat financeiro com IA | ⏸️ | — |

**Resumo:** os requisitos M1–M5 do MVP estão cobertos (RF04, RF06, RF07, RF09–RF12, RF14, em versão simplificada). RF01/RF02 foram substituídos pelo login via Telegram. RF16 e RF17 foram adicionados depois do MVP, pelo painel web. Os demais ficam para depois do MVP.

## 2. Stack

| Camada | Escolha | Motivo |
|--------|---------|--------|
| Linguagem | JavaScript (Node.js 22, ES Modules) em todo o monorepo | Uma linguagem só para front e back. |
| Monorepo | npm workspaces (`apps/server`, `apps/web`, `packages/shared`) | Sem ferramenta extra (Nx, Turborepo); suficiente para 3 pacotes. |
| Bot | grammY, **long polling** | Simples; long polling dispensa domínio público e certificado. |
| API HTTP | Fastify + `@fastify/jwt` + `@fastify/static` | Leve; o mesmo processo serve a API e o build do front. |
| Front | Vite + React, 1 página | Sem SSR, sem roteador, sem biblioteca de estado. |
| Banco | SQLite + Prisma **6.19.x** | Zero infraestrutura para < 10 usuários. |
| LLM | API compatível com OpenAI (RouteLLM da Abacus) em JSON mode | Provedor trocável por variável de ambiente. |
| Testes | `node:test` nativo, TDD, cobertura nativa do Node (portão 80% linhas / 70% branches / 80% funções) | Nenhuma dependência de teste. Integração com SQLite real (`prisma/test.db`); LLM e Telegram sempre fakes. Ver `.claude/skills/tdd-pitayapay/`. |

## 3. Decisões e justificativas

### Arquitetura
- **Um processo só** (`apps/server`) roda o bot, a API e os arquivos estáticos do painel. Menos coisa para subir e monitorar.
- **Camadas separadas** em `apps/server/src`: `bot/` (conversa), `llm/` (prompt e validação), `db/` (único lugar que usa o Prisma), `routes/` (HTTP). O bot nunca acessa o Prisma diretamente.
- **Dependências injetadas onde importa:** o bot recebe `extractTransaction` pronto, e o extrator recebe `callLLM`. Isso facilita testar e trocar o provedor de LLM.
- **Fail fast:** se faltar uma variável obrigatória (`TELEGRAM_TOKEN`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `JWT_SECRET`, `DATABASE_URL`), o servidor não sobe.

### Prisma 6 em vez de 7+
O Prisma 7+ exige driver adapters e `prisma.config.ts`, o que adiciona complexidade sem benefício para SQLite + JS no MVP. A versão está fixada em `~6.19.3`.

### LLM
- **Sem SDK:** `llm/client.js` usa o `fetch` nativo do Node. É o único arquivo que conhece o transporte.
- **`temperature: 0` + `response_format: json_object`**, para respostas estáveis e em JSON.
- **A saída da IA nunca é confiada como veio:** `normalizeExtraction` valida o tipo, converte o valor para centavos, valida a data (`AAAA-MM-DD`), troca categoria desconhecida por "Outros" e **calcula ela mesma** a lista `missing`, sem usar a da IA.
- **A lista de categorias é parâmetro do prompt** (Open/Closed): adicionar categoria é editar `packages/shared/index.js`.
- **Correção = reextração:** a extração anterior e a nova mensagem são enviadas juntas, e a IA devolve o lançamento completo atualizado.

### Fluxo do bot
- **Um rascunho pendente por vez:** enquanto há um `Draft` com status `pending`, a próxima mensagem de texto é tratada como correção ou complemento dele (o texto é concatenado em `rawText`). Para começar outro lançamento, o usuário confirma ou cancela o atual.
- Com campos faltando, o bot pergunta o que falta e mostra só ❌ Cancelar. Com o rascunho completo, mostra ✅ / ✏️ / ❌.
- Os botões carregam o id do rascunho (`confirm:12`), e o handler confere se o rascunho pertence ao usuário e ainda está pendente. Assim, cliques repetidos ou antigos não gravam em dobro.
- Mensagens ao usuário em português, sem `parse_mode`, para evitar problemas de escape de Markdown.

### Dados
- **Dinheiro em centavos (`Int`)**, nunca float.
- **Datas:** "hoje" é calculado no fuso `America/Sao_Paulo`. A data do lançamento é guardada como meia-noite UTC e exibida como `AAAA-MM-DD` → `DD/MM/AAAA`, sem conversão de fuso, para não "voltar um dia".
- Schema igual ao de `architecture.md`: `User`, `Draft`, `Transaction`, `LoginToken`. Nenhum campo extra.

### Edição e exclusão no painel (RF16/RF17)
- **`PUT` com o lançamento completo** (não `PATCH` parcial): o formulário sempre envia os 5 campos editáveis, então a validação é uma só e não há caso de "campo ausente = manter".
- **O servidor valida tudo** via JSON Schema do Fastify: tipo e categoria só das listas de `packages/shared`, `amountCents` inteiro ≥ 1, data `AAAA-MM-DD` real (`2026-02-30` é rejeitada). Campos extras (ex.: `userId`) são descartados.
- **`rawText` não é editável:** continua guardando o texto original enviado no Telegram.
- **Dono checado na própria query** (`where: { id, userId }`): lançamento de outro usuário e lançamento inexistente respondem igual, `404`, sem revelar que o id existe. O tratamento de "não encontrado" do Prisma (`P2025`) ficou em `nullIfNotFound` (`db/client.js`), usado também pelo magic link.
- **Erros de validação em português:** um error handler devolve `400 { error: "Dados inválidos…" }`, no mesmo formato `{ error }` das outras rotas. Erros inesperados continuam como `500` e são logados.
- **Valor digitado em reais, convertido sem float:** `parseAmountToCents` (`packages/shared`) aceita `250`, `250,10`, `1.250,10` e `12.5`, e rejeita zero, negativos e formatos ambíguos. O front valida antes de enviar; o servidor valida de novo.
- **Exclusão definitiva** (sem lixeira/soft delete), com confirmação no navegador. Após salvar ou excluir, o painel recarrega a lista para os totais virem do servidor.
- **Sessão só é descartada em `401`:** um erro de validação não desloga o usuário.

### Autenticação
- O magic link é um token aleatório de 32 bytes, com validade de 15 min e **uso único**. A leitura e a exclusão acontecem numa única operação (`delete`), então dois acessos simultâneos não usam o mesmo link.
- O JWT de sessão dura 1 h. Ao expirar, o painel orienta a enviar `/painel` de novo.
- No front, a troca do token é feita uma única vez, mesmo com o `StrictMode` do React executando efeitos duas vezes em desenvolvimento.
- `PUBLIC_URL` (opcional, padrão `http://localhost:PORT`) define a base do link enviado no Telegram.

### Ambiente (devcontainer)
- O firewall libera `registry.npmjs.org`, `api.anthropic.com`, `binaries.prisma.sh`, `api.telegram.org` e `routellm.abacus.ai`. Se `LLM_BASE_URL` mudar de host, ele precisa ser adicionado.
- A porta 3000 está encaminhada para acessar o painel fora do container.

## 4. Limitações conhecidas e pendências

- `npm audit` aponta 3 alertas *high* em `deepmerge-ts`, usado pelo loader de configuração da CLI do Prisma (ferramenta de desenvolvimento; não processa entrada do usuário). Todas as versões do Prisma a partir da 6.13 têm esse alerta.
- Comandos desconhecidos (ex.: `/ajuda`) são tratados como texto e enviados à IA.
- Não há logout explícito no painel.
- Logs `[debug]` em `bot/index.js` e `bot/handlers.js` e o script `apps/server/q.mjs` foram adicionados para depuração. Avaliar se devem ser removidos antes do deploy.
