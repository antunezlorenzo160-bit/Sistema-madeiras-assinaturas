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


## Vendas dos carregamentos conectadas ao Financeiro V724

Usuário pediu conectar também o carregamento, eliminando redigitação da venda. Consulta financeira agora inclui automaticamente uma venda por grupo de carga totalmente baixado/concluído, pelo total do documento original: soma de valores dos itens, desconto e frete/outros valores cobrados. Cópia comercial, orçamento, montagem, grupo parcialmente baixado e cargas arquivadas/canceladas não viram novas vendas. Data é a da baixa completa, no horário de Brasília, incluindo casos após meia-noite UTC. Consulta não grava nem modifica cargas, estoque ou lançamentos; venda é uma projeção atual do carregamento. Ao abrir novamente o Financeiro, a consulta é renovada.

Custo da madeira permanece pendente até ser informado, sem inventar custo pelo preço de venda. Cada venda vinculada tem seção para informar custo e considerar/desconsiderar a carga como venda (por exemplo, uma remessa interna). Configuração privada e versionada por empresa/contexto. O valor da venda sempre acompanha o original, sem edição avulsa; mudança de quantidade/peças invalida o custo anterior para nova conferência, enquanto correção monetária preserva o custo quando os produtos não mudam. Revisa assinatura dos dados da carga, dono canônico, plano e revisão da configuração na transação.

Se há venda manual ativa com mesma data e valor, a carga fica pendente de conferência e não é somada de novo; o resultado também fica pendente, com venda parcial identificada. Usuário escolhe se é uma venda diferente ou substitui um lançamento manual. Substituição explícita exige data/valor/revisão compatíveis, cancela o manual preservando histórico e mantém uma única venda vinculada. Não cancela nem vincula registros por suposição. Repetição do mesmo salvamento não duplica registros.

Leituras de cargas apenas por período consultado, com limites explícitos (sem totais truncados) e consulta do grupo inteiro para não somar baixa parcial. Não cria índices compostos, não publica regras e não faz varredura ao abrir o sistema. Dados financeiros auxiliares da prévia continuam isolados em financeiroPreviaRegistrosVendasCarga; cargas são somente lidas no caminho canônico da empresa. Acesso financeiro exclusivo do responsável. Gastos de transporte vinculados continuam sendo despesas separadas; compras e vendas avulsas seguem manuais.

Validação:10novos casos de modelo/servidor passaram: paridade com função real do documento, data e status, ausência de escrita em consulta, agrupamento/baixa parcial, custo e alterações da carga, conferência manual sem duplicação, substituição idempotente, autorização/revisões, dados manuais incompatíveis e imutabilidade.2casos novos de UI cobrem venda/custo automático e conferência explícita de manual.10suítes selecionadas passaram, incluindo transporte, financeiro, navegação, preços e PDF. Build completo e scripts válidos. Sem chamadas reais ao Firebase nos testes e sem teste visual local. Conferir na prévia antes de publicar oficialmente.


## Erro intermitente ao preencher placa — V587

Print reportou ReferenceError: preencherTaraPorPlacaV587 is not defined. A função real existia dentro do módulo de carregamentos, mas o oninput da placa a chamava como global e somente atualizarTransportePendenteV414 havia sido exposta. Adicionada a ponte window.preencherTaraPorPlacaV587 no mesmo módulo, preservando a função e as permissões existentes, sem stub nem supressão do aviso.

Teste executa o oninput gerado pelo formulário real em ambiente com módulo fechado: placa normalizada busca a tara válida mais recente; tara manual não é sobrescrita; placa vazia/desconhecida e evento após fechamento do formulário não lançam erro; nenhuma escrita de dados ocorre ao preencher.4casos novos,3suítes de transporte/permissão, build e scripts passaram. Não altera dados, cache, login ou regras. Somente prévia; versão oficial preservada.


## Margem, lucro e prejuízo automático V725

