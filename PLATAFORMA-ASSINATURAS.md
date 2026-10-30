# Administração de assinaturas — prévia

Entrada: `/plataforma/` na mesma prévia de desenvolvimento.

Proprietário configurado no servidor: `antunezlorenzo160@gmail.com`.
O Firebase precisa confirmar esse endereço. Opcionalmente, configure
`PLATFORM_ADMIN_UID` no Netlify para vincular o acesso ao UID, que terá prioridade.
Administradores e funcionários das empresas não recebem acesso à API da plataforma.

## Disponível

- Cadastro de empresas, planos mensais/anuais e vínculos de assinatura.
- Alterações administrativas com registro de auditoria. Não bloqueiam empresas.
- Marca d’água global: PNG/JPEG até 250 KB, tamanho e intensidade.
- API de leitura da marca d’água para contas com vínculo ativo na empresa.
- Checkout Pro de teste pelo Mercado Pago, com valor lido do plano no servidor.
- Consulta autenticada de pagamentos e confirmação por webhook assinado, somente para testes.
- Nenhuma cobrança real ou ativação de contrato real por pagamento simulado.

## Configuração do servidor

As funções usam `FIREBASE_SERVICE_ACCOUNT_JSON`, já utilizado pela assinatura
de entrega, do projeto `estoque-madeiras-cc4d7`. Não colocar esse segredo no HTML,
no repositório nem em mensagens. A conta de serviço precisa poder acessar o Firestore.

Antes de usar cadastros reais, conferir no Firebase que acessos diretos dos clientes
à árvore `/plataforma_admin/{document=**}` estão negados. As funções usam Admin SDK;
somente elas devem ler/gravar essa árvore. Um `allow` genérico em outra regra precisa
ser restringido; uma regra de negação isolada não sobrepõe permissões genéricas.
As regras atuais do projeto não foram alteradas por esta implementação.

## Mercado Pago: somente testes

Configurar `MERCADO_PAGO_TEST_ACCESS_TOKEN` como variável privada de funções no
Netlify, usando uma credencial de teste ou a conta vendedora de teste do provedor.
A API consulta o vendedor e bloqueia contas de produção. Cartões e dados reais
não devem ser usados no checkout de teste. A página nunca recebe o token secreto.

O checkout não exclui meios de pagamento: o Mercado Pago apresenta os disponíveis
para a conta, o comprador e a operação. Pix, boleto, crédito, débito e conta Mercado
Pago não devem ser prometidos para todo tipo de recorrência. A transferência
prevista no Brasil é Pix; TED e carteiras de terceiros não estão implementadas.

Há conferência de pagamento no provedor e webhook de aprovação de teste. Não há
renovação automática, emissão fiscal ou ativação de contrato real por pagamento
simulado. Gerar um checkout não confirma pagamento. A ativação de produção é
uma etapa separada.

Referências oficiais:
- https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/overview
- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases
- https://www.mercadopago.com.br/developers/pt/docs/sales-processing/payment-methods

## PDFs

A configuração global é consultada com autenticação ao abrir o sistema, ao voltar
à janela e antes do gerador de PDF do aplicativo. Sem conexão ou com a função
indisponível, permanece o último padrão carregado na sessão ou o padrão compilado.
A geração continua no navegador; isso não impede edição de um PDF após o download
ou alterações feitas pelo console do navegador.

## Conferência da contratação

Em Assinaturas, selecione empresa e plano e use **Simular contratação**.
O resumo exibe o valor mensal ou anual do plano e a situação atual da empresa.
A simulação ocorre no navegador, sem consultas adicionais, gravações, cobrança,
aceite de contrato ou encerramento do teste gratuito. Trocar a seleção oculta o
resumo anterior. **Salvar assinatura administrativa** continua sendo uma operação
separada, que altera o vínculo e a situação no cadastro; não confirma pagamento.

## Confirmação de pagamentos de teste

Em Pagamentos, **Conferir pagamento de teste** consulta a API usando a referência
da cobrança já salva. Para notificações automáticas, configure no Mercado Pago o
webhook de pagamentos de teste apontando para:
`https://deploy-preview-11--famous-marigold-4e370d.netlify.app/.netlify/functions/mercadopago-webhook`

