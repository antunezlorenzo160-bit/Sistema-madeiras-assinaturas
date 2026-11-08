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

## Recolher totais físicos na tela

Seção “Totais físicos e subtotal por espécie” dos carregamentos agora usa details/summary nativo, com seta e acesso por teclado, inicialmente recolhida. Os cards e cálculos permanecem intactos; documentos PDF continuam sendo gerados a partir dos dados do carregamento. Build completo e presença única do novo details verificados.


## PDF do carregamento original e cópia comercial

PDF(23) enviado pelo usuário saiu em7páginas: a projeção compacta só reconhecia o romaneio7colunas, deixando os documentos financeiros com9colunas comprimidas e preços na vertical. Agora a projeção identifica campos de preço/valor, mantém7colunas compactas (peças, espessura, largura, comprimento, quantidade comercial, preço unitário, valor), com moeda/unidade nos cabeçalhos. Origem não é removida quando presente. Métricas físicas extras e valor dos produtos ficam por espessura no resumo; subtotal/desconto/frete/outras despesas/total geral preservados em faixa compacta.

Tabelas detalhadas ou com origem que precisem de mais largura passam a uma coluna de página inteira; não são espremidas em duas colunas. Opção detalhada continua disponível em Configurações. Nove testes de tabelas/paginação/totais/preços passaram e três de integração passaram; build completo passou. Validar PDF no Android na prévia, pois teste visual local permanece bloqueado.

## Larguras monetárias no carregamento

Print seguinte mostrou preço/valor avançando sobre a tabela vizinha. Causa no CSS: regras legadas de seis colunas com nth-child!important consumiam100% antes da sétima coluna. Adicionado reset com precedência superior e larguras explícitas para as7colunas (7/8/9/10/18/23/25%), reservando espaço próprio para preço/valor. Cinco colunas também têm distribuição explícita12/14/16/18/40%. Cabeçalhos podem quebrar somente entre palavras; números continuam alinhados à direita. Distribuições somam100%;9testes do modelo e valores passaram. Não houve alteração nos dados, preços ou cálculos. Validar novamente no PDF Android da prévia.

## Indicadores superiores sem segunda linha

Print12:38 mostrou “Valor original” sozinho numa segunda linha de cartões, empurrando totais por espessura e financeiro para uma segunda folha. O clone de impressão registra agora a quantidade real de indicadores e os distribui em uma única linha de grid, com cada cartão limitado à própria coluna. Texto pode quebrar dentro da caixa, nunca criar nova fila de cartões. Cabeçalho e espaçamento dos totais finais compactados; linhas e fonte dos itens não foram alteradas. Build completo passou. Validar o resultado físico no Android/Carta na prévia.


## Planilhas na tela — totais sem repetição

No carregamento, orçamento e resumo, manter os itens e apenas o total físico do bloco (volume, área ou metragem conforme unidade). Remover subtotal detalhado repetido entre blocos. Totais completos agrupados por espécie/espessura ao final, incluindo área de face, metros lineares e peso conhecido; valores financeiros somente nas vistas comerciais. Limpeza de apresentação, sem alterar registros, preços ou eventos de edição das linhas. Prévia somente; produção preservada.


## Entrada pela página de funcionário

Funcionário já entra pelo sistema, mas a página de convite tentava resgatar novamente o convite e exigia confirmação de regras, bloqueando um vínculo já ativo. A entrada agora consulta company-session autenticado primeiro. Vínculo ativo da mesma empresa permite abrir o sistema sem novo resgate; primeiro acesso continua exigindo convite e a verificação original do servidor. Página sem fragmento permite entrar com conta já ativada. Botão muda para Entrar e senha existente usa validação de login. Contas de outra empresa, inativas, identidades inconsistentes e falhas do servidor não recebem acesso. Cinco testes cobrem os caminhos, sem alterar regras, membros nem permissões. Apenas prévia; validação manual pendente.


