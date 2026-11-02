# Várias cargas em montagem

O botão **Guardar carregamento** aparece na Calculadora quando o destino é Carga. Ele mantém os itens com status `montagem`, preserva os registros na coleção da empresa e na fila de sincronização, limpa apenas essa carga do resumo e inicia uma sessão vazia. Não fecha o carregamento, não reserva nem baixa estoque. O destino e os contadores da nova montagem são reiniciados.

**Novo carregamento** também guarda automaticamente a montagem atual antes de liberar a Calculadora. Em Carregamentos, abrir o destino e tocar em **Continuar carregamento** restaura os itens, origem, destino, tipo de medida e contagem de pacotes. Se outra carga estiver aberta, ela é guardada antes da troca. Não são criados novos IDs de itens ao retomar.

**Fechar carregamento** continua separado: muda para Aguardando conferência. Cargas aguardando conferência ou já baixadas não são reabertas pelo botão Continuar. A planilha do computador não recupera automaticamente a única carga guardada quando a sessão está vazia.

Validação automatizada: `python tests/carregamento-montagem-browser.py` executa as funções reais em Chromium com armazenamento/fila simulados. Cobre guardar A, começar B, guardar B pelo botão Novo, recarregar os registros locais, continuar A, acrescentar peça, trocar para B sem fechar A, restaurar pacotes m², manter IDs sem duplicação, manter operações apenas na coleção de cargas e manter o fechamento original. Também verifica que o botão só aparece no destino Carga e que uma montagem guardada não repovoa a prévia vazia do computador.

Os testes de cópia, assinatura/histórico/PDF e os 10 testes Node também passaram. Os testes não acessam o Firebase real.

## Conferência manual na prévia

1. Montar uma carga de teste A e tocar em Guardar carregamento. A Calculadora deve ficar vazia.
2. Montar B e guardar. Na aba Carregamentos, A e B devem aparecer Em montagem.
3. Abrir A, tocar em Continuar carregamento e acrescentar uma peça.
4. Abrir B e continuar: A deve permanecer salva com a peça nova e B deve aparecer na Calculadora.
5. Fechar B: apenas B deve passar para Aguardando conferência; A deve continuar Em montagem.

Sem merge na main ou publicação em produção. A prévia usa a empresa fictícia existente para homologação.
