# Resumo da calculadora sem valor — V790

O PDF compacto copiava o cartão de valor total mesmo oculto na calculadora. A linha de indicadores do resumo agora exclui valores e preços, preservando contagens e métricas físicas. Os preços dos registros e documentos comerciais não são alterados.

Verificação: teste de regressão inclui o cartão oculto com R$ 15.000,00 e exige somente as contagens no texto exportado. Testes de limpeza do resumo, tabelas compactas e romaneio passaram. Build completo e sintaxe dos 38 scripts verificados. Sem inspeção visual nativa neste ambiente. Publicação apenas na prévia do PR 12.
