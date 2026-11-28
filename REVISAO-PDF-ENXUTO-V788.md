## PDF do resumo sem repetições V788 — 18/11

Usuário mostrou duplicação no PDF Resumo dos lançamentos e pediu mais compacto, retirando texto de atacado/varejo. Clones de impressão deixam de incluir price-notice-v710; políticas e valores originais na tela/dados não mudam.

No clone da calculadora: remove título interno repetido (o título externo do PDF continua), cartões superiores de volume/área por espécie e caixas de estatísticas. Contagens não volumétricas viram uma única linha pequena, com os mesmos rótulos/valores. Remove rodapé antigo summaryFooterV718 após capturar seus dados, evitando dois títulos/blocos de totais.

Um único bloco Totais reúne subtotais de espessura×comprimento e dados físicos informados. Quando o total da espessura e da espécie coincide ou corresponde a uma combinação única, volume é exibido uma única vez, com quantidade/área/metragem/peso anexados. Espessuras distintas são conferidas pelo rótulo para não anexar medidas de outra espessura com volume igual. Com várias espessuras, mantém o total geral da espécie. Omite Peso não informado e área/metros que apenas repetem a unidade/valor principal. Valores reais informados não são recalculados. Falta de rodapé físico mantém totais existentes, sem inventar métricas.

Resumos curtos passam a distribuir itens nas duas colunas disponíveis em uma página, mantendo ordem de leitura e cabeçalhos de continuação; fonte dos itens não foi reduzida. Listas longas mantêm paginação normal. Não altera estoque, financeiro ou registros, nem a organização dos outros documentos.

Validação:5suítes passaram (limpeza do resumo, totais, tabelas compactas, impressão e UI de pedidos), build38scripts válidos. Casos do screenshot com Garapeira10,5850m³ e eucalipto96m preservam totais,190/32peças e métricas distintas; eliminam volume/metragem repetidos e títulos/cartões duplicados. Casos de duas espessuras com mesmo volume e duas colunas preservam correspondência e todas as linhas. Sem inspeção visual nativa/Android ou base privada; somente prévia12, produção inalterada.
