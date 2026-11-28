# Rolagem da movimentação no celular — V800

Usuário relata que a aba Movimentação parece enroscar ao rolar. Pergunta sobre celular/PC e gesto sobre tabela enviada; sem resposta até esta alteração. Adotado ajuste conservador para celular, como comunicado.

Inspeção: wrapper genérico de tabelas usa overflow auto; a regra móvel do histórico trocava somente overflow-x para visible. Com overflow-y auto herdado, o valor computado de x também pode se tornar auto e a tabela continuar criando um contêiner de rolagem interno ao main. A tabela móvel já tem largura de 100%, min-width 0 e layout fixo.

Regra de tela até 760px, restrita ao body da movimentação/histórico: painéis ficam sem limite de altura e com overflow visible; wrappers das tabelas também ficam com overflow visible, overscroll automático e gesto vertical com pinch zoom permitido. O main existente continua responsável pela rolagem vertical. Não altera a rolagem horizontal do desktop, impressão, tabelas, filtros, ordem dos registros ou dados. A seleção automática da calculadora continua mantida, conforme decisão expressa do usuário.

Verificação: build completo passou, regra de escopo móvel presente no HTML e 38 scripts com sintaxe válida; seleção de foco/toque da calculadora permanece. Mudança apenas CSS, sem testes artificiais que espelhem o estilo. Sem reprodução visual/gesto nativo de Android, portanto causa e melhora real ainda dependem do teste do usuário. Publicação somente prévia PR 12.
