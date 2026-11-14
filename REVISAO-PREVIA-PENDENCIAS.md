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


## Indicador varejo/atacado na calculadora V729 — 08/11

Relato: limite10m³, carga29,2285m³, largura vazia ainda mostravaR$2500varejo. Causa na exibição: preview retornava antes de calcular a faixa quando volume da próxima peça era zero, e nunca atualizava o preço ao lado da espessura. Agora mostra preço/faixa/volume/limite do documento mesmo com largura vazia; preenchendo medida mostra previsão após lançamento. Mantém preço-base interno e restaura indicador ao sair de Orçamento/Carga. Sem preço atacado, aviso explícito e varejo preservado. Catálogo antigo sem bitolas aproveita o precoAtacado já cadastrado.

Limites continuam registrados por documento. Carga legada ou iniciada com outros limites mostra informação e botão Aplicar limites e preços atuais. Ação explícita do dono somente no grupo atual em montagem, sem baixa/fechamento: atualiza snapshots/preços pelo cadastro e fila offline/resumo, inclusive se valores monetários coincidem. Demais cargas, orçamentos salvos e estoque não são alterados. Preço próprio bloqueado/verde preservado; política do grupo é alinhada para as próximas linhas. Desligar a configuração geral não quebra um documento já ativo com snapshot habilitado.

Validação:7novos casosUI (29m³/largura vazia, igualdade10/próxima peça, atacado ausente, limites antigos/adoção sógrupoatual, legado/desativação geral, restauração/verde, preservação do beneficiamento);1caso catálogo legado.9suítes pertinentes, build e31scripts passaram. Valores2500/2200 são sintéticos nos testes; nenhuma leitura ou escrita Firebase pelas ferramentas. Visual real a conferir no celular; navegador automatizado deste ambiente continua bloqueado. Apenas prévia12.


## Preços automáticos sem painel na calculadora V730 — 08/11

Nova captura confirmou que o checkbox estava desmarcado. Preencher limites não ativa a regra; usuário orientado a marcar e salvar. Mantida ativação explícita, com rótulo Ativar preços automáticos. Removidos o aviso/botão e todo elemento extra dentro da célula Valor: volta o resumo compacto original, sem painel explicativo. Preço por m³ continua refletindo a faixa; aviso de atacado ausente permanece nos mecanismos existentes do documento e título do preço.

Ao ativar/recarregar política, e ao abrir/recalcular a carga atual, o grupo atual em montagem passa a usar os limites habilitados, inclusive linhas iniciadas sem autoPriceV1. Não exige outro botão. Somente dono, grupo ativo, sem baixa/fechamento e com catálogo carregado; outras cargas conservam suas políticas e fechadas não são reprecificadas. Metadados/valores são enfileirados por ID e resumo/local atualizados; rerender estável não repete a escrita. Verde/bloqueado e serviços preservados. Políticas desativadas não adotam carga legada. Orçamentos salvos continuam preservados.

Validação:7casosUIatualizados, incluindo10,4748m³ desativado→ativado,29,2285m³ sem largura com mudança no valor real da carga, limite exato10/previsão, ausência de painel, somente grupo atual, outros grupos/fechados, verde e serviço;8suítes pertinentes, build e31scripts passaram. Testes usam preços sintéticos, sem Firebase real. Apenas prévia12; navegador automatizado do ambiente segue bloqueado.


## Ícones nas opções do menu V731 — 08/11

Pedido: usar referências visuais em cada seletor, como a engrenagem existente. Títulos dos12atalhos de início ganham ícones relacionados à ação; os clones do menu lateral herdam os mesmos ícones. Início dinâmico ganha casa; Produção usa fábrica via CSS, preservando integralmente o módulo de permissões/geração desse botão. Ícones inline, sem dependência externa; os elementos decorativos dos títulos são aria-hidden. Rótulos, descrições, rotas, eventos e visibilidade por permissões mantidos.

Validação: build completo,31scripts,12opções de atalhos e entradas dinâmicas conferidos. employee-navigation-visibility e preview-integration aprovados; caso de regras/guardas em employee-load-access aprovado. Um caso antigo dessa suíte continua falhando por falta de priceLoadServices no contexto simulado, reproduzido também sem nenhuma alteração de ícones. Nenhuma regra nem dado alterados. Apenas prévia12.


## Custo do estoque antigo V732 — 08/11

