# Prazos de acesso e simulação — prévia

Política preparada: até o vencimento, uso normal; nos 5 dias seguintes, tolerância com uso normal; durante os 30 dias posteriores, consultas e exportações; depois, somente Configurações → Planos. Os dados não são excluídos. A confirmação válida de novo período restaura o acesso nas empresas explicitamente habilitadas para esse teste.

## Antes do teste

Publicar `firestore.rules` no projeto `estoque-madeiras-cc4d7`, pelo console Firebase → Firestore Database → Regras. A mesma versão está disponível em `/regras-acesso-planos.txt` e no botão **Copiar regras do Firestore** nos detalhes da empresa. O deploy do Netlify não publica regras do Firebase. Nesta sessão não havia ferramenta autenticada de publicação das regras; elas não foram publicadas pelo agente.

As regras mantêm o isolamento por membro ativo, separam leitura/gravação e usam o horário do servidor. A política canônica de cada empresa fica em `/empresas/{empresaId}/acesso/plano`, com escrita exclusiva pelo servidor. Empresas sem política habilitada conservam seu acesso anterior. Há uma leitura/observação adicional desse documento pequeno; não há consulta periódica de coleções nem agendamento de tarefas para os vencimentos.

## Roteiro sem esperar dias

1. Administração → Empresas → Consultar e gerenciar → Testar vencimento do plano.
2. Escolher uma empresa de teste e, no sistema dessa empresa, atualizar uma vez com internet para receber o código novo.
3. Aplicar **Uso normal**. Conferir um lançamento.
4. Aplicar **Tolerância de 5 dias**. O aviso aparece e o lançamento continua disponível.
5. Aplicar **Somente consultas e exportações**. Visualizar estoque/orçamento, copiar e gerar PDF. Lançar/salvar/alterar/excluir ficam bloqueados, inclusive gravação direta no Firestore após publicar as regras.
6. Aplicar **Somente Configurações / Planos**. A tela de dados sai e ficam o acesso a Planos e a saída da conta. A página de contratação continua autenticada e apta a receber renovação.
7. Aplicar **Simular restauração após pagamento**. A aplicação deve voltar ao uso normal. Esse comando é uma simulação do proprietário, não um pagamento registrado no Mercado Pago.
8. Ao terminar, usar **Desligar simulação (acesso de teste livre)**.

A simulação só muda a política de acesso da empresa selecionada e seus metadados de administração, com auditoria. Não muda preço, datas do período contratado, assinaturas, pagamentos ou documentos da operação. Não substitui uma política marcada como real. O pagamento aprovado pelo provedor também restaura automaticamente a janela de acesso quando o teste está habilitado e um período novo é efetivamente aplicado.

## Offline e limites de validação

O navegador usa os prazos da última política recebida para restringir sua interface offline. Dados já armazenados no aparelho não são apagados nem podem ser revogados remotamente enquanto não houver conexão. O horário local pode ser alterado; a proteção autoritativa online usa `request.time` no Firestore. Novas operações de escrita e envio das filas são suspensos durante a restrição; as filas existentes são preservadas para retomar após regularização. É necessário conectar para renovar.

Passaram testes unitários das fronteiras exatas dos prazos, simulação por empresa e controle de versão, preservação dos dados, restauração em confirmação de pagamento, proteção de política real, bloqueio de escrita/fila e permissões de consultas/exportações na interface, além das regressões de pagamentos e login. Sintaxe dos scripts internos verificada. O arquivo de regras foi revisado e sua cópia pública conferida; não houve execução do emulador de regras nem teste visual em navegador nesta sessão. O teste final direto no Firestore depende da publicação acima.
