# Revisão dos picos de leitura — primeira correção e medição

## O que foi confirmado no código

1. A sincronização já usa observadores estáveis (V429). Os timers encontrados
   atualizam relógio, aparência, prévias locais e a virada do dia; não fazem
   `getDocsFromServer` periódico. Voltar do segundo plano não encerra e reabre
   todas as consultas na versão atual.
2. Ao concluir o envio de alterações no cadastro de madeiras, a fila executava
   `getDocsFromServer(collection(db,COL.madeiras))`: uma releitura integral do
   catálogo, mesmo com um observador ativo. Essa consulta foi removida.
3. O observador ignorava eventos com escritas pendentes e depois também podia
   ignorar a confirmação por ser uma alteração apenas de metadados. Agora a
   confirmação atualiza a fotografia em memória. Uma guarda preserva os dados
   locais enquanto o observador ainda aguarda confirmação, mesmo se a fila local
   já terminou. Depois disso, reaplica-se a fotografia confirmada sem nova consulta.
4. O encerramento da sessão fechava explicitamente os observadores principais e
   o perfil, mas não todos os acompanhamentos auxiliares. Agora os acompanhamentos
   instrumentados são encerrados juntos ao sair, incluindo clientes e cubagem.

## Ajuste específico da abertura (V701)

O problema pendente foi confirmado pelo usuário como pico na abertura; o pico com
o sistema parado já havia sido resolvido. O histórico de movimentações sai da
carga inicial e é observado somente na primeira abertura de Movimentações/Histórico.
Depois disso, o acompanhamento permanece estável até o encerramento da sessão.
Os dados locais do histórico são preservados antes de chegar a confirmação remota.
A sincronização inicial não espera uma coleção que ainda não foi solicitada.
Catálogo, estoques e demais dados usados nas validações mantêm o carregamento atual.

Testes: nenhuma consulta a movimentos na abertura; uma única inscrição ao abrir
o histórico; cache local preservado; resposta opcional do histórico não substitui
uma resposta obrigatória de estoque/cadastro na barreira de sincronização.

## Fontes de consumo ainda a medir

Antes desta revisão, a abertura acompanhava oito coleções completas, incluindo
estoques e histórico de movimentos, além de acompanhamentos auxiliares. O histórico
agora fica sob demanda; as demais coleções continuam a ser medidas. Uma carga inicial grande,
uma nova conexão cobrada ou várias versões/aparelhos podem elevar o consumo.
Persistência e retomada de consultas influenciam a cobrança; receber uma fotografia
grande no callback não prova que todos os seus documentos foram cobrados outra vez.
Consultas idênticas também podem ser compartilhadas pelo SDK. Não atribuir as
54 mil leituras do gráfico a uma única função sem medição.

Não foram limitadas ou paginadas as consultas de estoque: isso precisa preservar
validações de saldo, transferências e relatórios antes de ser adotado. O histórico
continua completo quando solicitado, sem corte de dados antigos.

## Diagnóstico local sem novas consultas

Em Configurações, abrir “Diagnóstico de leituras do Firebase”.
“Atualizar medição” e “Copiar diagnóstico” só consultam contadores em memória.
O relatório contém chamadas explícitas, documentos retornados, aberturas de
acompanhamentos, fotografias do servidor/cache, maior conjunto recebido e erros.
Também informa se o Firebase abriu com cache persistente ou em memória.

O relatório não contém registros, senhas, tokens ou identificadores dos documentos
das empresas. Não é um extrato de leituras faturadas; não inclui a API administrativa,
as verificações da página de login, outros aparelhos ou versões antigas.

Após a liberação da cota, registrar uma medição depois de abrir, outra após um
período parado, outra após editar um cadastro e outra após voltar de segundo plano.
Comparar com o uso do projeto no Firebase. Durante a medição, usar a mesma prévia
e evitar manter versões antigas abertas em paralelo; origens diferentes têm caches
e conexões próprios.

## Verificações

- Confirmação somente por metadados atualiza a fotografia e libera a pendência.
- Uma edição de madeira gera a escrita sem reler o catálogo inteiro.
- Instrumentação não cria consultas adicionais, omite registros e fecha cada
  acompanhamento uma única vez.
- Build repetido e sintaxe dos scripts gerados.

O teste usa dados simulados; não foram feitas consultas ao Firebase real durante
a cota esgotada. Esta revisão não aumenta a cota do plano Spark e fica só na prévia.
