# Precisão do peso no rodapé do romaneio — V803

Usuário pede conferir romaneio de Batatunha. Imagem mostra volume 3,5009m³, área 140,0350m² e espessura2,5cm, coerentes: área×0,025=3,500875m³. Peso de topo2.100,5kg é coerente com referência de600kg/m³. Rodapé apresenta2.101,4kg. A imagem não permite certificar individualmente todas as linhas; não foi acessado registro privado nem PDF original.

Causa confirmada no código: volume do rodapé já usava métricas físicas originais, mas peso/área/metragem eram reconstruídos somando as células impressas e arredondadas. Agora as três métricas usam os totais originais fornecidos pelo gerador nativo, quando completos e válidos, arredondando apenas ao apresentar a soma. Flags de desconhecido/parcial são mantidas; dados legados sem metadados seguem usando as células disponíveis. Não altera densidade, medidas, pesos de cada registro, preços ou estoque.

Validação: três arquivos de testes passaram (romaneio, tabelas compactas e resumo). Novo caso com3,500875m³/140,0350m²/749,50m/2.100,525kg confirma rodapé2.100,5kg em vez da soma arredondada2.101,4kg. Inclui ausência de densidade, estimativa parcial e fallback legado; entradas preservadas. Build completo e38scripts com sintaxe válida. Sem inspeção visual nativa de PDF. Publicação somente prévia PR12.

Estado: correção local pronta e testes aprovados. Publicação NÃO concluída: ferramentas create_tree/create_blob ficaram sem resposta e o runtime foi substituído. Head PR12 conferido continua c8cfbd9fd45d1edd14b72972e275169a116ceaa8 (V802). Não afirmar que V803 está disponível; retomar publicação quando serviço responder.
