# Convite de empresa com teste gratuito sem prazo

O proprietário pode gerar convites em Administração → Empresas. Nome e e-mail são
opcionais: quando informados, ficam vinculados ao convite; quando vazios, o
responsável informa o nome e confirma o próprio e-mail. Cada convite cadastra uma
única empresa. Não compartilhar o link publicamente.

O convite encaminhado nesta revisão foi autorizado pelo proprietário na conversa.
Seu hash e identificador de empresa estão em `owner-invitations.json`, somente na
função de servidor. O token não é gravado no repositório. O primeiro resgate válido
grava a utilização no Firestore dentro da mesma transação do cadastro. Retentativas
da mesma conta são idempotentes; outra conta não pode reutilizar o convite.

A função exige Firebase Auth e e-mail verificado, preserva qualquer vínculo
existente, cria empresa/perfil próprios e assinatura `trial`, `trialMode:indefinite`,
`trialEndsAt:null`, `automaticBilling:false`. Nenhum checkout é gerado. A cobrança
real e a migração automática de teste para plano pago continuam desativadas.

A abertura deixa de depender de uma conta fixa e passa a validar `membros/{uid}`
ativo. Mantém as verificações de leitura anônima negada e de outra empresa negada,
além dos caminhos e armazenamento local delimitados pela empresa. Nenhuma regra
do Firestore é alterada. Se as regras publicadas estiverem restritas à empresa
antiga, a abertura da nova empresa será negada e exigirá ajuste separado das regras.
As regras atuais não estavam disponíveis nesta revisão; testar o cadastro e o
isolamento em dois aparelhos antes do uso operacional. A prévia usa o Firebase
existente, portanto os registros nela cadastrados são reais.

Testes locais: identidade verificada, e-mail vinculado, convite genérico, uso único,
retentativa, vínculo existente preservado, empresa distinta, plano sem expiração,
sem cobrança, geração de HTML idempotente e verificações de abertura preservadas.
Não houve criação de conta de cliente ou leitura/gravação no Firebase pelo agente.
