# Princípios de desenvolvimento — PitayaPay

## Contents
- KISS
- YAGNI
- SOLID aplicado ao projeto
- Clean Code
- UNIX

## KISS (Keep It Simple, Stupid)

- Prefira código linear e legível a abstrações "elegantes".
- Se você está criando uma classe ou módulo que só será usado uma vez, provavelmente está over-engineering.
- SQLite é a escolha certa para o MVP. Postgres é complexidade desnecessária agora.
- Long polling é suficiente. Webhook adiciona complexidade (domínio, certificado, rota pública).

Sinal de alarme: se você precisar de um diagrama para explicar o que uma função faz, reescreva-a.

## YAGNI (You Aren't Gonna Need It)

- Implemente apenas o que os requisitos M1–M5 exigem hoje.
- Não crie camadas de abstração "para escalar depois".
- Não adicione campos ao banco "porque podem ser úteis".
- Não implemente RF15–RF22 "enquanto está aqui".

Pergunta obrigatória antes de qualquer feature: "Qual dos M1–M5 isso habilita?"

## SOLID aplicado ao projeto

S — Single Responsibility
Cada módulo tem uma razão para mudar:
- llm/extractor.js muda quando o prompt muda.
- db/transactions.js muda quando o schema muda.
- bot/handlers.js muda quando o fluxo do bot muda.
Nunca misture acesso ao DB dentro de um handler de bot diretamente.

O — Open/Closed
Adicione categorias editando packages/shared/index.js, sem tocar em handlers ou LLM.
O prompt de extração deve receber a lista de categorias como parâmetro, não hardcoded.

L — Liskov
Não aplicável diretamente em JS sem herança, mas: qualquer função que substitui outra deve honrar o mesmo contrato.

I — Interface Segregation
Funções pequenas com assinaturas mínimas. Evite funções que recebem um objeto gigante quando precisam de 2 campos.

D — Dependency Inversion
O bot não importa diretamente o Prisma client. Ele chama funções de db/ que encapsulam o acesso.
O LLM não importa axios diretamente; usa uma função callLLM(prompt) que pode ser trocada.

## Clean Code

- Nomes revelam intenção: extractTransaction(text, today) não proc(t, d).
- Funções curtas: se passar de 20 linhas, considere dividir.
- Sem comentários óbvios: o código explica o quê; comentários explicam o porquê.
- Tratamento de erro explícito: use try/catch com log da causa raiz. Nunca catch (e) {} vazio.
- Constantes nomeadas: const MAGIC_LINK_TTL_MS = 15 * 60 * 1000 não 900000.
- Valores monetários em centavos: nunca use float para dinheiro.

## UNIX

- Faça uma coisa bem: cada processo, módulo e função tem uma responsabilidade clara.
- Composição: o bot orquestra chamadas a llm/, db/ e routes/ — não as implementa.
- Saída previsível: funções retornam sempre o mesmo formato ou lançam exceção conhecida.
- Fail fast: se uma variável de ambiente obrigatória estiver ausente, o servidor não sobe.

// Exemplo de fail fast no entrypoint
const required = ['TELEGRAM_TOKEN', 'LLM_API_KEY', 'JWT_SECRET']
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`)
    process.exit(1)
  }
}