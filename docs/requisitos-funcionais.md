# Requisitos funcionais: PitayaPay

RF01: O sistema deve permitir que o usuário crie uma conta informando, no mínimo: Nome, E-mail ou telefone, Senha.

RF02: O sistema deve permitir login e logout do usuário.

RF03: O sistema deve permitir que o usuário informe dados básicos de sua atividade (tipo de atividade, nome da propriedade/empresa, principais culturas ou atividades e unidade de produção, quando aplicável), que servirão de contexto para a IA.

RF04: O sistema deve permitir que o usuário registre uma despesa digitando uma descrição livre (ex.: "Gastei R$ 450 de diesel hoje.").

RF05: O sistema deve permitir que o usuário informe uma movimentação financeira por áudio (ex.: "Comprei duas sacas de fertilizante por mil e duzentos reais."), convertendo a fala em informações estruturadas.

RF06: O sistema deve classificar cada lançamento como Receita, Despesa, Transferência ou Outro (no MVP, podendo iniciar apenas com Receita e Despesa).

RF07: O sistema deve classificar automaticamente cada movimentação em categorias financeiras, com categoria e subcategoria (ex.: Categoria: Insumos agrícolas | Subcategoria: Fertilizantes).

RF08: O sistema deve tentar identificar, por IA, a atividade relacionada ao lançamento (ex.: Soja, Milho, Gado, Hortaliças, Manutenção, Operação geral, Outros).

RF09: O sistema deve identificar quando a IA possui baixa confiança na interpretação do lançamento e sinalizar isso ao usuário (ex.: "Não consegui identificar com segurança a atividade deste gasto.").

RF10: O sistema deve apresentar ao usuário o lançamento interpretado pela IA antes da confirmação, exibindo valor, data, estabelecimento, categoria, atividade e forma de pagamento.

RF11: O sistema deve permitir que o usuário edite qualquer informação identificada pela IA no lançamento.

RF12: O sistema deve permitir que o usuário confirme o lançamento, sendo que somente após a confirmação ele deve ser considerado um registro financeiro válido.

RF13: O sistema deve armazenar as correções feitas pelo usuário nas classificações da IA para melhorar futuras classificações daquele usuário (ex.: IA classificou Peças X → Automóvel; usuário corrigiu para Trator; o sistema considera esse histórico nas próximas compras da mesma empresa/produto).

RF14: O sistema deve apresentar a listagem dos lançamentos financeiros do usuário, exibindo no mínimo: Data, Valor, Tipo, Categoria, Atividade e Descrição.

RF15: O sistema deve permitir filtrar os lançamentos por Período, Receita/Despesa, Categoria e Atividade.

RF16: O sistema deve permitir que o usuário altere lançamentos já cadastrados.

RF17: O sistema deve permitir que o usuário exclua um lançamento.

RF18: O sistema deve disponibilizar uma interface de conversa com IA (chat financeiro), na qual o usuário pode fazer perguntas em linguagem natural (ex.: "Quanto gastei com milho este ano?", "Qual foi meu maior gasto este mês?").

RF19: O sistema deve responder às perguntas do chat utilizando exclusivamente os dados financeiros registrados pelo usuário, sem inventar informações, e deve informar quando não houver dados suficientes.

RF20: O sistema (IA) deve compreender consultas com períodos temporais, como: hoje, esta semana, este mês, últimos 3 meses, este ano e ano passado.

RF21: O sistema deve permitir perguntas comparativas (ex.: "Gastei mais com soja ou milho?", "Quanto aumentaram meus gastos em relação ao mês passado?").

RF22: O sistema deve explicar, quando possível, os principais fatores por trás de uma alteração financeira (ex.: "Suas despesas aumentaram R$ 4.200 em relação ao mês passado. R$ 2.700 desse aumento vieram de fertilizantes.").