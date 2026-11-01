# Termos de uso, contratação e privacidade

## Versão publicada

manual-v1-2026-11-01, em /termos/versoes/manual-v1-2026-11-01.html. O conteúdo dessa versão deve permanecer preservado. /termos/ apresenta a versão atual para consulta; contratações registram o endereço versionado, a versão e a identificação do conteúdo do manifesto config/contract-terms.mjs.

O fornecedor autorizou a publicação de sua identificação e contatos, aprovou o horário de suporte (segunda a sexta, 8h–12h e 13h30–18h, Brasília, exceto feriados), a conservação para reativação conforme necessidade e obrigações legais, e o prosseguimento da publicação dos termos. O texto distingue vencimento do plano, encerramento da conta, cancelamento e exclusão dos dados, sem prometer backup integral automático ou restauração não comprovada.

## Fontes e limites da conferência

- Firestore: projeto estoque-madeiras-cc4d7 e região southamerica-east1 (São Paulo) conferidos pelas telas enviadas pelo fornecedor. Não foi alterada a região do banco.
- Firebase Authentication: processamento nos EUA segundo https://firebase.google.com/support/privacy (documentação oficial consultada em 01/11/2026).
- Netlify: hospedagem/funções e uso de infraestrutura e subprocessadores, inclusive nos EUA, conforme https://www.netlify.com/trust-center/ . Não foi atribuída uma região específica à instância das Functions sem comprovação.
- Mercado Pago: finalidade de pagamento/validação e referência a https://www.mercadopago.com.br/privacidade . Não se afirma que todos os prestadores tratem todos os dados ou que todos os serviços estejam no Brasil.
- A divulgação não certifica, por si só, conformidade jurídica nem comprova mecanismos de transferência internacional adotados em cada contrato dos prestadores. Essa obrigação continua cabendo ao fornecedor. É recomendável revisão jurídica individualizada, especialmente antes da oferta ampla do serviço.

## Aceite e ativação

O manifesto identifica a versão publicada. A API exige essa versão e o conteúdo correspondente, registra UID, data, URL e identificação do documento e recusa aceite antigo ou modificado. O teste que representa termos em revisão usa explicitamente status review, independentemente do status da versão publicada.

Ainda é necessário configurar PAYMENT_TERMS_URL para o endereço versionado correto e conferir as demais variáveis privadas. Nenhuma variável do Netlify foi alterada pelo agente. MERCADO_PAGO_LIVE_ENABLED continua dependendo da ação explícita de ativação no servidor. Não houve cobrança real nesta entrega nem publicação do site principal.

## Validação

Foram verificadas diretamente as regras de configuração/versão com casos controlados, o conteúdo do documento e a correspondência da cópia preservada com seu identificador Git, além da sintaxe do script da página. A suíte Node atualizada permanece preparada para execução no ambiente de desenvolvimento; o ambiente de execução está indisponível nesta etapa. O deploy da prévia deve concluir a compilação no Netlify antes da entrega.