Usuário informou mistura de saldo antigo sem custo e autorizouR$1000/m³ para esse saldo. Adicionada opção recolhida Financeiro → Custo do estoque antigo, com1000,00preenchido como proposta ainda não aplicada. Não há sessão autenticada do usuário nas ferramentas: gravação exige clique em Salvar dentro da conta. Nenhum valor é aplicado automaticamente a nenhuma empresa pela publicação.

POSTcompany-opening-stock-cost e política privada por empresa/contexto financeiro, dono canônico, empresa da tela, e-mail/plano/vínculo rechecados em transação, revisão, histórico e tentativas idempotentes. Primeiro salvamento define corte temporal; alterações/desativação conservam esse corte. Não escreve compra, despesa, preço de venda, cadastro ou quantidade. GETfinanceiro retorna política e a mesma instância alimenta a projeção de custo.

Custo médio usa o valor autorizado para entradas antigas de madeira m³ sem compra com custo e para saldo inicial inferido com evidência histórica anterior ao corte. Compras com preço guardado mantêm custo real, inclusive frete de aquisição; custo manual conferido permanece prioritário. Madeira seca/verde continua separada por medidas. Granel, m² e linear não recebem essa valorização geral da madeira. Entradas sem preço posteriores ao corte continuam pendentes; novas entradas legadas recebem instante imutável. Histórico/balanço inconsistente não é liberado pela mera configuração de preço. Sem recibos de compra, a valorização antiga ainda funciona se houver histórico físico suficiente. Nenhuma regra alterada.

Validação:12suítes pertinentes, build e31scripts aprovados.2casos política/servidor,3cenários de média nova/antiga/corte,1integração GET+salvar+recalcular sem nova compra e preservação manual,1UI exige clique autenticado e mantém formulário na falha. Teste1m³ antigo1000+1m³ novo2000→média1500. Bancos simulados; nenhuma chamada Firebase real. Apenas prévia12.


## Teclado móvel da calculadora V733 — 08/11

Pedido: manter teclado ao lançar, ocultar pela seta e poder rolar campos com ajuste da área visível. Controlador DOM apenas na Calculadora móvel com ponteiro de toque. Cancela transferência de foco por mousedown nos controles locais/área vazia, sem cancelar touchstart/touchmove nem pointerdown de rolagem. Seletores nativos, navegação e saída da tela mantêm comportamento próprio do celular. Não usa laço de focus nem API para forçar abertura do teclado.

Viewport visual da janela pai usado quando a calculadora está no iframe; altura/topo local via CSS e main com rolagem vertical e zoom permitidos. Campo é trazido à área visível ao focar ou abrir teclado, sem puxar a rolagem de volta a cada gesto. Expansão do viewport ao ocultar o teclado desarma restaurações imediatamente, mesmo antes do próximo rAF. Perda de foco/saída/ocultação da página também interrompe restauração. Reabre via toque explícito no campo. Não há garantia de controlar fechamento pelo Android, seleção nativa ou navegação fora da calculadora.

Lançamento captura a geração de foco. Retornos tardios de m³/m²/linear/granel/fechado respeitam a ocultação e troca de campo; Limpar também respeita. Enter de pacotes deixa de chamar blur no móvel. Repetições de foco de m³ não limpam dígitos já digitados nem selecionam novamente após ocultação. Desktop preserva atalho Espaço e comportamento nativo. Sem alteração de contas/valores/cálculos/filas do estoque.

Validação:6casos novos cobrem retenção, ausência de bloqueio de gestos, viewport pai, rolagem livre, seta e commitIME, troca de campo/saída/desktop, Enterpacotes e execução dos callbacks reais gerados sem apagar digitação rápida.9suítes pertinentes, build e32scripts válidos. Teclado nativo real precisa ser conferido no Samsung do usuário; o navegador automatizado do ambiente não disponibiliza esse teclado. Apenas prévia12, produção não alterada.


## Custo ainda pendente após salvar a base antiga V734 — 08/11

Usuário confirmou que já salvouR$1000/m³. Sem sessão autenticada para ler os documentos reais; investigados e reproduzidos três bloqueios do modelo: saldo inicial reconstruído cuja primeira saída foi posterior ao corte, ajuste rápido de conferência tratado como tipo desconhecido e diferença nanométrica de arredondamento negativando o saldo inicial.

Saldo positivo anterior a todo o histórico é agora valorado pela política antiga salva, independentemente da data da primeira saída. Entradas efetivamente registradas após o corte sem preço continuam pendentes; compras conhecidas conservam custo real. Ajuste só é normalizado quando tem flag ajusteConferenciaV390, grupo e saída da mesma medida: entrada virtual imediatamente anterior à saída, coerente com o fluxo existente que registra o ajuste depois. Não vira compra financeira nem alteração de estoque. Ajustes genéricos, ausência de par, referência de compra danificada, falta física real ou ordem temporal insuficiente continuam bloqueados. Ajustes posteriores ao corte sem custo não recebem preço antigo por suposição.

