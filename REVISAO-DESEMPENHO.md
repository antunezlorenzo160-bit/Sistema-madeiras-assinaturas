# Desempenho do lançamento

O clique de lançamento não relê o HTML/JavaScript inteiro. Contudo, `atualizarTelasAposLancamento` reconstruía Estoque 1/2, planilhas por espécie, posição e histórico mesmo quando esses painéis estavam ocultos. A mesma renderização também era acionada por atualizações recebidas do Firebase. Na carga, o fluxo salvava todas as coleções locais na inclusão do item e repetia essa gravação ao atualizar a tela.

A alteração mantém pendentes as quatro renderizações de estoque quando os painéis correspondentes estão ocultos. Ao abrir a aba ou subaba, elas usam os dados mais recentes; pedidos repetidos para o mesmo painel são agrupados. Os cálculos, validações, resumo visível e sincronização permanecem ativos. A pré-carga salva sincronamente apenas o resumo e os carregamentos alterados, antes da sincronização, e não repete a gravação após redesenhar. O comportamento completo de `save()` continua sendo o padrão para os demais fluxos.

## Medição local

Chromium, dados fictícios: 1.500 itens em cada estoque, 3.000 no total. Foram executadas quatro chamadas do renderizador real `renderEstoqueLancamentos` com o estoque oculto. Antes: 131,6 / 73,1 / 53,4 / 53,0 ms e 3.004 linhas HTML construídas. Depois: cerca de 0,1 ms na primeira chamada e abaixo da resolução do relógio nas seguintes; nenhuma linha HTML foi construída enquanto oculto. Esta medição cobre apenas um renderizador em ambiente local, não a latência total do celular ou do Firebase.

## Validação

- `python tests/performance-browser.py`: painel oculto não renderiza; ao abrir, mostra dados inseridos após o primeiro pedido de renderização; várias solicitações viram uma pendência; reabrir atualiza os totais; a gravação de carga não serializa coleções inalteradas, mantém resumo e carga persistidos e conserva o `save()` completo padrão.
- Teste de múltiplos carregamentos passou, incluindo guardar, retomar, alternar e fechar.
- Testes de cópia e assinatura/histórico/PDF passaram; os 10 testes Node também passaram.
- Sintaxe de todos os scripts verificada com `node --check`.

Teste no celular: na prévia, lançar várias peças no mesmo carregamento, abrir o Estoque para conferir os totais, voltar à Calculadora, guardar a carga e retomá-la pela aba Carregamentos. Também conferir uma entrada em Estoque 1/2 e seu histórico. A confirmação de sincronização continua dependendo da conexão; o salvamento local não foi adiado para um timer.

Sem publicação em produção nem merge na main. A branch inclui assinatura, cópias e múltiplos carregamentos das revisões anteriores.
