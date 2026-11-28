# Compra de toras: edição ao abrir — V797

Usuário relata que ao abrir Compras de toras não consegue abrir o teclado nem selecionar a fórmula. A consulta automática de histórico ativava o mesmo indicador de ocupação da confirmação/cancelamento; logRender desabilitava todos os inputs e selects da compra enquanto aguardava a rede (até 30s).

A consulta agora tem estado próprio, bloqueando apenas consultas repetidas de histórico, sem travar o rascunho. Campos e fórmula continuam editáveis e é possível adicionar toras durante a leitura. A confirmação/cancelamento mantém seus bloqueios e identidade persistida. Uma resposta antiga de histórico é descartada se houve confirmação ou cancelamento desde o início da leitura, sem apagar o recibo novo nem substituir sua mensagem. Estados pendente/confirmado agora explicam o bloqueio e orientam a ação existente de conferir confirmação ou Nova compra. Campos numéricos recebem inputmode apropriado.

Validação: três arquivos de testes passaram (UI, compra/servidor, pagamentos). Novos casos com consulta pendente verificam inputs/select habilitados e inclusão de linha D²×comprimento antes da resposta; resposta tardia não apaga compra confirmada; falha de histórico não bloqueia campos; confirmação incerta continua imutável. Build completo e 38 scripts sintaticamente válidos. Sem teste nativo de teclado Android neste ambiente.

Não altera fórmulas, valores, recibos existentes, financeiro ou dados privados. Publicação somente na prévia do PR 12.