Tolerância limitada ao erro acumulado de arredondamento em unidades de1e-9m³, máximo1e-6m³; falta real não é liberada. Quantidade consumida para custo não excede saldo positivo disponível e centavos são preservados. Projeção retorna motivos específicos para compra sem referência/custo, movimento ausente, entrada posterior ao corte, saldo divergente, dados inválidos ou limites de conferência. Detalhes existentes da venda exibem esses motivos; sem novo painel. Nenhuma mudança da política salva, compra/despesa/venda, preços, quantidade ou custos manuais conferidos. Consultas seguem sem escrita.

Validação:4novos casos de modelo (abertura posterior ao corte, conferência antiga/futura, arredondamento e proteção/diagnóstico),1integração de política salva antes da primeira saída sem regravar nem duplicar ledger;12casos de modelo ao todo.8suítes pertinentes passaram; build e32scripts válidos. Apenas prévia12. Nenhuma ferramenta leu ou alterou Firebase real.


## Conferência financeira por venda V735 — 08/11

Resumo principal reduzido a vendas, custo total vendido, despesas e resultado. Conta de cada venda antes dos gráficos: total vendido, custo TOTAL, volume físico quando disponível, equivalente aproximado por m³, origem manual/média e gasto de entrega vinculado no período. Custo manual diferente do automático recebe aviso de conferência; nenhum valor é corrigido automaticamente. Compras/metas/totais adicionais e gráficos ficam recolhidos. Cadastro esclarece diferença entre custo total e preço por m³.

Reconciliação usa somente registros ativos nas datas consultadas; despesa geral ou de outra carga não é rateada por suposição. Frete cobrado permanece na receita e gasto real separado. Soma dos custos e resultado por venda são validados contra o agregador existente. Volume vem das dimensões físicas, sem volume comercial acrescido. Sem mudanças de estoque, preços, políticas, escrita financeira, filas ou regras.

Validação:8 suítes pertinentes passaram (interface, reconciliação, vendas, compras, custo médio, mínimo, transporte e teclado); build limpo e32scripts válidos. Caso sintético reproduz os totaisR$71.176,17/R$14.330/R$4.000, sem presumir quais são os custos reais por carga. Sem sessão Firebase autenticada para auditar registros reais. Apenas prévia12; produção inalterada.


## Compra unitária e correção de custo da carga V736 — 08/11

Conferido o fluxo existente: entrada recebe preço por m³, calcula o custo total privado e fornece média às saídas vinculadas. Teste integrado confirma compra10m³×R$1300=R$13000 e saída4m³ com custo automáticoR$5200, sem escrita na consulta. Custos manuais existentes mantêm prioridade e não são reinterpretados.

Correção do custo de carga permite escolher Total ou Preço por m³ quando há volume físico confirmado. Troca de modo limpa o campo para não reinterpretar o número anterior; prévia mostra volume×preço=total e envia somente o total à API existente. Custo automático continua padrão quando disponível. Conversão em centavos/BigInt com arredondamento e limites, sem usar volume comercial ou valor de venda. Falhas preservam a entrada para retry. Madeira sem custo continua pendente, sem estimativa silenciosa. Sem migração de dados ou regravação de compras/custos reais.

Validação:8suítes pertinentes passaram; testes de conversão, limites, UI/retentativa e integração compra→venda. Build limpo e32scripts válidos. Nenhum acesso autenticado ao Firebase real; pendência específica da nova carga ainda depende de sua mensagem de diagnóstico. Apenas prévia12, produção inalterada.


## Automático como padrão e diagnóstico de compra V737 — 08/11

Usuário confirmou que não viu mensagem antes de preencher1300 manualmente. Ligação compra→média→saída já existe e foi validada naV736; não há sessão Firebase para determinar o bloqueio específico real. Esta revisão não declara a causa resolvida sem evidência.

UI agora mantém opção de custo automático marcada também quando ainda pendente, em vez de conduzir a digitação manual. Campo de correção fica desabilitado enquanto automático. Mensagem de motivo é exibida junto à venda e nos detalhes. API expõe automaticCostPendingReason mesmo quando há override manual; a conta da venda mostra o motivo e informa que o valor manual foi mantido. Alteração de peças/quantidade tem diagnóstico próprio. Retentativa mantém campos automáticos desabilitados e custo pendente nunca é mostrado como0. Nenhum custo manual existente é substituído ou reinterpretado.

