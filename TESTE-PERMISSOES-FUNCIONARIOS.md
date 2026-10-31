# Funcionários e permissões — prévia

A gestão fica em Configurações → Funcionários e permissões (`/equipe/`). Somente o responsável real da empresa pode criar convites, alterar permissões e bloquear funcionários. A antiga simulação de usuários fica escondida; nenhum usuário fictício é convertido automaticamente em login.

## Ativação

1. Abra `/equipe/` com a conta do responsável.
2. Copie as regras completas pelo botão da página. Publique em Firebase → Firestore → Regras. O arquivo é o mesmo `firestore.rules` e `/regras-acesso-planos.txt`; mantém o isolamento por empresa e o bloqueio por vencimento.
3. Atualize a lista. O servidor consulta o release ativo na API Firebase Rules e compara o conteúdo completo normalizado com o hash preparado neste commit. Convites e resgates permanecem bloqueados enquanto as regras não corresponderem.
4. Se não confirmar mesmo após a publicação, a conta de serviço configurada no servidor precisa ter leitura de releases/rulesets (`firebaserules.releases.get`, `firebaserules.rulesets.get`). Nenhuma credencial é enviada ao navegador.
5. Gere um convite com o e-mail do funcionário. Copie e envie o link. Ele expira em 7 dias e fica no fragmento da URL. O banco guarda somente o hash do token.
6. O funcionário cria sua conta (ou entra na existente), confirma seu e-mail e abre o sistema com a própria conta. Não usa a senha do administrador.

## Teste sugerido

- Use um e-mail de teste diferente do responsável, em outro perfil do navegador.
- Modelo Venda: Clientes, Calculadora e Orçamentos liberados. Estoque fechado.
- Marque só Visualizar em Estoque e salve: o vendedor consulta estoque, sem criar, alterar, excluir ou transferir estoque. Confira no celular e PC.
- Tente acesso direto aos documentos/consultas de uma área não liberada com o SDK autenticado do funcionário: o Firestore precisa recusar.
- Libere Alterar em Estoque e confirme a ação em registros de teste; remova a permissão e confira a atualização da sessão ao conectar.
- Desative Funcionário ativo: a sessão deve fechar; a conta continua existindo, mas não lê os dados da empresa.
- Teste convite com e-mail diferente, cancelado, vencido e já usado: nenhum cria outro vínculo. Funcionário não pode abrir `/equipe/` nem atribuir permissões a si mesmo.
- Outra empresa não pode listar ou alterar esse funcionário. O responsável continua com acesso completo.
- Refaça uma fase de plano vencido: permissão de funcionário não passa por cima do bloqueio do plano.

## Escopo e limites

Cada área tem consulta/alteração. Pedidos/produção compartilham documentos, mas a API exclusiva da produção entrega somente os campos operacionais. Serviços/Toras compartilham a coleção de serviços; não há uma permissão separada para ocultar campos de preço dentro de documentos consultáveis. A calculadora depende da consulta de madeiras e serviços; a tela mostra essas dependências antes de salvar.

Permissões são salvas no vínculo autenticado `membros/{uid}`, com revisão e auditoria. Só o servidor escreve vínculos e convites. A empresa vem do login do responsável, nunca de um ID livre enviado pelo formulário. Funcionários nunca recebem papel administrativo. Vínculos existentes de outra empresa não são substituídos.

O armazenamento local dos funcionários usa empresa + UID, separado do armazenamento já utilizado pelo responsável. Consultas bloqueadas não chegam ao SDK; filas de alteração são checadas novamente antes de enviar. A sessão existente acompanha mudanças pelo observador do próprio vínculo e reinicia ao receber permissões novas. Sem internet, a conta conhece somente as permissões confirmadas e os dados que já estavam disponíveis no aparelho; revogações remotas precisam da conexão para chegar. O servidor aplica as permissões atuais quando a conexão volta.

## Verificações realizadas

Testes automatizados de funções puras, convites, isolamento, revisões, bloqueios, leitura sem alteração, proteção dos caminhos de escrita/leitura e verificador de regras publicadas. Regressões de pagamentos, vigência, acesso offline e suspensão do responsável. Scripts gerados e páginas novas verificados sintaticamente.

