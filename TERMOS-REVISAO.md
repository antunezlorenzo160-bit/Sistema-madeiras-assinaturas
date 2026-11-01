# Termos e aceite do pagamento

## Situação atual

A versão rascunho-2026-11-01 permanece em revisão. Identificação do fornecedor, publicação dos contatos, suporte em horário comercial e regra de preservação para reativação foram autorizados pelo proprietário. Exclusão e cópias foram descritas conforme a verificação do código, sem promessa de backup ou recuperação automática não demonstrados.

Falta confirmar a localização do armazenamento e os detalhes operacionais dos prestadores, inclusive eventual transferência internacional de dados. Não preencher essas informações por suposição. O responsável foi solicitado a informar a localização mostrada no Firestore. A revisão técnica não certifica adequação jurídica individualizada.

## Controle do aceite

- Documento de revisão preservado em /termos/versoes/revisao-2026-11-01.html; ele ainda é rascunho.
- Manifesto do servidor: config/contract-terms.mjs, com versão, caminho, identificação do conteúdo Git e status review.
- O checkout exige versão e identificação de conteúdo iguais às do servidor; grava UID, data, versão, conteúdo e URL na aceitação.
- A mesma identificação entra na referência da contratação, preservando a relação entre preço, aceite e documento. Contratações anteriores exibem o link que foi aceito naquela contratação.
- Mesmo com todas as variáveis de ambiente preenchidas, status review não habilita cobrança. A página mantém o aceite desabilitado.
- PAYMENT_TERMS_URL deverá apontar exatamente para o documento versionado publicado no endereço do sistema autorizado, sem consulta ou fragmento. Não configurar este rascunho como termos definitivos.

## Publicação posterior

Após completar a revisão, criar uma nova versão definitiva com outro caminho, preservar o conteúdo publicado e atualizar o manifesto para published. Não sobrescrever um documento já publicado e aceito. Configurar a URL definitiva no Netlify, fazer novo deploy e conferir a conexão antes da primeira cobrança real controlada. A ativação de vendas e a transação de pagamento continuam sendo etapas distintas.

## Validação desta alteração

Foram conferidas diretamente a barreira de rascunho, a correspondência de URL com origem/caminho e a rejeição de aceite com versão ou conteúdo antigos, além da sintaxe do script da página. As verificações de URL em execução isolada usaram um substituto de URL para os exemplos controlados. A suíte Node preparada para verificar o conteúdo Git do arquivo e a gravação do aceite não pôde ser executada no ambiente indisponível desta etapa. O deploy do Netlify deve concluir a compilação antes de entregar a prévia. Nenhum pagamento real nem alteração de variáveis de ambiente foi feito pelo agente.