Validação:8suítes pertinentes passaram, incluindo novos casos de automático pendente, motivo sob override manual e ausência dezero indevido. Regressões compra→venda, média, transporte, meta e teclado verdes. Build limpo/32scripts válidos. Sem mudanças de algoritmo contábil, estoque, escrita financeira, preço, filas ou regras. Apenas prévia12. Para investigar uma carga real, consultar o motivo após atualizar a prévia.


## Selecionar cliente sem ReferenceError V738 — 08/11

Screenshot:camposClienteV407 is not defined ao escolher cliente cadastrado para a carga. Causa reproduzida:listenerV492 executa fora da closureV407 e referenciava seu const privado. Build passa a usar camposClientesV492, schema local já usado pelo cadastro. Campos inexistentes no formulário são ignorados; dados são atribuídos por value, nunca por HTML. Seleção só marca formulário pendente, sem salvar carga/cliente, emitir operações offline, mexer em estoque ou financeiro.

Validação:no handler real extraído do TEMPLATE gerado, versão anterior reproduz exatamente ReferenceError; corrigida preenche16campos, preserva registro cadastrado e exige Salvar dados do cliente. Seleção vazia/removida não modifica formulário.3suítes pertinentes passaram (cliente/financeiro/teclado); build limpo e32scripts válidos. Somente prévia12; não há alteração de regras, permissões, login ou produção.


## Conferência física V391 no custo automático V739 — 08/11

ScreenshotLeopoldo:10,325m³/vendaR$3850,custo pendente por ajuste no histórico,2itens sem valor de venda. Fonte revela dois fluxos distintos:V390 cria ajuste virtual consumido pela própria baixa (já suportado);V391 acrescenta estoque real antes de o usuário dar baixa separadamente (faltava suporte). Sem sessão Firebase para confirmar a flag do documento real; pergunta de origem pendente ao usuário.

Modelo agora normaliza somente ajusteConferenciaV391=true com grupoCargaId como entrada física, mantendo sua própria data e saldo remanescente, sem exigir saída da mesma carga. Não antecipa a data para caber na política antiga. Entrada anterior ao corte pode usar política antiga já salva; ajuste novo sem compra/custo continua pendente com mensagem específica sobre madeira acrescentada sem custo. Preço de venda e valor do ajuste nunca são adotados como custo. Ajustes não identificados continuam pendentes. Nenhuma criação de compra, despesa, estoque ou correção de valores manuais.

Validação:2novos casos cobrem saldo parcial, consumo por outra carga, política antes/depois do corte, ausência de política, proteção de ajuste genérico e imutabilidade.7suítes pertinentes passaram (média, compra, venda, reconciliação, cliente, UIfinanceira, teclado). Build32scripts válido. Apenas prévia12. Não afirmar que a pendência real será resolvida se o ajuste posterior não tiver custo.


### V739 complemento — ajuste usa a base de custo conhecida

Usuário não sabe a origem exata da carga, mas determinou que ajuste/estoque existente deve aproveitar o custo já conhecido. Implementada regra para conferências físicas explícitasV390/V391: quando o saldo da mesma madeira/medida/estado tem valor conhecido e positivo no instante anterior, quantidade acrescentada é avaliada proporcionalmente pelo custo médio contábil existente. Não usa valor de venda, preço de outra espécie/medida/estado ou compra futura. Saldo sem base conhecida continua pendente. Sem lançar nova compra, despesa ou gravar valores durante consulta.

Projeção marca usesConferenceAverage; API e conta da venda explicam a origem da avaliação do ajuste. Override manual confirmado continua preservado.3novos testes:compra1300/ajuste/venda4m³=5200;duas compras1300/1500 mantêm média1400; proteção contra compra futura/outra espécie/saldo sem preço. Teste integrado comprova consulta sem escrita e metadado na venda.7suítes/build32scripts passaram. A mensagem de2itens sem preço de venda é independente e não é corrigida nem preenchida por esta alteração.


## Referência por espécie para ajuste de bitola sem custo V740 — 09/11

Autorização explícita do usuário:usar como referência o custo médio conhecido da mesma espécie e condição(seca/verde), quando a própria bitola não tiver base. Implementação preserva pools físicos separados por espécie/unidade/estado/dimensões; ordem de preferência:custo conhecido atual da própria medida, última base própria conhecida se esgotada, média ponderada conhecida das outras medidas da mesma espécie/unidade/estado, última média dessa espécie conhecida se saldo esgotado. Sem referência conhecida, permanece pendente. Apenas ajustes de conferência explícitosV390/V391 recebem essa referência; entrada comum sem custo ou saldo inicial desconhecido não são reclassificados.

