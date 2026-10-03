# pitayapay

Controle financeiro para pequenos agricultores e micro-empresas: o usuário manda texto ao bot do Telegram, a IA extrai o lançamento, o usuário confirma, e o lançamento aparece no painel web.

## Estrutura

```
apps/server     Fastify + grammY (long polling) + LLM + rotas /api
apps/web        Vite + React — painel somente-leitura
packages/shared Categorias, rótulos e formatação reutilizados
prisma/         Schema SQLite
```

## Rodando localmente

Requer Node.js 22+.

```bash
npm install
cp .env.example .env   # preencha TELEGRAM_TOKEN, LLM_API_KEY, LLM_MODEL, JWT_SECRET
npm run db:generate
npm run db:push        # cria prisma/dev.db
npm run build          # gera apps/web/dist, servido pelo servidor
npm start              # API + bot em http://localhost:3000
```

Desenvolvimento do front com hot reload: `npm run dev:server` e `npm run dev:web` (o Vite faz proxy de `/api` para a porta 3000).

No Telegram: envie `/start`, depois uma movimentação ("gastei 250 de diesel ontem"), e `/painel` para receber o link do painel.

## Testes

```bash
npm test
```

## Devcontainer

O firewall do devcontainer libera apenas `registry.npmjs.org` e `api.anthropic.com`. Para rodar o app dentro dele, adicione ao `ALLOWED_DOMAINS` em `.devcontainer/init-firewall.sh`:

- `binaries.prisma.sh` — engines do Prisma (`prisma generate` / `db push`)
- `api.telegram.org` — bot
- o host de `LLM_BASE_URL` (ex.: `routellm.abacus.ai`)
