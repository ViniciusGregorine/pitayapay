# Escopo do MVP — PitayaPay

## Contents
- Requisitos do MVP (M1–M5)
- Autenticação
- O que está fora do MVP
- Lista de categorias

## Requisitos do MVP (M1–M5)

ID	Requisito	RFs de origem	Simplificação
M1	Usuário registra movimentação mandando texto ao bot do Telegram	RF04	Sem áudio
M2	IA extrai: tipo (Receita/Despesa), valor, data, categoria e descrição	RF06, RF07	2 tipos; 1 categoria de lista fixa (≈10); sem subcategoria
M3	Bot mostra resumo + botões ✅ Confirmar / ✏️ Corrigir / ❌ Cancelar. Correção em texto livre; IA refaz. Se faltar campo obrigatório, IA pergunta	RF09–RF12	Baixa confiança → só perguntar o que falta
M4	Lançamento só é salvo após ✅	RF12	—
M5	Tela web somente-leitura: lista Data, Tipo, Valor, Categoria, Descrição + totais de receitas e despesas	RF14	Sem filtros, sem editar, sem excluir
Autenticação (substitui RF01 e RF02)

    O Telegram ID é a conta do usuário.

    Usuário envia /painel → bot responde com magic link temporário (15 min).

    Magic link abre a tela web já autenticada.

    Não há tela de cadastro, login ou senha.

O que está fora do MVP

    RF03 — Perfil/contexto do usuário

    RF05 — Entrada por áudio

    RF08 — Identificação de atividade (soja, milho, gado…)

    RF13 — Aprendizado com correções do usuário

    RF15 — Filtros na listagem

    RF16 — Editar lançamentos (possível via chat na v2)

    RF17 — Excluir lançamentos (possível via chat na v2)

    RF18–RF22 — Chat financeiro com IA

Lista de categorias (fixa no MVP)

export const CATEGORIES = [
'Combustível',
'Insumos agrícolas',
'Mão de obra',
'Manutenção de equipamentos',
'Alimentação',
'Transporte',
'Vendas / Receitas',
'Serviços recebidos',
'Impostos e taxas',
'Outros',
]