Cálculo percorre eventos globalmente por data; cada instante usa referência de antes daquele instante, evitando compras futuras, empate de timestamps e dependência da ordem dos documentos. Quantidade ajustada passa a participar da média posterior; referências podem seguir cronologicamente sem ciclo. Não mistura espécies, seca/verde oum³/granel. Valores em centavos/BigInt; ajuste é arredondado uma vez ao centavo e saídas conservam o total. Mantém validação física e limites existentes. Nenhuma consulta extra ou escrita financeira, compra duplicada, estoque, preço de venda, política privada ou override manual alterado.

API inclui usesSpeciesReference e UI informa quando outras medidas serviram de referência, tanto na conta da venda quanto na conferência. Registros manuais anteriores continuam prioritários, para não substituir silenciosamente valor confirmado. Não acessados os registros reais da carga do usuário.

Validação:9suítes pertinentes passaram (modelo médio, compra, vendas, UIfinanceira, reconciliação, meta, transporte, cliente e teclado). Casos novos cobrem média ponderada entre medidas, baixa anterior à referência, ausência de compra futura/no mesmo instante, prioridade própria/esgotada, separação seca/verde/entrada comum, integração APIsem escrita, mensagemUI, ajustes encadeados, centavos e referência histórica após esgotar estoque. Build limpo/32scripts válidos. Apenas prévia12, produção inalterada.


## Viagens compartilhadas entre clientes V741 — 10/11

Pedido autorizado:implementar viagem única com carregamentos separados por cliente, madeiras variadas, gasto compartilhado uma vez, rateio por volume físico e resultado por cliente/viagem/período; testar apenas na prévia.

Novo gerenciador recolhido em Financeiro→Viagens com vários clientes, com atalho em Gastos do transporte das cargas. Consulta por datas, seleção de2a20cargas originais fechadas emm³/granel, destino comum/placa/motorista/data e gastos reais (contratado, combustível, pedágios, motorista, manutenção, manuseio/funcionários e outros). Documentos individuais e baixas continuam nos carregamentos originais. Não cria outra venda ou baixa de estoque ao vincular. Romaneio geral imprimível/PDF agrupa clientes e itens, sem expor custo de compra.

Rateio cumulativo comBigInt, por volume físico de todas as espécies do cliente e ordenação estável deID, fecha todos os centavos. Uma única despesa privada por viagem, identidade determinística e configuração/versionamento auditável. Edição posterior de gastos atualiza a mesma despesa; zero a retira dos cálculos. Cancelar libera os vínculos e cancela só a despesa compartilhada, preservando pedidos, vendas e gastos exclusivos. Cada carga só pode integrar uma viagem ativa; vínculo e despesa são transacionais. Gastos de transporte já existentes são mantidos como exclusivos e exigem reconhecimento explícito antes de salvar; não são migrados nem duplicados automaticamente.

Financeiro distribui somente a parte da despesa às vendas do período presentes; sobra referente a pedidos fora do período fica em outras despesas do período. Resultado agregado continua fechando exatamente com o ledger. Volume físico alterado após vínculo tem rateio recalculado na consulta, sem novo lançamento; origem inválida bloqueia conferência em vez de inventar share. A visão completa da viagem usa todos os gastos dos pedidos, independentemente da data; consulta financeira continua obedecendo suas datas. Relatório respeita custo manual existente, média automática e conferência de duplicidade de venda. Pedidos sem baixa/custo e membros ausentes deixam resultado pendente; membro ausente ainda permite cancelar viagem.

Endpointcompany-shared-trips:autenticação, e-mail confirmado, proprietário canônico, plano, empresa e revisão revalidados na transação. Prefixos privados de prévia/produção mantidos. No máximo20pedidos,400itens/pedido,2000itens/viagem e40cargas na consulta; limites explícitos em leituras. Nenhuma regra Firestore, permissão, preço ou algoritmo de custo de estoque alterado. Fonte shared-trip é protegida contra editar/cancelar pelo ledger genérico. Consultas não escrevem. Falha de resposta preserva formulário eID para retentativa; vínculo impede segunda viagem com mesmos pedidos após recarregar.