Usuário esclareceu que “perda” no resumo significa prejuízo quando as despesas ultrapassam a margem, e não perda física de madeira. Quadro agora mostra Margem antes das despesas, Lucro do período e Prejuízo do período. Margem = vendas − custo da madeira vendida; resultado continua margem − despesas − perdas físicas registradas. Lucro=max(resultado,0); prejuízo=max(-resultado,0). Prejuízo é somente indicador derivado, nunca novo lançamento nem nova dedução. Exemplo validado: venda20000, custo13000, margem7000, despesa8000 → prejuízo1000.

Gráficos e tabela por período mostram lucro/prejuízo derivados, com alerta quando despesas superam a margem ou venda fica abaixo do custo. Perdas físicas seguem preservadas, rotuladas “Perdas de madeira / material”, e o cartão só aparece quando há valor registrado. Formulário explica essa distinção. Sem custos completos/conferência de duplicidade, margem/lucro/prejuízo permanecem pendentes. Total do período usa o resultado líquido e não soma lucros/prejuízos de meses separadamente. Nenhum registro existente é alterado, nem os preços são reajustados automaticamente.

Três casos novos de cálculo cobrem margem ultrapassada/dedução única, lucro/equilíbrio/pendência e compensação de meses. Um caso UI verifica alerta/cartão/gráfico de prejuízo automático sem criar perda manual.12testes financeiros e7UI passaram; build/scripts e suites de carregamentos/transporte conferidos. Apenas prévia.


## Lucro mínimo geral configurável V726

Usuário esclareceu que quer um limite mínimo configurável (análogo ao estoque mínimo), com aviso quando a venda rende menos, inclusive quando ainda positiva. Escolheu limite geral da empresa; após exemplo100custo+20%=120venda respondeu “mais ou menos isso”. Implementada prévia explicitamente sobre o custo (acréscimo, não percentual sobre receita), com exemplo dinâmico. Campo em Financeiro → Configurar lucro mínimo da empresa. Sem percentual predefinido/ativo; vazio desliga,0avisa venda abaixo do custo. Percentual de0a1000com2casas; arredondamento para cima em centavos por venda usando inteiros.

A meta atual é aplicada a todas as vendas consultadas da empresa, sem alterar preços/dados. Cada venda com custo conhecido recebe status “Abaixo do mínimo da empresa” ou “Mínimo atendido”, comparando valor de venda e custo da madeira antes das despesas, e mostra ganho mínimo esperado/preço mínimo compatível. Custos/conferência faltantes permanecem pendentes, nunca status positivo inventado. O quadro também mostra lucro mínimo esperado e alerta se despesas deixam o resultado final do período abaixo da meta. Uma venda ruim é sinalizada mesmo quando outra compensa o total. Despesas gerais não são rateadas por suposição entre vendas. Não bloqueia nem reajusta preços.

Configuração privada por empresa/contexto financeiro, exclusiva do responsável no servidor, com plano, rechecagem de vínculo, revisão, histórico e salvamento idempotente. Retorna na consulta financeira existente; apenas1leitura adicional e nenhum novo acompanhamento em tempo real. Coleções da prévia isoladas dos dados oficiais pela regra já gerada no build. Nenhuma regra Firestore alterada. Custos de compra ainda não são automáticos; avisos dependem do custo informado na venda.

Validação:8casos modelo/servidor de mínimo (desligado, parsing/exemplo, venda positiva abaixo/meta igual, pendências/cancelados/custozero, centavos, despesas/compensação de vendas, persistência/versão/isolamento e dono/plano/vínculo) e3novos casos de UI passaram. Dez casos de UI financeiros ao todo passaram. Casos de transporte/vendas/PDF/entrada e build/scripts conferidos. Apenas prévia; conferir visual e uso real antes de publicar.


