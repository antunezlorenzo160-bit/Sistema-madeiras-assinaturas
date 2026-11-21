# Cabeçalhos da movimentação — V801

Usuário esclareceu com foto que a rolagem enrosca nos cabeçalhos. Há regra global th position:sticky;top:0. Após remover o scroller interno, esses cabeçalhos podem aderir ao main sob os filtros fixos, alternando a cada tabela. Regra restrita ao histórico móvel até760px define position static/top auto/z-index auto para os th das tabelas. Filtros e cabeçalho da tela permanecem no topo; as legendas de cada tabela rolam com suas linhas. Desktop e impressão não alterados.

Validação: build completo, presença da regra no HTML gerado e 38 scripts sintaticamente válidos. Sem teste nativo de gesto Android. Nenhuma alteração de dados ou registros. Publicação somente prévia PR12.
