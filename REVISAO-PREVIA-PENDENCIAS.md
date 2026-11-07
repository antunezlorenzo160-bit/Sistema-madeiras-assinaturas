# Prévia das pendências — 07/11/2026

Somente branch de revisão: não publicar esta branch em produção até revisão do usuário. Não inclui aplicativo Play Store. O botão Zerar contador foi cancelado e não foi adicionado.

## Alterações

- Cadastro → Preços automáticos por documento. Limites gerais da empresa por m³, m² e metro linear, desativados inicialmente. Até o limite inclusive: varejo; acima: atacado para todas as espécies do documento. Usa volume físico, sem acréscimo de CMDP. Granel soma ao m³. Limite vazio mantém varejo; zero habilita atacado para qualquer quantidade positiva. Madeira verde mantém preço próprio.
- Política e preços são registrados nos novos documentos. Documentos legados e orçamentos salvos reabertos mantêm os preços. Alterar os limites vale para os próximos documentos. Se faltar atacado, mantém varejo e avisa, sem criar preço zero. Na montagem por funcionário, a reavaliação dos preços das linhas anteriores cabe ao administrador, preservando a restrição de edição de rascunhos.
- Política via endpoint autenticado, empresa derivada do vínculo, edição somente pelo responsável, versão contra sobreposição entre aparelhos. Sem alteração das regras Firestore. Cache por empresa para uso offline após a configuração ser carregada no aparelho.
- Movimentações: grupos por dia, filtros data/espécie/tipo e totais separados de entradas/saídas. Ajustes e transferências separados; não somados como compras/vendas. Remove cartões de saldo do histórico sem remover registros. Mantém seleção Estoque1/2 e unidades.
- PDFs: resumo com tabelas compactas em duas colunas por espécie/espessura; carregamentos e romaneios com valores rotulados em duas colunas para não reduzir nove colunas a letras ilegíveis. Cabeçalho, dados do emitente, valores e assinatura mantidos. Somente clone de impressão é alterado. Não promete uma página para qualquer quantidade.
- Funcionários: retira link/botão de regras e instruções de configuração Firebase da interface; mantém todas as validações.
- Página /divulgacao/: calculadora automatizada, digitação rápida, teste grátis sem compromisso, WhatsApp +55 49 99121-4233, planos mensal190/anual2000 e vídeo YouTube fornecido pelo usuário. Confirmar preços e vídeo no teste visual antes de divulgar. Nenhuma mensagem enviada.
- Pagamentos novos desativados explicitamente no contexto deploy-preview, sem mudar o contexto Production.

## Validação

Build completo passou. Testes novos: precificação, unidades, limites, mudança atacado/varejo ao adicionar/remover itens, isolamento da configuração, permissões, versão, agrupamento de movimentações e fluxo de salvamento offline de cargas. Testes de pagamentos e carga de funcionário passaram; scripts internos também passaram em node --check.

Varredura inicial:49/56 suítes passaram. Uma falha nova de fixture de carga foi corrigida incluindo os helpers desativados na fixture; as outras seis suítes também falham no build da main sem esta mudança: budget-active, budget-queue, employee-navigation, employees, history-on-demand, read-optimization. São limitações preexistentes das fixtures (dependências de acesso não simuladas e hash de regras), registradas sem alterar autorização para satisfazer testes.

Tentado teste visual: ambiente recusa abrir socket do servidor local; Chromium com perfil temporário falha em crashpad/setsockopt Operation not permitted. Teste de navegador tests/preview-browser.py preparado, mas não executado com êxito. Validação de layout/paginação requer conferir a prévia em celular e PC. O PDF ilustrativo de77linhas em1A4 foi aprovado anteriormente, mas a paginação gerada no navegador nesta implementação ainda não foi validada.

## Roteiro para o usuário

Usar uma empresa/documentos de teste (prévia compartilha os dados da empresa). Não limpar dados offline. Definir limite baixo para testar duas espécies ultrapassando o limite, remover uma linha para voltar ao varejo; repetir m² e linear separadamente, offline depois de carregar a configuração. Conferir preços e totais na cópia/PDF. Verificar dias de entrada/saída, transferência e ajuste. Gerar PDF pequeno e extenso, conferir todas as linhas e totais. Visitar /equipe/ e /divulgacao/. Não gerar pagamentos nesta prévia.


## Correção após PDF real do usuário — 07/11

O primeiro romaneio ficou em parágrafos com rótulos repetidos e títulos por comprimento, divergindo do modelo aprovado. Substituído esse caminho por tabelas com colunas fixas, agrupadas por espécie/espessura. Unidades ficam nos cabeçalhos; espessura fica no título e largura na linha. Mantidas as colunas extras de m² de face, metros lineares e peso, além de valores financeiros quando presentes. Subtotais repetidos por comprimento são retirados; totais globais, cliente, transporte, emitente e assinaturas permanecem.

Fixture derivada dos75itens do PDF enviado pelo usuário, sem dados pessoais:75linhas e451peças conferidas, todas as células de medidas e métricas comparadas. Dois testes específicos passaram, além de3testes de integração existentes; build completo passou. Uma referência em1pA4 foi gerada separadamente e inspecionada; isso não substitui validar o PDF produzido pelo navegador na prévia.


## Segunda revisão visual — modelo compacto aprovado

O teste Android ainda dividiu em2páginas e estreitou a coluna Peso até formar texto vertical. Removida a dependência de CSS multicol para paginação: páginas e duas colunas são distribuídas explicitamente, com cabeçalho de continuação. Reset de larguras herdadas da tabela e fonte8pt em colunas fixas. Romaneio compacto padrão agora usa5colunas (peças/espessura/largura/comprimento/volume ou área), como o modelo aprovado. Área de face, metros lineares e peso permanecem nos totais globais; as métricas originais seguem nos dados. Em Configurações → PDFs compactos há opção para incluir todas as métricas em cada linha. Não altera o cálculo nem os registros.

Totais por espécie/espessura ao fim; cabeçalho, emitente, cliente e cartões reduzidos.5testes do modelo75linhas e casos300linhas passaram, com todas linhas preservadas;3testes de integração e31scripts passaram. Paginação física no Android/Carta ainda precisa ser conferida pelo usuário; nenhuma alegação de teste visual Chromium local, que continua bloqueado pelo ambiente.

## Totais finais — ajuste solicitado em seguida

Usuário corrigiu: não mudar as descrições para “Total da espessura”. Manter “Garapeira — Esp.5cm” etc e acrescentar área de face, metros lineares e peso nos totais por espessura. Implementado; peso ausente aparece não informado e peso parcialmente conhecido fica identificado como parcial, sem inventar densidades. Mantidos os totais gerais completos no topo. O quadro de total geral repetido no rodapé é retirado somente quando os cinco valores coincidem (comparação tolera sufixos de unidade); valores diferentes não são removidos. Sete testes de agrupamento/paginação/totais passaram, mais build,31scripts e3testes de integração. Atualização apenas na prévia.
