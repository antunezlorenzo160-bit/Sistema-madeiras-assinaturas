# Recebimentos das vendas de madeira — V807

As vendas manuais e as projetadas dos carregamentos baixados já compunham o resultado financeiro, mas seus recebimentos não chegavam ao caixa. O novo painel Recebimentos das vendas de madeira, no Caixa, consulta o mesmo período selecionado e permite conferir à vista, a prazo ou parcial, com vencimento e data efetiva. Vendas antigas sem evidência permanecem não informadas; não se converte lucro ou total vendido em dinheiro automaticamente.

As condições e recebimentos ficam em coleção financeira por empresa e contexto da prévia. A venda e o estoque não são escritos. O caixa projeta os recebimentos confirmados por data, uma vez, inclusive no saldo anterior ao período. O serviço de toras continua em seu fluxo próprio e é excluído deste painel para não duplicar.

O servidor relê a venda ou os itens/configuração da carga em transação, confere total/data/assinatura, revisão e responsável/plano. Identificador de operação persistido permite repetir a tentativa sem duplicar. Há limite de saldo e de 200 recebimentos, registro de auditoria e anulação apenas de lançamento por engano. Cancelar venda não apaga dinheiro recebido. Substituir uma venda manual com recebimentos por carga exige conferir esses recebimentos antes. Entrada manual já lançada deve ser conferida pelo usuário para não registrar a mesma entrada novamente; o formulário pede confirmação explícita.

Testes com banco simulado e VM: venda desconhecida/a prazo sem entrada, à vista/parcial, recebimentos com datas diferentes, saldo anterior, saldo restante, repetição, dois aparelhos, isolamento/autorização, alterações de carga e anulação. Build completo e sintaxe de 38 scripts. Não foram lidos dados Firebase reais nem executados gestos no Android.
