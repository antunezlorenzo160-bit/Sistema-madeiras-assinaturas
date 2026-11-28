# Conferência de carga: acesso aos itens — V793

Erro relatado pelo usuário: itensGrupoCargaV400 is not defined ao tocar em Conferir envio. A função original pertence ao escopo privado do renderizador de cargas; os novos callbacks de conferência e diagnóstico foram inseridos no escopo do módulo e não podiam acessá-la. O teste anterior fornecia um stub dessa função, mascarando a falha.

Os dois callbacks agora usam um seletor puro no próprio módulo, sobre a lista de carregamentos já hidratada. Preserva as mesmas chaves por grupo e o fallback legado por ID/posição. Uma seleção sem itens informa o problema e não consulta o servidor nem declara correspondência vazia. Não expõe a função privada nem muda o agrupamento do carregamento original.

Validação: testes de integridade/diagnóstico, conclusão/conferência e exclusão da calculadora passaram. Conferência e cópia executadas sem stub da função privada; casos de agrupamento atual, legado, chave inexistente e preservação dos registros. Build completo e 38 scripts sintaticamente válidos. Os dois callbacks efetivamente extraídos do HTML gerado foram executados em VM, incluindo consulta simulada, comparação e cópia da conferência e diagnóstico. Sem inspeção visual nativa e sem acesso ao banco privado.

Não apaga ou reenvia a fila, não modifica estoque, não repete a baixa. Publicação limitada à prévia do PR 12. A carga do usuário e as 9.671 operações pendentes continuam sem confirmação: aguardar a conferência no aparelho de origem.
