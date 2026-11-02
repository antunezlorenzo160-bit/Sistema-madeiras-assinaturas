# Gestão de empresas e testes gratuitos — V707

Somente na prévia. Nenhuma empresa existente foi suspensa, reativada ou teve seu
teste alterado pelo agente. As ações dependem do proprietário autenticado na
administração, usando os controles explícitos por empresa.

## Administração

Em Empresas, a lista pode ser pesquisada e atualizada manualmente. Consultar e
gerenciar busca cadastro, perfil da empresa, assinatura e vínculos. Essas leituras
ocorrem sob demanda, sem polling. O botão Atualizar lista invalida o cache curto
da visão geral; o cache e a pausa por quota continuam ativos nas demais aberturas.

Suspender acesso marca `membros.ativo:false` apenas nos vínculos ativos da empresa
selecionada, com `suspensoPelaPlataforma:true`. Reativar recupera apenas esses
vínculos, preservando usuários que estavam desativados por outro motivo. Dados e
contas Firebase Auth não são apagados. As regras existentes já exigem vínculo
ativo, portanto nenhuma nova publicação de regras é necessária.

As alterações são transacionais, verificam o estado mais recente e gravam auditoria
com autor/data/ação. Mais de 400 vínculos causa recusa antes das gravações, sem
operação parcial. As rotas continuam sob autenticação exclusiva do proprietário;
permissão de administrador de uma empresa não dá acesso à plataforma.

## Teste gratuito e aviso

É possível manter o teste sem prazo ou definir uma data final no horário de
Brasília. Datas inválidas/passadas e alterações de testes em assinaturas de outro
estado são recusadas. A data é armazenada na assinatura e o aviso é publicado nos
vínculos da própria empresa. Retornar a sem prazo remove o aviso.

**A data informa o encerramento planejado; não suspende nem cobra automaticamente.**
Essa limitação aparece junto ao formulário. O proprietário usa Suspender acesso
se quiser bloquear o uso online. Transição automática para plano pago, contratação,
webhook e renovação permanecem etapas posteriores. Mudar administrativamente uma
assinatura para um estado diferente de trial limpa avisos antigos de teste.

## Sistema da empresa

Um único listener do próprio vínculo mostra/remove o aviso e encerra a sessão da
interface quando recebe suspensão ou mudança de empresa confirmada pelo servidor.
Ele usa a instrumentação e o encerramento central existentes. Não há consultas por
timer. O custo é uma resposta inicial de documento e as alterações do vínculo.

Dados já armazenados offline não são apagados remotamente. Sem conexão, a suspensão
é observada quando a conexão volta; operações online continuam protegidas pelas
regras. Versões antigas podem não mostrar o aviso ou encerrar visualmente de
imediato, mas não recebem autorização para novas operações online com vínculo
inativo. Para testar a interface, usar a prévia atualizada nos dois aparelhos.

## Validação

Testes locais: suspender/reativar, usuário desativado preservado, outra empresa
preservada, aviso datado e retirada do aviso, datas inválidas, assinatura fora de
teste, conflito de atualização, limite de lote, consulta de detalhes, pesquisa e
formulários da UI, acompanhamento de suspensão e aviso, login exclusivo da
plataforma e regressões de orçamento/sincronização/cubagem.

Foi executado o build completo a partir do HTML original da branch e 18 arquivos
de teste relacionados passaram. Não houve teste visual de navegador, envio de
aviso a empresa real ou alteração de acesso real. O teste com aparelhos deverá ser
feito pelo proprietário em uma empresa de teste, preservando as empresas em uso.
