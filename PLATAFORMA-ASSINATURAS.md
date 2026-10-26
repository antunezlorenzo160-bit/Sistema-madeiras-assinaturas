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
- Nenhuma cobrança real ou confirmação automática de pagamento.

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

Não há webhook, conciliação, renovação automática, emissão fiscal ou ativação por
pagamento nesta etapa. Gerar um checkout não marca uma fatura como paga. A ativação
de produção é uma etapa separada, após integração e testes desses fluxos.

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
