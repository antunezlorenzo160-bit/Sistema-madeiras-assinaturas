# Registros incompletos de carga — V791

Relato: testes apagados na calculadora da prévia aparecem também na versão publicada como cargas com 0 peças, sem espécie ou medidas, apresentadas como Baixado. A captura confirma uma linha física vazia, mas não revela os campos brutos do documento nem comprova qual versão ou operação o criou. Estoque e carregamentos compartilham a mesma coleção da empresa entre as duas versões; o isolamento financeiro não isola essas coleções.

Correções preventivas e de apresentação:
- A verificação de escrita da coleção de cargas agora recusa registros sem nenhuma quantidade, volume ou medida positiva. Executa antes da liberação do administrador e alcança os adaptadores existentes de gravação, lote e fila. Exclusões continuam permitidas; patches usam as medidas do registro existente. Não altera regras de acesso.
- Grupos formados apenas por registros sem dados físicos são identificados como Registro incompleto e Sem dados físicos, sem classificá-los como Baixado. O detalhe preserva os registros e oferece Copiar diagnóstico, sem gerar documentos comerciais vazios.
- O diagnóstico inclui IDs, campos físicos, estados, datas e nomes dos campos existentes; exclui valores de contatos, financeiro e credenciais. Serve para investigar a origem dos registros já existentes.

Não executa limpeza, migração, nova baixa ou estorno. Não oculta os registros da lista. Não atribui a criação histórica a uma operação ainda não confirmada. A origem exata e eventual reparação dos documentos existentes dependem de conferir o diagnóstico. Bloqueio é do aplicativo atualizado; versões antigas ainda abertas não recebem essa proteção.

Validação: testes de integridade, exclusão da calculadora, lote de pacotes e eficiência passaram. Casos cobrem administrador, outros caminhos de coleção, delete, set vazio, patches de registro existente, novas cargas em m³/m²/linear/granel, diagnóstico sem valores privados e preservação dos dados. Build completo passou; 38 scripts gerados com sintaxe válida. Sem inspeção visual nativa nem acesso ao banco privado. Publicação somente na prévia do PR 12; produção não alterada.
