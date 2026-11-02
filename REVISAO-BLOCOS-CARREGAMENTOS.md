# Blocos nas planilhas de carregamento

As planilhas original e comercial, na tela e no PDF, passam a usar blocos únicos por espécie/produto/qualidade, tipo de medida, espessura (m³) e comprimento. Larguras da mesma combinação ficam reunidas mesmo se lançadas em momentos diferentes. Cada bloco tem seu cabeçalho e uma linha de volume total. A mesma separação foi aplicada ao romaneio, mantendo-o sem preços.

As colunas físicas, peso estimado e preços continuam presentes. A planilha original na tela também conserva a coluna de estoque de origem. O subtotal físico/financeiro existente permanece ao fim de cada bloco, e o fechamento financeiro do documento não muda. Para m² ou metro linear, o total do bloco usa a unidade correspondente; a granel não inventa comprimento ou espessura. O agrupamento é apenas de apresentação e não grava nem modifica o carregamento.

Validação: `python tests/carregamento-blocos-browser.py` testa os construtores reais de tela e PDF original/comercial, o exportador PDF, o romaneio e os cálculos físicos existentes. Usa 14 linhas intercaladas, IDs antigos diferentes da mesma espécie e duas espessuras: dois blocos, 32 peças, 0,8762 m³. Confere os subtotais de 0,3998/0,4764 m³, estoques de origem, preços originais e comerciais de 80%, unidades distintas e ausência de alterações no registro de origem. Gera `review/carregamento-blocos.pdf` com dados fictícios.

Também passaram os testes de guardar/alternar cargas, resumo/PDF e a verificação de sintaxe. Na prévia, abrir um carregamento com espessuras/comprimentos diferentes, conferir os blocos na planilha original, gerar PDF e conferir a cópia comercial e o romaneio.

A branch inclui os ajustes anteriores. Sem merge na main nem publicação em produção.
