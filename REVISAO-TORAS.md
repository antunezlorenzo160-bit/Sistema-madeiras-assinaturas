Cubagem de toras — prévia

Na Calculadora, o botão Toras abre uma ferramenta própria. Recebe identificação opcional, diâmetro da ponta fina em centímetros, comprimento em metros e quantidade inteira. Método cilíndrico: π × (D/100)² / 4 × comprimento × quantidade; não desconta casca, não estima a conicidade e não aplica tabelas comerciais. O método aparece no resumo exportado.

Mostra volume individual e total; permite adicionar grupos, remover, limpar com confirmação, copiar e solicitar PDF pelo gerador existente. A lista persiste somente no dispositivo, usando o armazenamento já delimitado pela empresa. Não grava no Firestore nem movimenta estoque, carregamentos ou pedidos. Os dados de toras não são convertidos em bitolas de madeira serrada.

Verificação: npm test (12 testes, incluindo unidade, quantidade, medidas inválidas e overflow); python tests/toras-browser.py (formulário móvel, volumes, identificação como texto, resumo copiado, solicitação de PDF, recuperação local, remoção e limpeza); python tests/copia-browser.py; análise sintática dos scripts do template. A abertura do serviço de impressão Android precisa da conferência na prévia pelo usuário.

Exemplo: diâmetro 40 cm, comprimento 3 m, quantidade 2 → 0,3770 m³ por tora; 0,7540 m³ total. Cálculos não arredondam antes da soma.

Resumo em tabela: espécie, quantidade, diâmetro da ponta fina em cm, comprimento em m, volume individual e volume total. Campos opcionais acompanham cada lançamento. Rolagem horizontal no celular; tabela integral no PDF, sem ações. A cópia usa tabelas compactas por espécie para preservar números sem dividir colunas longas no WhatsApp. Os registros e o formato de armazenamento continuam os mesmos.

Identificação única do resumo: mão de obra e cliente ficam no cabeçalho da lista, cópia e PDF, sem repetição por tora. Alterações nos campos atualizam o cabeçalho imediatamente; campos vazios são omitidos. A identificação persiste separadamente no mesmo armazenamento local delimitado pela empresa. Na primeira abertura de listas antigas, recupera o último preenchimento não vazio de cada campo sem alterar as linhas existentes.

Cadastro de mão de obra por m³: preço base e exceções por espécie (identificação sem diferenciar acentos/maiúsculas). O painel permite salvar, editar e remover exceções; remoção volta a usar base nos próximos lançamentos. Preços são sincronizados no documento cubagem_toras_mao_obra da coleção sm2_servicos, usando o caminho já delimitado pela empresa e as regras existentes. Sem gravação automática ao abrir; preços precisam ser confirmados pelo servidor antes de salvar cadastro ou fazer lançamento cobrado. Erros de leitura/gravação são informados na tela.

Checkbox “Calcular mão de obra neste lançamento” separa serviço de toras próprias. O preço por m³ é congelado em cada lançamento; a multiplicação usa volume não arredondado e arredonda o valor monetário por linha para centavos. Novos cadastros de preços não alteram lançamentos existentes. Linhas antigas ou não cobradas mostram traço nas colunas financeiras quando há outras linhas cobradas. A lista operacional continua local, como antes; somente a configuração de preços é sincronizada.

Validação: 14 testes Node; testes Chromium de cadastro, base, exceção, atualização sem reprecificar histórico, toras próprias, totais financeiros, cópia/PDF, reabertura e falha de gravação/leitura; regressão de cubagem e cópia; sintaxe dos scripts do template. Persistência de preços no Firestore simulada no teste, sem acesso aos dados reais da empresa.

Resumo compacto no celular: até 600px cada lançamento organiza espécie no topo, cinco medidas em colunas curtas e preços/valor abaixo. Nenhum valor é ocultado ou truncado; remover usa × com identificação acessível. Desktop e impressão conservam a tabela completa. Verificado em Chromium sem transbordamento horizontal em 320, 360 e 390px, com e sem cobrança; o modo de impressão mantém tabela.
