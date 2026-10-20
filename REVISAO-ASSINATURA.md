# Assinatura desenhada na entrega

Branch: `feature/assinatura-desenhada`, baseada em `aa399c6`.

O recebedor abre o link existente, informa nome e código, desenha a assinatura e confirma. A área aceita dedo, caneta e mouse e permite limpar. O servidor exige um PNG com traços, verifica estrutura, CRC, dimensões e limite de tamanho. A imagem (`assinaturaImagem`) é gravada na mesma transação que nome, data e status do pedido. Uma assinatura já registrada não é substituída por novo envio.

O histórico mostra a imagem abaixo do nome e da data. O PDF usa o mesmo bloco, mantém a imagem e aguarda a decodificação das imagens pelo fluxo de impressão existente. Pedidos anteriores sem imagem continuam exibindo as informações disponíveis. A confirmação de sucesso fica visível após ocultar o formulário.

## Validação

- `npm test`: nove testes de validação de imagem e do handler com Firestore em memória, incluindo código incorreto, token inválido, pedido não entregue e proteção contra sobrescrita.
- `python tests/assinatura-browser.py`: Chromium com tela de celular e API simulada; verifica desenho, limpeza, envio vazio, payload PNG, sucesso visível, imagem no histórico e no fluxo real de exportação para PDF com os estilos de impressão do sistema e pedidos antigos. Requer Python Playwright e Chromium em `/usr/bin/chromium`; cria evidências em `review/`.
- Sintaxe dos scripts externos e dos scripts do HTML e do TEMPLATE verificada com `node --check`.

Os testes não usam credenciais nem dados do Firebase real. A integração com Firestore/Netlify ainda precisa de teste em ambiente de homologação com as variáveis já documentadas em LEIA-ANTES-DE-PUBLICAR.txt. Nenhuma regra do banco ou configuração de produção foi alterada. Não houve deploy.

## Roteiro de homologação para a revisão

1. Em ambiente de teste, marcar um pedido confirmado como entregue e abrir seu link.
2. Confirmar que um envio sem desenho é bloqueado; desenhar e limpar; desenhar novamente.
3. Enviar nome, código correto e assinatura. Conferir mensagem de sucesso.
4. Voltar ao histórico, conferir nome, data e imagem no pedido correto e gerar seu PDF.
5. Reenviar o convite e conferir que a assinatura original não é alterada.
6. Abrir um pedido antigo sem imagem e conferir que o histórico e o PDF continuam funcionando.
