# Confirmação da baixa e conferência do envio — V792

Relato: carga ajustada e baixada no celular, sem aviso final e sem aparecer no PC. Usuário solicita verificar se ficou incompleta. Não houve acesso à sessão ou ao banco privado; não é possível afirmar o estado desta carga específica sem a conferência do aparelho.

Encontrado no código: após criar as operações completas da baixa na fila durável, a conclusão fazia um batch separado de set com merge apenas de status e datas antes de aguardar o envio da fila. Em documento ainda não criado, esse upsert pode produzir registro sem dados físicos; uma corrida com exclusão também pode recriar documento. O aviso local aguardava essa resposta da rede. Isso identifica um risco concreto, mas não prova a origem histórica dos registros vistos nas fotos.

A conclusão agora usa somente os registros completos da fila existente. Aguarda a persistência final local, libera a tela e avisa que o envio ainda está pendente quando houver operações na fila. Não espera uma resposta de rede indefinida para confirmar a etapa local. Não repete a baixa nem altera o cálculo ou o diário de recuperação. A fila mantém o envio e a confirmação de cada revisão existentes.

O aviso de sincronização não pode informar sucesso com operações na fila ou falha de persistência local. Falhas do envio deixam de ser silenciadas nas coleções de carga/estoque/movimentos: o código do último erro pendente é mostrado e deixa de valer ao confirmar ou substituir aquela revisão. Não adiciona tentativas automáticas.

Novo botão Conferir envio no detalhe da carga: leitura explícita, feita pelo usuário, compara IDs, medidas, quantidades e status locais com os registros da empresa no servidor. Consulta limitada a 1.001 documentos, sinaliza resultado parcial para carga maior e não declara completude nesse caso. Prazo de 20s para a conferência na interface; não cancela nem repete gravações. A opção Copiar conferência inclui campos técnicos, pendências e última etapa de falha local relevante, sem credenciais, contatos ou valores financeiros.

Validação: quatro arquivos de testes passaram (conclusão/conferência, integridade de registros, exclusão da calculadora e armazenamento durável). Casos incluem rede que nunca responde, falha de persistência, ausência do item no servidor, preservação da carga existente, diagnóstico somente leitura, estados de fila por revisão e impedimento de falso sincronizado. Build completo e 38 scripts gerados sintaticamente válidos. Sem teste visual nativo ou verificação do banco privado.

Publicação somente na prévia do PR 12. Nenhum registro real foi excluído, corrigido, baixado, estornado ou migrado pelas ferramentas. O envio já pendente da carga relatada ainda precisa ser conferido no aparelho de origem; não está confirmado por estes testes.