## Movimentação — retorno ao visual anterior

Usuário rejeitou a nova organização por dia e confirmou voltar ao visual anterior, separado por espécie e espessura. Removidos do build o renderizador novo, seus filtros, a interceptação da busca e o CSS que ocultava os indicadores originais. Renderizadores, seleção de estoque/unidade/espessura e busca originais permanecem como em main. Dados históricos não foram modificados; demais ajustes de PDFs, planilhas, preços e funcionário preservados. Somente prévia.


## Gráficos de estoque e movimentação

Adicionado painel recolhível “Gráficos de estoque e movimentação” no topo de Estoque/Movimentação. Comparação por dia/mês de entradas e saídas, filtros de datas, estoque, espécie/produto e unidade (m³ madeira, m², metro linear, granel). Gráfico de saldo atual por espécie/produto, com madeira seca e verde separadas. Datas só filtram movimentações, nunca simulam saldo histórico. Tabelas numéricas e seleção de período no gráfico permitem conferir os valores.

Transferências são mostradas à parte, sem duplicar entradas/saídas; ajustes e secagem não são novas entradas. Datas/quantidades inválidas são sinalizadas. Estoque usa lançamentos físicos remanescentes; não calcula saldo a partir de movimentos e preserva valores negativos para conferência. Sem bibliotecas externas, novas escritas, endpoints ou coleções. Usa a mesma leitura sob demanda do histórico somente ao abrir o painel; mantém as permissões de Estoque e o visual antigo da movimentação.

Seis testes de dados e quatro de interação cobrem filtros, somas, unidades, transferências, datas, madeira verde, ausência de permissão, atualização/offline, seleção de período e preservação dos registros. Build completo e scripts passaram; histórico original comparado intacto. Testes existentes de preços/planilhas/PDF/entrada de funcionário passaram. Sem teste visual do navegador local, indisponível neste ambiente; conferir celular/PC na prévia. Produção não alterada.


## Gráficos no celular — compactação V721

Print mostrou barras e valores de estoque avançando além da largura visível. Painel agora limita sua largura e contém o tamanho intrínseco das tabelas/SVG; tela fixa de Estoque recebe largura limitada no celular. Barras de estoque mais finas e intervalos menores, nomes e valores em duas colunas que cabem na tela. Tabela do estoque ajustada à largura do celular. Gráfico de movimentos usa a largura disponível, reduz a quantidade de rótulos no eixo e mantém todos os períodos/valores, sem cortar dados para caber. Redimensionamento atualiza o desenho. Computador mantém o espaçamento normal.

Testes de dados/interação e caso de93períodos em310px passaram (todos os períodos preservados e barras dentro do desenho). Build/scripts verificados. Conferir visual no celular na prévia; navegador visual local permanece indisponível. Nenhuma mudança nos dados ou na versão oficial.


## Área própria de relatórios e financeiro manual V722

Usuário pediu gráficos fora do Estoque e confirmou implementar valores de compras/vendas, despesas completas e lucro/prejuízo. Novo atalho “Gráficos e relatórios” no início/menu, com gráficos físicos na própria página. A movimentação e a planilha de Estoque mantêm seu visual. Consulta física exige permissão de Estoque; seção financeira é exclusiva do responsável da empresa, verificado também no servidor pelo vínculo canônico e ownerUid. Funcionários com consulta de Estoque podem usar os controles de consulta dos gráficos, sem ganhar escrita.

Primeira versão financeira: registros manuais de compras, vendas, despesas (madeira, frete, beneficiamento, impostos, mão de obra, energia, manutenção, outros) e perdas pelo custo. Data, descrição, cliente/fornecedor, referência e valor total. Nas vendas, custo da madeira vendida opcional como pendência explícita. Resultado = vendas − custo dos produtos vendidos − despesas − perdas; compras ainda em estoque não são subtraídas novamente. Sem custo de alguma venda, resultado fica pendente. Não é saldo bancário nem fluxo de caixa; sem conversão automática de registros antigos ou movimentação automática do estoque.

