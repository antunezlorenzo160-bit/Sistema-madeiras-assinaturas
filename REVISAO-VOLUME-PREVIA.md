Volume em tempo real no campo existente

O campo original de volume no topo passa a mostrar o volume calculado ao preencher largura, espessura, comprimento e quantidade. Não cria outro indicador. O cálculo não adiciona registros. Ao limpar as medidas depois do lançamento, o mesmo campo volta a exibir o total já lançado. Atualizações do resumo não sobrescrevem a prévia das medidas ainda preenchidas. Modos de área, linear, granel e fechado conservam unidades e cálculos.

Exemplo: 2,5 cm × 25 cm × 3 m, uma peça → 0,0188 m³.

Validação: Chromium com funções/listeners reais para atualização por digitação, quantidade, limpeza, negativos, todos os modos, preservação dos lançamentos e retorno ao total acumulado; regressão do resumo/PDF e desempenho.

Correção móvel: o sistema transforma os inputs em texto para suportar o teclado Android. A vírgula agora é normalizada na fase de captura do evento, antes dos cálculos, evitando que o volume fique em zero até o próximo toque. Reprodução da falha e validação da correção com o template completo, handlers reais de preço e adaptadores móveis; Firebase simulado. Cache de recursos offline atualizado para esta revisão.
