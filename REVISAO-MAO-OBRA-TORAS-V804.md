# Mão de obra de toras no financeiro — V804

Solicitação autorizada: registrar a mão de obra de toras como serviço, com cliente/data/valor, condição à vista/a prazo/parcial, dinheiro recebido no caixa e proteção contra cobrança duplicada.

## Comportamento implementado

Na área Cubagem / mão de obra, o painel Mão de obra no financeiro confere a lista atual e permite registrar somente as toras com preço de mão de obra positivo que ainda não pertencem a outro serviço. O total usa os mesmos grupos, fórmulas e arredondamento monetário da cubagem. Cliente, data e descrição são obrigatórios. Consultar histórico não bloqueia a digitação do rascunho.

A confirmação cria uma receita de serviço no financeiro. À vista ou parcialmente recebido, cria também a entrada correspondente no caixa, na mesma transação. A prazo, cria somente a receita e o saldo a receber. O histórico dos serviços permite registrar recebimentos parciais posteriores, com data, valor e saldo restante. Recebimentos não recriam a receita nem alteram o valor faturado. A receita de serviço não compensa margem insuficiente da madeira na avaliação do lucro mínimo.

O cliente preserva a identificação e o payload de uma tentativa antes de enviar. Falha de rede ou persistência após resposta mantém a mesma tentativa para conferência/repetição idempotente. Troca de empresa impede aplicar respostas antigas. O servidor recalcula valores e confere os documentos originais de cubagem; edição de medidas/fórmula/preço entre a preparação e a confirmação causa conflito sem gravação. Identificações das toras ficam vinculadas ao recibo dentro do respectivo escopo financeiro, impedindo outro recibo cobrar as mesmas linhas, inclusive por outro aparelho.

O serviço, a lista de cubagem, compra de toras e estoque são independentes. Não altera nem exclui a lista original. Repetição da confirmação funciona mesmo depois de a lista ter sido limpa. Nenhuma compra, estoque ou movimento é criado. Usa o isolamento de empresa e de financeiro prévia/produção já existente, com verificação de proprietário/e-mail/plano repetida dentro das transações.

## Cancelamento e evidências

O serviço pode ser cancelado em sua própria área, com histórico preservado e receita cancelada. Isso não devolve dinheiro automaticamente: recebimentos já realizados continuam no caixa. O texto da ação explica essa consequência. As linhas permanecem vinculadas, evitando recobrança. Financeiro e caixa impedem cancelar/editar isoladamente os registros gerados pelo serviço. Devoluções reais podem ser lançadas como saída efetiva de caixa. Não foram criadas rotinas de migração ou de deduplicação por suposição de antigos lançamentos manuais; a interface orienta usar a integração para serviços ainda não lançados manualmente.

## Validação

14 arquivos de testes aprovados: serviço/API, UI, compra de toras/API/UI, caixa/API/UI, financeiro/API/UI, lucro mínimo, reconciliação, fórmulas, sincronização de toras, teclado e romaneio. Casos incluem registro a prazo sem caixa, à vista/recebimento parcial, terceiro recebimento, saldo máximo, confirmação e pagamento repetidos, disputa simultânea entre aparelhos, alterações de lista, planilha removida após confirmação, proprietário/empresa/plano, pendência de sincronização, resposta tardia de outra empresa, falha de armazenamento e consulta de histórico paralela. Dados/linhas originais permanecem intactos. Build completo aprovado, 38 scripts e módulos novos com sintaxe válida. Sem teste nativo de Android/PDF e sem gravação em banco privado.

## Estado da publicação

IMPLEMENTAÇÃO LOCAL PRONTA. PUBLICAÇÃO NÃO CONFIRMADA. Ferramentas GitHub de escrita (blob/branch/arquivo) ficaram sem resposta, e a última tentativa via contents API foi interrompida pelo usuário. Não repetir a escrita interrompida sem primeiro consultar o estado remoto. Último head confirmado antes da tentativa: c8cfbd9fd45d1edd14b72972e275169a116ceaa8 (V802), PR12/preview/pendencias-2026-11. Tentativa work/toras-financeiro-2026-11 não criou branch até a consulta de verificação (404). A tentativa final public/log-labour.mjs pode ter terminado sem resposta; se existe, é um módulo ainda não ativado, e deve ser comparado antes de reenviar. Não afirmar que a função já está disponível na prévia. GH_TOKEN do ambiente é inválido; nenhum token foi exposto/alterado.

O pacote local inclui também a correção V803 do peso/área/metragem do rodapé do romaneio, já testada mas ainda não publicada. O HTML gerado e arquivos de contexto financeiro gerados não integram o pacote de fontes; o build normal do repositório deve regenerá-los. Não publicar main/produção; o destino autorizado permanece a prévia do PR12.