Não foi possível executar o emulador do Firestore (proxy do ambiente indisponível para baixar as dependências) nem Chromium (o processo encerrou durante a inicialização). Por isso a validação real das regras e a conferência visual no celular/PC precisam do teste acima após a publicação. Não houve publicação de regras nem criação de funcionário real pelo agente.

## Separação das permissões — versão 2

A página agora oferece **Orçamentos**, **Pedidos** e **Produção** separadamente. Cadastro de madeiras também pode ter Visualizar desmarcado enquanto Calculadora continua liberada: as consultas internas necessárias ao cálculo não são permissão para abrir a página de cadastro.

- Orçamentos: itens do orçamento em elaboração (`sm2_orcamento_itens`).
- Pedidos: registros salvos (`sm2_orcamentos_guardados`). Guardar orçamento exige Pedidos → Alterar, porque cria um registro nessa área. Sem essa permissão, a ação é interrompida antes de esvaziar o orçamento atual.
- Produção: nova página `/producao/`, com projeção por lista explícita de campos entregue pela API autenticada. Mostra somente pedidos confirmados, dimensões, quantidades, serviços, cliente, prazo, observação e andamento. Não retorna telefones, preços, descontos ou dados financeiros. Produção sozinha não recebe leitura dos documentos completos de Pedidos no Firestore.
- Ações da produção: iniciar, pausar, retomar, finalizar, observação e material usado. O servidor valida a permissão atual, a empresa, o plano, a revisão e o estado do pedido em transação. Atualiza somente os campos operacionais. Alterar Pedidos sozinho não permite modificar esses campos na gravação direta do Firestore.
- A fila exclusiva tem botão **Atualizar fila** para novos pedidos e alterações de outros usuários. Não há polling. As próprias ações atualizam a fila. Um observador do vínculo interrompe a visualização quando a conta perde a permissão.

**Ativação:** publique novamente as regras completas pelo mesmo botão em `/regras/`. Elas incluem o marcador `EMPLOYEE_PERMISSIONS_V2`. Atualize a lista em `/equipe/`; só após a confirmação do hash será possível gravar as novas permissões e usar a API de produção. Não foram publicadas regras pelo agente.

Vínculos antigos (permissionsVersion 1) mantêm o antigo acesso combinado até o responsável editar e salvar. A lista expande a permissão antiga em três opções para permitir uma escolha explícita; o salvamento grava permissionsVersion 2. Convites antigos continuam válidos e preservam os acessos originalmente autorizados. Não há migração em massa nem alteração de preços ou pedidos. Uma tela antiga de edição é recusada pelo servidor em vez de apagar permissões sem exibir as opções novas.

### Testes adicionais

1. Funcionário com somente Produção → Visualizar: abre a fila, sem preços e sem editar andamento. Não abre Pedidos nem Orçamentos.
2. Libere Produção → Alterar: teste iniciar, pausar, retomar, finalizar, material usado e observação em um pedido de teste. Confira com o administrador que preço/desconto/itens não mudaram.
3. Funcionário com somente Pedidos → Visualizar: consulta registros salvos sem acessar o orçamento em elaboração ou a página de produção. Pedidos → Alterar permite administrar pedidos, mas não ações de produção sem a respectiva permissão.
4. Funcionário com Orçamentos → Alterar e sem Pedidos → Alterar: prepara e exporta a proposta. Tentar Guardar mostra a permissão necessária e preserva os itens atuais.
5. Desmarque Cadastro de madeiras → Visualizar mantendo Calculadora: o cadastro some dos atalhos e a calculadora continua com espécies e preços necessários. Alterar cadastro continua bloqueado quando não autorizado.
6. Publique as regras, salve as escolhas de um funcionário existente e repita os testes no celular e PC. As condições do plano continuam prevalecendo.

Validação automatizada cobre a matriz independente, a compatibilidade com vínculos antigos, projeção sem campos financeiros, etapas da produção, revisões concorrentes, material apagado, vínculo revogado, plano bloqueado, isolamento e controles de navegação. O emulador Firestore e o navegador visual não estavam disponíveis neste ambiente, conforme explicado acima; a validação publicada depende do teste no Firebase e na prévia.
