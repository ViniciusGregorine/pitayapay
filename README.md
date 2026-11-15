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
cp .env.example .env   # preencha TELEGRAM_TOKEN, LLM_API_KEY, LLM_MODEL, JWT_SECRET, TRANSCRIPTION_API_KEY
npm run db:generate
npm run db:push        # cria prisma/dev.db
npm run build          # gera apps/web/dist, servido pelo servidor
npm start              # API + bot em http://localhost:3000
```

Desenvolvimento do front com hot reload: `npm run dev:server` e `npm run dev:web` (o Vite faz proxy de `/api` para a porta 3000).

No Telegram: envie `/start`, depois uma movimentação ("gastei 250 de diesel ontem") por texto ou áudio, e `/painel` para receber o link do painel.

## Acesso pelo celular (túnel)

Para abrir o painel no celular sem estar na mesma rede, exponha a porta 3000 por um túnel HTTPS e use a URL dele como `PUBLIC_URL` (é ela que vai no link do `/painel`).

Rode o túnel **no host**, não no devcontainer: o firewall do container bloqueia conexões de saída para serviços de túnel. A porta 3000 do container já é encaminhada para `localhost:3000` do host (`forwardPorts`).

1. Gere o build e suba o servidor (`npm run build && npm start`). Aponte o túnel para a porta 3000, não para o Vite (5173): o Vite recusa hosts desconhecidos.
2. No host, com o [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) instalado (sem conta):
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Ele imprime uma URL `https://<nome>.trycloudflare.com`.
3. No `.env`, defina `PUBLIC_URL=https://<nome>.trycloudflare.com` (sem `/` no final) e reinicie o servidor.
4. Envie `/painel` no Telegram e abra o link no celular.

A URL do quick tunnel muda a cada execução; repita o passo 3 quando reiniciar o túnel. Para uma URL fixa, use um túnel nomeado do Cloudflare (precisa de um domínio na conta) ou o domínio estático gratuito do ngrok (`ngrok http --url=<seu-dominio>.ngrok-free.app 3000`).

Qualquer pessoa com a URL alcança o servidor, mas o painel e a API continuam protegidos pelo magic link + JWT.

## Testes

```bash
npm test
```

## Devcontainer

O firewall do devcontainer libera apenas `registry.npmjs.org` e `api.anthropic.com`. Para rodar o app dentro dele, adicione ao `ALLOWED_DOMAINS` em `.devcontainer/init-firewall.sh`:

- `binaries.prisma.sh` — engines do Prisma (`prisma generate` / `db push`)
- `api.telegram.org` — bot
- o host de `LLM_BASE_URL` (ex.: `routellm.abacus.ai`)
- o host de `TRANSCRIPTION_BASE_URL` (ex.: `api.groq.com`)