08/11 — V727: beneficiamento separado da meta da madeira. Percentual do serviço é escolhido pelo usuário considerando gastos/mão de obra; sem novo cadastro de custo nem despesa automática. Novos lançamentos diretos de carga m³ guardam valorMaterial/valorServicos e valor completo, corrigindo adicional visto na calculadora mas ausente no valor salvo. Snapshot de percentuais preservado; varejo/atacado recalcula adicional para novas linhas marcadas. Linear preserva cobrança de encaixe/friso ao reprecificar. Cargas antigas/fechadas não são regravadas.
Consulta financeira separa somente valores conciliáveis com total original; aplica desconto proporcional uma única vez, frete/outros fora do preço da madeira. Se marcação antiga de serviço não permite provar a composição do total, receita original permanece e mínimo fica pendente, sem inventar custo/adicional. Quadro e detalhes mostram serviços dentro da receita, sem somá-los novamente. Meta individual usa madeira sem serviços; meta do período não deixa receita de serviços compensar margem baixa da madeira. Resultado contábil anterior preservado, com texto esclarecendo que considera gastos registrados e não comprova lucro líquido do serviço.
Validação: testes de composição/desconto/pendência/linear, novos lançamentos/reprecificação, meta individual/período e UI. Nove suítes pertinentes aprovadas; build completo e31 scripts válidos. Testes não escrevem Firebase. Apenas prévia12; visual real a conferir no celular.


## Compras no descarregamento e custo médio V728 — 08/11

Entrada optativa na Calculadora, ao escolher Est.1/Est.2, exclusiva do responsável. Painel Compra/descarregamento para madeira m³ e a granel: fornecedor, data, documento, preço de compra por m³ por item, até200itens. Lançar peça adiciona ao rascunho; estoque só entra ao confirmar. Preço de venda/catalogo não é modificado. Fluxo antigo permanece disponível sem marcar compra. Verde preserva prazo de secagem. Rascunho local por empresa; confirmação online com identificação persistida e tentativas idempotentes. Resposta incerta bloqueia nova identificação até conferir; navegador sem armazenamento durável não confirma.

POSTcompany-stock-purchase valida proprietário canônico, empresa da tela, vínculo dentro da transação, plano, e-mail, unidade de catálogo, medidas/volume e limites. Uma transação cria estoque físico, movimentos e uma compra financeira com histórico.200itens=403escritas, abaixo do limite500. Leituras de catálogo/IDs paralelas antes de qualquer escrita. Repetir após consumir estoque não recria a entrada. Valores de compra ficam no namespace financeiro privado; estoques/movimentos públicos guardam apenas referência física, sem preço de compra. Registro vinculado não pode ser editado/cancelado como financeiro avulso. Correção/estorno de compra confirmada não implementados nesta etapa.

Frete/outros já incluídos não somam; não incluídos compõem aquisição e são rateados pelo valor dos itens, com todos os centavos reconciliados. Entram na compra/custo de estoque, não em uma segunda despesa automática. Data informada identifica compra financeira; entrada física usa a confirmação. Nova compra não altera custos de saídas anteriores.

Financeiro deriva CPV médio ponderado móvel das entradas com preço e das saídas reais. Pool por madeiraId/unidade/bitola/comprimento/verde-seca, compartilhado entre Estoques1/2; transferências não compram nem vendem. Usa histórico cronológico; novas baixas guardam instante imutável também na fila de recuperação offline. Não usa preço de venda como custo. Custo manual conferido é preservado; UI permite voltar ao automático. Alterações físicas exigem reconferência. Estoque antigo sem custo completo, ajustes sem histórico confiável, falta de movimento ou divergência de volume deixam CPV pendente. Sem migração nem valorzero inventado. Beneficiadosm²/linear não recebem CPV automático nesta etapa.

Consultas somente sob demanda no financeiro; recibos privados limitados1000, até20espécies por consulta de CPV, históricos/estoques filtrados por madeiraId e limitados a10000registros combinados (sem totais parciais de custo; fica pendente se exceder). Nenhum listener novo. Financeiro da prévia isolado do oficial. Nenhuma regra Firestore alterada. Testes não escrevem Firebase.

Validação:19suítes pertinentes aprovadas, incluindo7casos compra/servidor,5UIcompra,5custo médio e novo casoUIfinanceiro; compra grande/403escritas, tentativas após consumo, dono/empresa/plano/vínculo, desconto de aquisição, média/ordem/centavos, legado pendente, confirmação incerta/offline e não congelar CPV automático. Build e31scripts válidos. Chromium automatizado bloqueado no ambiente (processo encerra ao iniciar); visual real deve ser conferido no celular. Apenas prévia/PR12, sem publicar produção.