Salve a assinatura secreta gerada pelo provedor em
`MERCADO_PAGO_TEST_WEBHOOK_SECRET`, como segredo somente em Deploy Previews, e
reconstrua a prévia. Nunca coloque o valor no código, na URL ou em mensagens.
O servidor verifica HMAC SHA-256, request ID, payment ID e timestamp (cinco minutos),
e consulta o pagamento na API autenticada. Não aceita confirmação pela URL de retorno.
Valida vendedor de teste, cobrança registrada, referência, BRL e valor exato.
A aprovação grava `test_payment_approved`, metadados em `subscription.testPayment`
quando o plano ainda coincide, e auditoria atômica e idempotente. Não altera acesso,
status da assinatura real, prazo de teste ou receita contratada. Sem assinatura
secreta configurada, o endpoint recusa notificações.

O callback é informado nos novos checkouts após a configuração. Para pagamentos
antigos, use a conferência manual. Pendências, recusas e estornos não ativam
contratos; reversão automática de uma aprovação por estorno ainda não está integrada.
Não há polling. A tela consulta de novo quando atualizada; o resumo pode ficar em
cache por até 30 segundos. O teste real de webhook exige configuração e pagamento
na conta de teste; os testes locais não comprovam entrega pelo provedor.

## Opções comerciais aprovadas — preparação na prévia

- Completo mensal: R$ 199,90 por mês.
- Completo anual: R$ 2.000 pagos de uma vez pelos 12 meses; economia de R$ 398,80
  comparada a 12 mensalidades (aproximadamente 16,6%). Não representa parcelamento.
- Em Planos, os botões preenchem os formulários com esses valores. O proprietário
  ainda precisa salvar cada cadastro autenticado; o deploy não cria nem altera planos
  existentes no Firestore. Conferir a lista para evitar duplicações do mensal.
- Em Assinaturas, a escolha de plano distingue valor e periodicidade. A simulação
  permite renovação manual ou automática, sem gravação ou término do teste gratuito.
- O cadastro administrativo pode guardar `renewalPreference` manual/automatic;
  `automaticBilling` permanece false nas duas escolhas. Essa preferência é do
  administrador para simulação e não é um aceite do cliente ou mandato de pagamento.
- Checkouts de teste avulsos são bloqueados quando a preferência salva é automática,
  evitando apresentar um pagamento único como autorização recorrente.
- A adesão do cliente e a integração de recorrência com Mercado Pago ainda precisam
  ser implementadas e validadas antes de oferecer cobrança automática real. Renovação
  manual não gera faturas futuras, lembretes ou envio de cobranças automaticamente.
- Os testes gratuitos existentes não são migrados pelo deploy. Não foram configurados
  vencimentos, suspensão por atraso, cancelamento ou cobranças reais nesta etapa.

## Escolha de plano pelo responsável — solicitação de teste

Página `/contratacao/`, acessível em Configurações → Ver planos da empresa e no
painel administrativo de Assinaturas. Usa a conta Firebase já existente. O servidor
exige e-mail verificado, vínculo ativo e ownerUid da empresa; em cadastros antigos
sem ownerUid, exige papel admin. Nem o proprietário da plataforma recebe acesso a
outra empresa por esse endpoint sem o vínculo apropriado.

O catálogo retorna planos ativos cadastrados pelo proprietário, inclusive gratuitos, com valor e
periodicidade atuais, eliminando cópias idênticas de nome, valor e período. O responsável escolhe
renovação e confirma que está registrando somente uma solicitação de teste. O POST
revalida o plano, preço, período e revisão, deriva a empresa do vínculo, salva uma
cotação em `plataforma_admin/billing/contract_requests/{empresaId}` e audita a ação.
Repetir a mesma escolha não cria novas gravações. Trocar a escolha substitui a
solicitação atual da empresa; não cria cobrança, aceite jurídico ou autorização
recorrente. Não altera assinatura existente, teste gratuito, acesso ou membros.

Em Assinaturas → Escolhas dos responsáveis, o proprietário consulta as solicitações
com valor, data, plano e preferência de renovação. Use Atualizar solicitações para
buscar novos dados sem depender do cache de 30 segundos. Não há polling ou novas
consultas Firestore pelo aplicativo principal: o endpoint só é chamado ao abrir a
página de planos, atualizar ou registrar uma solicitação.

