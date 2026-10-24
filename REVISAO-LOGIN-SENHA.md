Tela de login: visibilidade e recuperação de senha

Botão de olho mostra/oculta a senha, informa o estado por aria-label/aria-pressed e mantém o conteúdo/cursor. Não grava a senha. Ao iniciar o login, o campo continua sendo limpo e volta ao modo oculto.

“Esqueci minha senha” usa o e-mail informado e o fluxo sendPasswordResetEmail do Firebase Auth, que envia o link padrão para definir uma nova senha. Não altera senhas diretamente nem exige a senha antiga. Valida e-mail, pede conexão e informa falhas de rede/limite de tentativas. A resposta não revela se uma conta está cadastrada. Botões são protegidos contra solicitações concorrentes.

Validação Chromium com marcação e handlers reais: senha inicialmente oculta, troca visual do ícone e acessibilidade, conteúdo preservado, e-mail vazio/inválido, offline, envio simulado, resposta genérica para conta inexistente e recuperação após limite de tentativas. Regressão da preparação offline e sintaxe do HTML externo aprovadas. Nenhum e-mail real foi enviado pelos testes; a entrega usa a configuração de e-mail já existente no Firebase.
