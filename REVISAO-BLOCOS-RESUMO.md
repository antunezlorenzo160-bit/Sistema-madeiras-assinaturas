# Blocos do resumo por espessura e comprimento

O resumo da Calculadora repete o título e o cabeçalho quando muda a espécie, o tipo de medida, a espessura (m³) ou o comprimento. Exemplo: Garapeira — Esp. 4 cm • Comp. 6,0 m; Garapeira — Esp. 4 cm • Comp. 4,5 m; Garapeira — Esp. 5 cm • Comp. 4,5 m. A largura continua variando nas linhas dentro de cada bloco. Os blocos seguem a ordem de primeira aparição, reunindo todas as suas larguras mesmo quando os lançamentos estão intercalados; a sequência dos dados gravados não é alterada.

O PDF usa o mesmo conteúdo e mantém os blocos. Os cabeçalhos ficam visualmente separados e procuram permanecer junto da primeira linha na impressão. Blocos grandes podem continuar na página seguinte; não é criada uma página por bloco. Em m² e metro linear a separação considera comprimento, sem inventar uma espessura; a granel não recebe comprimento.

Validação: `python tests/resumo-blocos-browser.py` executa o renderizador e a exportação reais no Chromium com dados fictícios. Verifica mudanças de espessura/comprimento/espécie/tipo, larguras no mesmo bloco, quantidades e volume total inalterados, mesmos títulos na origem e na área exportada, preservação dos itens e mistura de unidades. Gera `review/resumo-blocos.pdf`. O teste de cópia também passou, e todos os scripts tiveram a sintaxe validada.

A alteração é de apresentação; não muda o cálculo, as regras de estoque ou a gravação dos itens. Branch inclui as alterações anteriores para manter o fluxo de testes na nova prévia. Sem merge na main ou publicação em produção.

## Total ao fim de cada bloco

Cada bloco termina com uma linha **Volume total do bloco: 0,0000 m³**, calculada pela soma dos grupos exibidos naquele bloco. A linha também é adicionada após o último bloco e é preservada no PDF. Não há somas acumuladas entre blocos; o total geral existente permanece igual. Nos outros tipos de medida, a linha usa Área total do bloco (m²) ou Metragem total do bloco (m), sem misturar unidades. O resumo vazio não recebe subtotal.

O teste `tests/resumo-blocos-browser.py` também confere os totais exatos de cada bloco, a linha final, a igualdade entre resumo e área de PDF, unidades m²/m/granel e resumo vazio. O teste de cópia continua passando.

## Correção de blocos repetidos

Antes, mudar de espessura e depois voltar à mesma medida criava títulos repetidos. Os grupos agora são reunidos pela combinação de espécie, unidade, espessura e comprimento antes de montar a tabela. Há um título e um subtotal para cada combinação. O teste reproduz os 14 lançamentos intercalados da captura: dois blocos (2,5 cm e 4 cm, ambos com 3 m), 32 peças e total geral de 0,8762 m³, sem alterar os registros originais.