API autenticada e exclusiva do dono, validação em centavos, leitura por período limitada sem totais truncados, revisões e transações para impedir sobreposição e duplicatas de tentativa. Edição/cancelamento preservam versões, sem apagar registros. Plano em consulta não pode escrever. Confere vínculo novamente na transação e na consulta. Coleções fora do caminho de dados do cliente; regras continuam negando acesso direto. Sem alteração/publicação de regras do Firestore.

Isolamento dos dados financeiros da prévia decidido pelo build: finance-context.mjs é gerado com FINANCE_PREVIEW=true por padrão; somente CONTEXT=production produz false. Funções da prévia usam financeiroPreviaRegistros; produção usará financeiroRegistros. Isso não depende de uma variável de contexto estar presente em runtime. O formulário exige internet para salvar; erros preservam os dados preenchidos.

Validação:9testes financeiros (centavos, custo versus compras, pendências, perdas/cancelamentos, dono/billing/isolamento, versões/repetições, mudança de empresa, consulta) e4testes de formulário (leitura sob demanda, período consultado, repetição de salvamento, offline e dono) passaram.2testes de navegação e contexto passaram. Build completo, scripts e posição dos gráficos fora de Estoque conferidos.11suítes selecionadas passaram, incluindo gráficos, precificação, PDF, funcionários e navegação. Testes não fizeram chamadas reais ao Firebase nem registraram transações de clientes. Visual e endpoint real ainda precisam da conferência na prévia; navegador local indisponível. Produção não alterada.


## Transporte próprio / contratado e despesas vinculadas V723

Usuário confirmou distinguir frete cobrado do cliente dos gastos reais, inclusive combustível em transporte próprio. Campos dos ajustes do documento renomeados para “Frete cobrado do cliente” e “Outros valores cobrados do cliente”; cálculo/documentação permanecem com os mesmos valores. Carregamentos fechados ganham seção privada “Gastos do transporte”, somente para o responsável. Modos: próprio (combustível, pedágios, motorista, manutenção/pneus e outros gastos reais da viagem); contratado (transportador, pedágios/outros); cliente paga diretamente (sem despesa da empresa).

Salvar gastos registra uma despesa financeira vinculada à carga, com data informada. Frete cobrado no documento não é usado para calcular essa despesa. O total é a soma dos gastos efetivos informados. Exemplo de teste: frete cobrado200, combustível80 → despesa80. Vendas continuam manuais nesta etapa; o frete cobrado continua compondo o documento e o total da venda informada. Não registrar manualmente de novo os gastos vinculados. Não há importação de gastos antigos ou alteração de estoque.

Endpoint company-transport verifica dono canônico, plano e existência de carga fechada na empresa. Configuração e despesa têm versões; identificador estável por carga impede duplicatas em repetição e atualização. Mudar para cliente pagando diretamente/zerar custos retira a despesa vinculada dos cálculos preservando histórico; gastos podem ser corrigidos depois. Despesa vinculada não pode ser alterada/cancelada pelo formulário financeiro manual; correções pela seção da carga. Configuração/financeiro usam o mesmo isolamento entre prévia e produção. Não publica nem altera regras do Firestore. Gastos reais ficam fora dos documentos enviados ao cliente.

Consultas somente ao abrir a seção; rascunho de campos e abertura da seção preservados nos redesenhos da carga. Falha ao salvar preserva campos.10testes novos passaram (7dados/servidor e3UI), incluindo combustível versus frete cobrado, transporte contratado/direto, versões/idempotência mesmo com ordem de campos diferente, vínculo/carga/plano/empresa, cancelamento lógico e proteção do financeiro manual.8suítes selecionadas passaram; build completo e scripts passaram. Nenhuma chamada real ao Firebase nos testes; visual/fluxo autenticado precisam da conferência na prévia. Produção inalterada.