Validação:11suítes pertinentes passaram, incluindo novas deUI/serviço. Casos:rateio3clientes5/3/2m³ eR$3000→1500/900/600, arredondamento, retry, edição de gasto/quebra na estrada, exclusividade, autorização, mudança de empresa durante transação, gasto exclusivo/ack, relatório/financeiro sem dupla contagem, alteração de volume, cancelamento, membro ausente, custo zero, romaneio escapado e sem custos privados, e diferentes espécies no mesmo pedido com custos próprios. Payload real do cliente validado pelo normalizador do servidor; salvamento bem-sucedido e falha preservando campos testados. Build limpo/32scripts válidos. Chromium tentado comperfil em/tmp, bloqueado pelo sandbox emsetsockopt(Operation not permitted); não houve verificação visual em navegador real nem acesso autenticado aoFirebase. Teste visual será no celular do usuário. Apenas prévia12; produção inalterada.

Teste sugerido:Financeiro→Viagens com vários clientes→Consultar cargas e viagens→selecionar3cargas fechadas→destino/placa/motorista→gastos comuns→conferir reconhecimento de exclusivos, se existirem→Salvar viagem e rateio. Conferir tabela por cliente/total, emitir romaneio geral, consultar período no Financeiro e editar manutenção para confirmar recálculo sem duplicar despesa.


## Organizar viagem diretamente na lista de Carregamentos V742 — 10/11

Usuário definiu a lista de destinos como lugar da seleção e confirmou que toda configuração deveria ocorrer ali. GerenciadorV741 movido para um host estável dentro de Carregamentos, fora do painel de lista que é recriado ao abrir/buscar cargas. Não duplica formulário/IDs e não migra configurações, despesas ou viagens salvas. Financeiro mantém somente atalho e resultados; registros de despesa têm link de retorno à viagem.

Nova ação owner-only Criar viagem com vários clientes ativa seleção por checkbox ao lado das cargas fechadas emm³/granel. Clicar na linha durante seleção marca/desmarca; fora desse modo conserva abrir o original. Busca/fuzzy-search oculta também a caixinha/wrapper, seleção pode atravessar pesquisas. Contador e Montar viagem exigem2a20pedidos. Durante conferência do servidor, botões/checkboxes ficam bloqueados; falha preserva a seleção. Cancelar seleção só limpa o conjunto local.

GETcompany-shared-trips?loadIds agora permite conferir somenteIDsselecionados, com mesmos limites/owner/e-mail/plano/empresa e sem escrita. Evita depender de uma consulta ampla de datas para carregar pedidos marcados de períodos distintos. Se todos já pertencem à mesma viagem, abre a existente; mistura com viagens diferentes dá mensagem para usar viagens salvas/cargas livres. Criação nova traz clientes para o formulário na mesma aba Carregamentos, com destino/placa/motorista/gastos/rateio/romaneio; edição não salva pede confirmação antes de substituir o rascunho. Botão Voltar à lista preserva a edição.

CSS escopado para o gerenciador fora do Financeiro, com caixas de seleção tocáveis, campos responsivos e atributo hidden respeitado. Guard de ações dos funcionários no TEMPLATE final estendido para#sharedTripsV741; fonte employee-frame preservada para manter build idempotente. Endpoints continuam revalidando proprietário canônico. Nenhuma mudança nas permissões de áreas, regrasFirestore, estoque/baixa, preços, compras, rateio ou lançamentos financeiros.

Validação:8suítes pertinentes passaram (viagemUI/serviço/posicionamento, navegação/permissões, financeiroUI, reconciliação, cliente e teclado). Testes novos de seleção/lista sem alterar itens, consulta deIDssem filtro de datas/sem escrita, abertura somente emCarregamentos, erro preservando seleção, cancelamento local, original abrindo fora do modo seleção, reabertura de viagem vinculada semPOST, colocação real no TEMPLATE, busca escondendo checkbox junto da linha e guardnegando controles financeiros movidos para funcionários. Build limpo/32scripts válidos. Teste visual no celular; não houve acesso aos dados privados reais. Apenas prévia12, produção inalterada.

Teste sugerido:Carregamentos→Criar viagem com vários clientes→marcar pedidos→Montar viagem→destino/caminhão/motorista/gastos→Salvar viagem e rateio. Tudo fica nessa área; Financeiro recebe os valores automaticamente conformeV741.


## Troca de tipo linear da calculadora no offline V743 — 13/11

Usuário esclareceu que a travada ocorria ao selecionar tipo na Calculadora, não ao salvar o cadastro. Investigação do salvamento não gerou mudanças. Encontrado trabalho indevido na prévia linear:previewDocumentValue chamava repriceLoads em toda seleção/edição, percorrendo carregamentos em montagem, enfileirando diferenças e reescrevendo os arrays locais mesmo sem lançar peça.

