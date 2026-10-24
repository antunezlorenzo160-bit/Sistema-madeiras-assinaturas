Fundo estável nas abas

O tema de vidro já usava uma camada fixed, mas ela cobria a altura variável do iframe/janela. Em celulares, ocultar/mostrar a barra do navegador pode mudar essa altura durante a rolagem e redimensionar a foto. A camada de fundo passa a usar uma altura estável baseada na tela para cadastro, orçamento, carregamentos, clientes e configurações, com ajuste quando muda a largura/orientação. A marca d'água usa a mesma referência vertical. Não usa bloqueio de rolagem ou handlers de touchmove.

A aplicação é delimitada ao tema com paisagem e exclui início, estoque e calculadora, preservando os comportamentos já aprovados. Outros temas e impressão não recebem o ajuste.

Validação Chromium com template completo e Firebase simulado: rolagem real da página com conteúdo longo; variação da altura do viewport transmitida ao iframe como no app; altura do fundo e posição da marca d'água permanecem iguais em cada uma das cinco abas; estoque e calculadora não recebem a classe do ajuste. Regressão da inicialização e prévia de volume da tela completa aprovada. Requer conferência visual no Android para efeitos específicos do compositor do navegador.
