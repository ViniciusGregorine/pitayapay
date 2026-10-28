---
name: developing-pitayapay
description: Guides development of the PitayaPay project — a financial control platform for small farmers and micro-businesses. Monorepo Node.js with Telegram bot (grammY), Fastify API, React web interface, SQLite via Prisma, and LLM integration. Use when building, extending, reviewing, or debugging any code for the PitayaPay project. Enforces KISS, YAGNI, SOLID, Clean Code, and UNIX principles throughout.
---

## Overview

PitayaPay é uma plataforma de controle financeiro para pequenos agricultores e micro-empresas. O usuário registra movimentações via texto no Telegram; a IA interpreta, o usuário confirma, e o lançamento aparece em uma tela web simples.

**Critério de pronto do MVP:** um usuário novo, sem cadastro prévio, consegue registrar 3 lançamentos pelo Telegram (incluindo uma correção) e vê-los no painel web em menos de 5 minutos.

Consulte os arquivos de referência abaixo antes de qualquer implementação:

- `references/architecture.md` — stack, estrutura de pastas, modelo de dados, fluxo completo
- `references/mvp-scope.md` — os 5 requisitos do MVP e o que está fora do escopo
- `references/principles.md` — como os princípios KISS/YAGNI/SOLID/Clean Code/UNIX se aplicam a este projeto

## Regras não-negociáveis

1. **YAGNI first:** não implemente nada que não seja necessário para os 5 requisitos do MVP (M1–M5). Se não está em `mvp-scope.md`, não entra agora.
2. **Uma função, uma responsabilidade (SOLID-SRP):** cada módulo faz uma coisa. Bot, extração LLM, persistência e rotas HTTP são camadas separadas.
3. **UNIX:** componentes pequenos que fazem uma coisa bem; composição via interfaces bem definidas (não acoplamento direto).
4. **Sem over-engineering:** SQLite é suficiente para < 10 usuários. Não troque por Postgres sem necessidade demonstrada.
5. **Nomes em inglês no código** (variáveis, funções, arquivos). Mensagens ao usuário em português.
6. **Erros explícitos:** toda falha de LLM, de DB ou de Telegram deve logar a causa raiz e responder ao usuário com mensagem amigável — nunca silenciar exceções.
7. **TDD obrigatório:** todo código em `apps/server` e `packages/shared` nasce de um teste que falhou (red → green → refactor). Siga `.claude/skills/tdd-pitayapay/SKILL.md`; `npm test` e `npm run test:coverage` devem ficar verdes.

## Decisões técnicas fixas

Camada	Tecnologia	Motivo
Linguagem	JavaScript (Node.js)	Uniforme em todo o monorepo
Bot	grammY	Simples, bem documentado, gratuito
API HTTP	Fastify	Leve, rápido, ideal para JSON
Front	Vite + React	1 página, sem SSR necessário
Banco	SQLite + Prisma	Zero infraestrutura para < 10 usuários
LLM	API compatível OpenAI (JSON mode)	Flexível; padrão RouteLLM da Abacus
Autenticação	Magic link via Telegram ID	Sem cadastro, sem senha
Fluxo principal (não desviar)

usuário → texto livre
  → LLM extrai {type, amount, date, category, description, missing[]}
  → se missing[] não vazio → bot pergunta o que falta
  → bot mostra resumo + botões [✅ Confirmar | ✏️ Corrigir | ❌ Cancelar]
  → ✅ → salva como transaction
  → /painel → bot responde link mágico → web lista lançamentos