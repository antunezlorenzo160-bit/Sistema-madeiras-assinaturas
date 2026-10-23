Cubagem de toras — prévia

Na Calculadora, o botão Toras abre uma ferramenta própria. Recebe identificação opcional, diâmetro da ponta fina em centímetros, comprimento em metros e quantidade inteira. Método cilíndrico: π × (D/100)² / 4 × comprimento × quantidade; não desconta casca, não estima a conicidade e não aplica tabelas comerciais. O método aparece no resumo exportado.

Mostra volume individual e total; permite adicionar grupos, remover, limpar com confirmação, copiar e solicitar PDF pelo gerador existente. A lista persiste somente no dispositivo, usando o armazenamento já delimitado pela empresa. Não grava no Firestore nem movimenta estoque, carregamentos ou pedidos. Os dados de toras não são convertidos em bitolas de madeira serrada.

Verificação: npm test (12 testes, incluindo unidade, quantidade, medidas inválidas e overflow); python tests/toras-browser.py (formulário móvel, volumes, identificação como texto, resumo copiado, solicitação de PDF, recuperação local, remoção e limpeza); python tests/copia-browser.py; análise sintática dos scripts do template. A abertura do serviço de impressão Android precisa da conferência na prévia pelo usuário.

Exemplo: diâmetro 40 cm, comprimento 3 m, quantidade 2 → 0,3770 m³ por tora; 0,7540 m³ total. Cálculos não arredondam antes da soma.

Resumo em tabela: espécie, quantidade, diâmetro da ponta fina em cm, comprimento em m, volume individual e volume total. Campos opcionais acompanham cada lançamento. Rolagem horizontal no celular; tabela integral no PDF, sem ações. A cópia usa tabelas compactas por espécie para preservar números sem dividir colunas longas no WhatsApp. Os registros e o formato de armazenamento continuam os mesmos.

Identificação única do resumo: mão de obra e cliente ficam no cabeçalho da lista, cópia e PDF, sem repetição por tora. Alterações nos campos atualizam o cabeçalho imediatamente; campos vazios são omitidos. A identificação persiste separadamente no mesmo armazenamento local delimitado pela empresa. Na primeira abertura de listas antigas, recupera o último preenchimento não vazio de cada campo sem alterar as linhas existentes.
