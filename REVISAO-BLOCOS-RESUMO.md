# Blocos do resumo por espessura e comprimento

O resumo da Calculadora repete o título e o cabeçalho quando muda a espécie, o tipo de medida, a espessura (m³) ou o comprimento. Exemplo: Garapeira — Esp. 4 cm • Comp. 6,0 m; Garapeira — Esp. 4 cm • Comp. 4,5 m; Garapeira — Esp. 5 cm • Comp. 4,5 m. A largura continua variando nas linhas dentro de cada bloco. A sequência existente dos grupos é preservada.

O PDF usa o mesmo conteúdo e mantém os blocos. Os cabeçalhos ficam visualmente separados e procuram permanecer junto da primeira linha na impressão. Blocos grandes podem continuar na página seguinte; não é criada uma página por bloco. Em m² e metro linear a separação considera comprimento, sem inventar uma espessura; a granel não recebe comprimento.

Validação: `python tests/resumo-blocos-browser.py` executa o renderizador e a exportação reais no Chromium com dados fictícios. Verifica mudanças de espessura/comprimento/espécie/tipo, larguras no mesmo bloco, quantidades e volume total inalterados, mesmos títulos na origem e na área exportada, preservação dos itens e mistura de unidades. Gera `review/resumo-blocos.pdf`. O teste de cópia também passou, e todos os scripts tiveram a sintaxe validada.

A alteração é de apresentação; não muda o cálculo, as regras de estoque ou a gravação dos itens. Branch inclui as alterações anteriores para manter o fluxo de testes na nova prévia. Sem merge na main ou publicação em produção.
