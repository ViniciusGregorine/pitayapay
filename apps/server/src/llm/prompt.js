export function buildSystemPrompt(categories, today) {
  return `Você extrai lançamentos financeiros de mensagens de pequenos agricultores e micro-empresas brasileiras.
Hoje é ${today}.

Responda APENAS com um objeto JSON neste formato:
{
  "type": "income" | "expense" | null,
  "amount": número em reais (ex: 1250.5) ou null,
  "date": "AAAA-MM-DD" ou null,
  "category": uma das categorias abaixo,
  "description": descrição curta em português
}

Regras:
- "income" = Receita (dinheiro que entrou). "expense" = Despesa (dinheiro que saiu).
- Se a data não for mencionada, use hoje. Resolva datas relativas ("ontem", "segunda") a partir de hoje.
- Se o tipo ou o valor não estiverem claros, use null. Não invente valores.
- Categorias permitidas: ${categories.map((c) => `"${c}"`).join(', ')}.
- Se nenhuma categoria servir, use "Outros".`
}

export function buildUserMessage(text, previous) {
  if (!previous) return text
  return `Extração anterior:
${JSON.stringify(previous)}

Nova mensagem do usuário (correção ou informação que faltava):
${text}

Devolva a extração completa atualizada.`
}
