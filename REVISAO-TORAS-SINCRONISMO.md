# Sincronização da lista e agrupamento de toras

A lista de cubagem passa a sincronizar entre os aparelhos da mesma empresa,
além dos preços já sincronizados. Cada lançamento recebe um identificador e um
documento próprio na coleção de serviços da empresa. A fila offline existente
é usada antes do envio; dois aparelhos adicionando toras não substituem listas
inteiras. As exclusões mantêm registros de remoção para não ressuscitar dados
antigos. A lista local antiga é enviada com identificadores estáveis.

Linhas de mesma espécie, diâmetro, comprimento e preço de mão de obra são
agrupadas na tabela, na cópia e no PDF. Por exemplo, quantidades 1 e 12 para
diâmetro 25 cm e comprimento 4 m aparecem como uma linha de 13 toras. Espécies
e preços diferentes ficam separados. Remover o grupo exclui os lançamentos
correspondentes; limpar pede confirmação para todos os aparelhos da empresa.

Nome do cliente e identificação da mão de obra também são sincronizados.
A cubagem continua sem movimentar estoque ou pedidos.

Validação automatizada: fórmulas, agrupamento, adições simultâneas em dois
aparelhos simulados, fila offline, retorno da conexão, identificação compartilhada,
remoção, falha de confirmação e build repetido. A sincronização com o Firebase
real precisa ser conferida na prévia com a conta da empresa nos dois aparelhos.

Teste: abra a mesma prévia no PC e celular, adicione uma tora de teste no PC e
confira no celular; adicione outra de mesmas medidas e confira uma única linha.
Mantenha os dois conectados para a primeira conferência.