Correção restrita ao modo linear:prévia calcula a tarifa/total do candidato sem chamar a rotina de alteração/persistência de cargas. O lançamento/renderização real e alterações de política continuam recalculando itens normalmente. Fluxo m³ e a adoção automática de seus limites foram preservados. Nenhuma alteração de cadastro, estoque, fila existente, políticas, assinatura ou armazenamento de sessão. Não limpa dados/cache e não pede recadastrar.

Teste reproduzido antes da correção:trocar tipo gerava2operações de fila; depois,30trocas offline Ripa/Rodapé atualizam preço/total de atacado sem operação de fila, sem gravação local e sem mutar cargas existentes; chamada posterior da rotina real de lançamento/render continua aplicando preço de atacado.7suítes pertinentes passaram (prévia, preços, teclado, aberturaoffline/autenticaçãooffline, posição eUIviagens); build limpo/32scripts válidos. Sem reprodução nativa no celular, portanto não afirmar que toda possível causa da travada foi eliminada. Apenas prévia12, produção inalterada.


## Metro linear sem quantidade de peças V744 — 14/11

Pedido:lançar70m somados de vários comprimentos deixando quantidade vazia, sem inventar1peça de70m. Agora quantidade vazia emmodo linear significa metragem total; comprimento recebe os metros totais. Com quantidade inteira positiva, comportamento comprimento×peças permanece. Zero/negativos/fracionários de peças continuam inválidos. Novo item marcado linearTotalV744=true guarda quantidade0/comprimento0 como não informados e volume/volumeReal em metros. Não converte registros antigos nem altera m³/m²/granel.

Prévia básica, contador superior e prévia de preços reconhecem o total; serviços de encaixe/friso continuam sobre o valor. CMDP por comprimento individual não é inventado para total sem comprimentos conhecidos, e seu botão é omitido nesses itens. Resumo/orçamento/desktop/tabelas de carga/romaneio mostram peças não informadas e metragem total; agrupamento separa totais de peças conhecidas, e planilha linear de estoque apresenta comprimento variável. EtiquetaQuantidade(opcional) e nota explicam a entrada.

Baixa/transferência de totais usa metros e produto/espécie, podendo consumir comprimentos diferentes. Solicitação por peças conserva exigência de comprimento conhecido e não assume peças a partir de um saldo só em metros. Resto de peça que perde o comprimento individual conhecido vira saldo em metragem, sem peças fracionárias fictícias. Tolerância só para resíduos de ponto flutuante até1e-8m em totais. Conferência de carga simula saldo combinado, reservando comprimentos explícitos antes dos totais; execução usa a mesma ordem. Ajustes rápidos registram metros faltantes e peças não informadas. Movimentos totais mantêm quantidade0 com identificação explícita. Journal de baixa/controle de versão/fila e validações de plano/permissão preservados.

Validação:10suítes pertinentes passaram.11casos novos no modelo/integração extraem e executam o código realmente gerado:70m×R$10,40=R$728offline, peças/comprimentos desconhecidos,7m×10peças antigo, prévia vazia, baixa5m de estoque por peças, transferência20m de total70m, insuficiência sem mutação, conferência combinada e ajuste5m, serviços/CMDP, tabela de tela/PDF e resíduos decimais. Regressão451peças/journal/retentativa e falha de quota continuam passando. Testes que extraem funções receberam as dependências reais novas. Build limpo/32scripts válidos. Sem teste nativo visual no celular nem acesso aos registros privados reais. Apenas prévia12; produção inalterada.


## Rolagem automática do PC sobre campos V745 — 14/11

Retirada a pausa por passagem do mouse sobre input, textarea, select e contenteditable na zona de rolagem automática. O alvo ignora a barra interna do campo e procura seu contêiner/página, inclusive nos campos da calculadora. Não altera valor nem chama foco. Clique continua interrompendo a rolagem; arraste, saída do ponteiro, perda de foco, toque, centro da tela, diálogos e controles não editáveis da calculadora preservam o comportamento anterior.

Validação:4suítes pertinentes passaram (rolagem desktop, teclado móvel, total linear e posição das viagens). Testes executam o código gerado e verificam subida/descida sobre os quatro tipos de campo, dentro/fora da calculadora, conteúdo interno imóvel, valor intacto e interrupções. Build limpo com32scripts sintaticamente válidos. Sem teste visual em navegador real. Apenas prévia12; produção inalterada.


## Cabeçalho sobreposto no resumo V746 — 14/11

