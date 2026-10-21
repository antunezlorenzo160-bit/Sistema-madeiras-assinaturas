# Cópias em tabela

O botão Copiar dos pedidos, histórico e demais blocos que usam `copiarBloco` passa a separar cliente, datas, status, assinatura e totais em linhas. As tabelas usam colunas alinhadas e blocos de três crases para a fonte monoespaçada do WhatsApp. As células vazias são preservadas para evitar deslocamento de valores; grupos e subtotais mantêm sua posição, e textos compridos quebram em linhas sem corte de conteúdo. A legenda da imagem da assinatura é removida do texto; nome e data são mantidos. A imagem continua no PDF.

A formatação trabalha numa cópia temporária do bloco, respeita elementos ocultos e não altera o pedido nem o documento impresso. Se o navegador negar as duas formas de acesso à área de transferência, aparece uma mensagem de falha em vez de confirmar que copiou.

Validação: `python tests/copia-browser.py` passou no Chromium para cabeçalho, colunas, serviços vazios e preenchidos, grupos, totais, remoção de controles, escrita da área de transferência e falha de permissão. Os 10 testes Node e `python tests/assinatura-browser.py` também passaram.

A tabela de texto é editável. A aparência ao colar depende do aplicativo e da largura da tela; no WhatsApp as três crases ativam a fonte monoespaçada. Para preservar exatamente o layout, logomarca e assinatura desenhada, enviar o PDF existente. Não houve merge na main nem publicação em produção.