Próxima etapa: revisão do fluxo de adesão e integração de contratação real, cobranças,
recorrência e direitos do período contratado. Estas etapas não são ativadas pelo
registro de teste. Validar a página com uma conta de responsável na prévia antes de
publicar em produção.

## Editar planos e reajustar preços

Em Planos → Editar, nome, valor e periodicidade são carregados no formulário.
Salvar alterações atualiza o mesmo ID, preservando os vínculos. Cancelar edição
não grava dados. O servidor valida o preço em centavos e a periodicidade; exige
a revisão atual do plano para impedir sobrescrita de mudanças em outra tela.
A alteração e os valores anteriores ficam em auditoria. Um plano inativo não é
reativado pela edição. Editar um plano já removido gera erro em vez de recriá-lo.

A página da empresa consulta os valores atuais e calcula eventual economia anual
com esses valores, sem manter os preços iniciais fixos. Uma solicitação baseada
em versão antiga precisa ser revisada antes de salvar. Solicitações já registradas
e cobranças já criadas preservam seus valores. Novos checkouts usam o preço atual
do plano. Esta edição não executa cobranças, não reembolsa pagamentos e não altera
acesso ou prazo de teste. Regras de comunicação e aplicação de reajustes a contratos
reais existentes ainda serão tratadas na etapa de contratação real.

### Planos gratuitos e histórico da escolha

Valor zero é válido na administração e no catálogo da empresa. O seletor mostra
R$ 0,00 e a descrição indica gratuidade. A solicitação de teste pode registrar esse
valor sem alterar o acesso ou gerar pagamento. A API de checkout impede gerar uma
preferência no Mercado Pago para plano gratuito. O resumo da solicitação anterior
conserva seu preço e data e é identificado como histórico. Atualizar planos consulta
o catálogo atual sem regravar a escolha passada.

## Preço garantido por vigência — somente prévia de teste

A regra de período foi implementada no módulo `contract-periods.mjs`, sem ativar
contratos ou cobranças reais. Um período em `test_contract_periods/{empresaId}`
guarda plano, valor acordado, moeda, periodicidade, início e vencimento. Alterar o
catálogo não regrava esse registro. Mensal dura um mês de calendário e anual 12
meses, em horário de Brasília (UTC-3), com ajuste para o último dia válido do mês
(ex.: 31/01 → 28/02; 29/02 no anual → 28/02 do ano seguinte). O fim é exclusivo.

O período de teste pode ser iniciado pelo proprietário em Assinaturas → Escolhas
dos responsáveis → Iniciar período de teste com preço garantido. Usa a cotação da
solicitação exibida e verifica sua data/revisão para não usar uma escolha trocada.
Repetir a operação é idempotente. Não permite substituir uma vigência ainda ativa.
Na renovação, exige uma solicitação nova próxima ao vencimento; não reaproveita
automaticamente uma solicitação de um ciclo antigo. O início é o horário do servidor.

Novos checkouts de teste gravam as condições do período no momento de emissão.
Quando a API valida a aprovação, aplica uma vigência simulada a partir da data de
aprovação do provedor. Eventos repetidos, pagamentos fora de ordem ou outra cobrança
para um período já iniciado não prolongam nem sobrescrevem a vigência. Checkouts
anteriores a esta implementação continuam sendo validados, mas não recebem datas
contratuais presumidas. O proprietário pode simular a vigência pela solicitação.
Nenhuma empresa foi migrada ou recebeu vigência automaticamente pelo deploy.

Um período de teste ativo bloqueia a geração de outro checkout avulso para a mesma
empresa. O reajuste só pode entrar em uma nova vigência depois do vencimento. A
solicitação antecipada de renovação não encurta o ciclo atual nem inicia o próximo.

Na página de planos da empresa, o preço do período aparece como garantido até o
vencimento. O catálogo e a revisão são liberados perto da renovação: inicialmente
30 dias antes do anual e 7 dias antes do mensal. O aviso informa o preço seguinte,
quando houve alteração, sem aplicá-lo ao ciclo atual. O novo valor é consultado no
catálogo; o valor do período permanece no snapshot. A validação é feita também no
servidor. Depois do vencimento, a revisão continua disponível sem bloquear o acesso
gratuito do sistema. Este aviso aparece ao consultar/atualizar a página de planos;
não há envio automático por e-mail, tarefa agendada, débito recorrente ou polling.

