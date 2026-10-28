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