Foto do usuário mostrou total de bloco atrás dos títulos Madeira/Qtd./Medidas durante a rolagem. O cabeçalho genérico th sticky top0 prendia os títulos enquanto o corpo seguia rolando, com fundo translúcido. Correção CSS restrita à tela da tabela do resumo da calculadora: cabeçalho acompanha as linhas, sem ficar fixo. Não altera dados, grupos, totais, impressão/PDF ou outras tabelas.

Validação: build limpo, regra restrita incorporada e32scripts válidos;2suítes de regressão (rolagem desktop e total linear) passaram. Sem confirmação visual em navegador real.


## Densidade moderada do PC V747 — 14/11

Pedido para compactar as telas no computador. CSS restrito a screen e largura mínima1100px reduz espaçamento de cartões/grades, campos de entrada de linha única, botões, indicadores e atalhos laterais. Campos36px, botões34px, cartões10px de padding, menu52px mínimos. Texto de entrada14px, indicadores18px; textos longos podem crescer sem corte. Exclui checkbox/radio/range/cor/arquivo/ocultos; textarea mantém altura. Não usa zoom/transform, não altera posição do cabeçalho/menu, conteúdo, dados, rolagem ou comportamento. Celular e impressão/PDF fora da regra.

Validação: build limpo e32scripts válidos;4suítes pertinentes passaram (rolagem desktop, teclado móvel, total linear e posição de viagens). Regra conferida no HTML gerado. Sem avaliação visual em navegador real; tamanho final deve ser conferido no monitor do usuário.


## Encaixar tela inteira no PC V748 — 14/11

Usuário rejeitou só a redução dos espaços e escolheu explicitamente diminuir também letras e botões para caber tudo. Novo ajuste desktop >=1100px liga por padrão e mede a aba ativa, largura disponível e altura restante abaixo do cabeçalho. Aplica zoom proporcional até caber, reconferindo após reflow. Recalcula ao trocar aba, abrir painéis, receber novas linhas e redimensionar janela. Remove limites de rolagem dos wrappers de tabelas/gráficos nessa apresentação e mede o conteúdo visível completo; não oculta registros. Menu lateral também se reduz quando excede a altura.

Botão fixo Tamanho normal com percentual retorna à escala original; Ajustar à tela religa. Sem persistência, sem dados/fila/localStorage. Celular e impressão restauram estilos anteriores; PDF usa escala normal. Telas com muitos registros podem ficar muito pequenas por escolha explícita do usuário. Elementos modais continuam seus fluxos normais. Não muda cálculos, permissões, registros nem sincronização.

Validação: build limpo/33scripts sintaticamente válidos e6suítes pertinentes passaram (encaixe desktop, rolagem, teclado móvel, total linear, gráficos e posição de viagens). Casos novos medem telas altas/largas e40000px de conteúdo, recalculam novas linhas e conferem tamanho normal, breakpoint móvel e impressão/restauração. Sem validação visual no monitor do usuário nem navegador real. Apenas prévia12; produção inalterada.

Checagem adicional da tabela desktop passou após incluir no harness as dependências reais isLinearTotalV744/linearPieceTextV744 que já eram exigidas desdeV744;7suítes pertinentes ao todo. Wrapper pc-preview-table-wrap também expandido na apresentação ajustada.


## Remoção do ajuste automático V749 — 14/11

Usuário pediu retirar o ajuste por ter deixado a tela muito pequena. Removidos script desktop-fit.js, inclusão no builder, CSS específico e testes exclusivos do recurso. Sem zoom automático, botão ou observadores de ajuste. Mantidas compactação moderadaV747, correção do cabeçalhoV746 e rolagemV745. Sem migração ou limpeza de dados; recurso não persistia configurações.

Validação: build limpo confirmou ausência do script/botão/estiloV748,32scripts válidos e2suítes de regressão desktop passaram. Apenas prévia12; produção inalterada.


## Botões secundários do contador no PC V750 — 14/11

Pedido para diminuir Ligar/Desligar contador e Corrigir. CSS screen>=1100px deixa toggle na largura do texto/alinhado à direita, mínimo30px de altura e fonte12px. Corrigir fica30px de altura, mínimo84px de largura e fonte12px; seletor limitado a data-modo=corrigir preserva botão Madeira verde. Regras explícitas vencem os mínimos44px do estilo anterior. Nenhuma mudança em listeners, contador, lançamento ou celular.

Validação: build limpo32scripts válidos, CSS incorporado e2suítes de regressão (calculadora desktop/teclado móvel) passaram. Sem teste visual real. Apenas prévia12; produção inalterada.