A vigência é separada da assinatura administrativa e dos membros. Não modifica
status trial/active, prazo gratuito, suspensão ou permissões de acesso. Antes de
ativar contratação real, o fluxo deverá vincular essas mesmas regras a pagamentos
reais validados, aceite do responsável, política de cancelamento e avisos efetivos.
A recorrência real permanece desativada.

## Nome comercial dos planos atuais

O padrão do formulário e dos modelos mensal/anual agora é **SM**. **SM PRO** está
reservado para o futuro; nenhum novo plano PRO é criado nesta alteração.
Em Planos, **Aplicar nome SM nos planos atuais** executa uma renomeação autenticada
pelo proprietário, em transação, dos planos ativos com os nomes legados Sistema,
Sistema de Madeiras — Completo e Sistema de Madeiras — Completo Anual. Preserva IDs,
preços (inclusive zero ou valores reajustados), periodicidade e vínculos. É idempotente
e auditada. O deploy prepara a ação, mas não modifica o Firestore sem o clique do
proprietário. Planos inativos e outras categorias não são alterados.

Históricos de solicitações e pagamentos conservam o texto original. A vigência exibe
o nome atual do plano quando disponível, mantendo intactos os valores e datas do
snapshot contratado. Mensal e anual são diferenciados pela periodicidade na interface.

## Excluir um plano criado por engano

Cada plano possui Editar e Excluir. A exclusão individual não exige nome igual a
outro plano. O proprietário confirma o nome e a periodicidade na interface. A API
`plan.delete` valida ID e revisão atual e, em transação, confere assinaturas,
pagamentos, solicitações e vigências de teste. Qualquer vínculo impede a exclusão;
nenhum registro é migrado ou apagado em cascata. Sem vínculos, somente o documento
do plano é excluído, com auditoria. Repetir uma exclusão já concluída é inofensivo.
A remoção de duplicatas usa a mesma verificação de vínculos. O deploy disponibiliza
o controle; a exclusão ocorre apenas pelo clique na conta autenticada do proprietário.

## Pagamento solicitado pelo responsável — 30/10/2026

A página `/contratacao/` agora liga a escolha do plano ao pagamento **somente de teste**:

1. O responsável autenticado registra o plano e a preferência de renovação.
2. Para renovação manual e valor positivo, pode gerar o checkout de teste e abrir o link do Mercado Pago. O preço e o período são conferidos no servidor; a empresa vem do vínculo, nunca de um ID informado pelo navegador.
3. O webhook existente ou a conferência autenticada consultam o pagamento no Mercado Pago. Aprovação, vendedor, referência, moeda e valor precisam coincidir antes de registrar o período mensal/anual.
4. A página mostra o pagamento da solicitação e o período registrado. Sem polling; atualizar/conferir são ações explícitas.
5. Valor zero inicia um período gratuito de teste sem chamar o provedor.

Uma reserva transacional e uma referência estável por empresa/solicitação impedem checkouts simultâneos por repetição de clique. Após falha/expiração da reserva, a tentativa reutiliza a referência. Solicitações com checkout pendente não podem ser trocadas silenciosamente; o responsável pode conferir a aprovação ou pedir revisão à plataforma. A renovação após o período encerrado aceita nova solicitação e novo checkout. Períodos vigentes e preços já contratados continuam preservados.

A API exige e-mail confirmado, vínculo ativo e conta responsável; não expõe vendedor, credenciais ou pagamentos de outras empresas. A preferência automática não gera checkout pago, pois a autorização de recorrência ainda não existe. Os cartões/contas devem ser de teste.

O acesso gratuito e o estado real dos membros/assinaturas são preservados. **Esta etapa não ativa cobrança de produção, bloqueio por inadimplência nem renovação automática.** Cancelamento/estorno de cobrança real e autorização contratual precisam ser concluídos antes da ativação real.

Validação: nove cenários específicos do checkout da empresa, incluindo geração idempotente, chamadas concorrentes, recuperação de erro, plano gratuito, conferência ponta a ponta com provedor simulado, isolamento entre empresas e renovação. Regressões de contratação, períodos, login, Mercado Pago e webhook passaram. Nenhum pagamento externo foi realizado pelo agente.
