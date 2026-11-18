# Menos trabalho repetido na baixa — V796

Usuário relata demora ao tocar em Dar baixa para 46 peças de 20×20 cm e 5,5 m. Identificados custos repetidos no código de baixa: cópia de todos os objetos dos dois estoques, normalização/recomparação das mesmas medidas para cada cálculo de saldo, gravações separadas ao alterar várias projeções locais e início de emissor/broadcast a cada item de uma conferência.

Otimizações:
- Arrays de estoque são copiados sem clonar cada registro intacto; posições alteradas continuam recebendo novos objetos. Exclusões usam somente a cópia da lista. Os registros de origem permanecem inalterados.
- Resultado da comparação de bitola é memoizado por identidade de registro durante uma única baixa. Quantidade, saldo e volume não participam desse predicado; registros substituídos têm identidade nova e são reavaliados. Mantidos tolerâncias, espécies por ID/nome e regras linear/m²/verde existentes.
- Atualizações síncronas das projeções do diário entram em uma transação de armazenamento em vez de iniciar uma gravação na primeira lista e outra para as restantes. Flush explícito continua imediato e aguardado; o diário só é removido após persistência, sem adiar a confirmação durável da baixa.
- Durante a conferência de grupo não se inicia sincronizador nem se envia a lista completa do resumo a outras abas após cada item. A conclusão mantém o envio único já existente e o save final grava somente resumo, movimentos e carregamentos, pois estoque e fila já têm seus checkpoints no diário.

Mantido um checkpoint durável por item, recuperação de interrupções, fila por revisão, guardas de saldo e idempotência. Não combina peças nem muda cálculo, preço ou destino. Não há nova baixa, estorno ou alteração de registros reais pelas ferramentas.

Validação: sete arquivos de testes passaram (baixa real gerada, armazenamento durável, diário, conclusão/conferência, envio em lotes, linear e compactação). Novo caso de 46 peças/20×20/5,5 m sobre 5.000 registros requer no máximo uma comparação por identidade, mantém volume de saída 10,12 m³, fontes intactas e repetição sem nova retirada. Também verificados checkpoint durante grupo sem emissão repetida e seis listas locais confirmadas em uma transação, incluindo reinício. Build completo e 38 scripts sintaticamente válidos.

Sem medição no Chrome Android ou confirmação de tempo no aparelho do usuário. Publicação limitada à prévia do PR 12; produção e dados privados não alterados.
