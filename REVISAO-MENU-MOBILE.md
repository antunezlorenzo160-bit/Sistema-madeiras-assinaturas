# Menu lateral no celular

Somente em telas de até 760 px, o menu lateral começa oculto em todas as abas.
O botão fixo “☰ Menu” abre a navegação. Selecionar uma opção, tocar no fundo,
usar “Fechar menu” ou pressionar Escape fecha o painel. Trocar de aba por outro
atalho também fecha o menu. O comportamento do computador foi preservado.

O build do Netlify executa `node scripts/build-mobile-menu.mjs`, que incorpora
os arquivos de `ui/` no aplicativo dentro do iframe. Não há requisições novas
necessárias para abrir o menu quando o aplicativo está disponível offline.

Validação: abertura e fechamento, oito abas, navegação, Escape, mudança para
desktop, execução repetida do build e sintaxe dos 31 scripts incorporados.
O teste visual com Chromium ficou bloqueado pelas restrições do ambiente;
conferir no celular em uma nova prévia do Netlify.

Esta mudança fica na branch `fix/menu-mobile-retratil`. Não publicar em produção.

## Paridade da calculadora no PC — 29/10/2026

Revisão das alterações da noite de 28/10, após as 18h:

- Campos de largura/comprimento compactos em m², com um único botão do contador abaixo de Lançar; colunas consistentes no painel dividido do PC.
- Madeira verde/Corrigir e sentidos da transferência com espaço próprio e texto sem sombra pesada, também no PC.
- Serviços somente em Orçamento/Carga, em m³ e metro linear; desmarcados ao trocar a unidade. Regras compartilhadas, sem dependência da largura de tela.
- Botão Lançar linear com coluna reservada mesmo sem serviços visíveis.
- Barra do Orçamento com apenas Limpar campos; as ações de resumo dos demais destinos são preservadas.
- Cadastro linear com percentuais de Encaixe/Friso por produto, seletores compactos na calculadora e preços salvos por lançamento.
- CMDP linear opcional no cadastro e na linha do orçamento, arredondando cada comprimento para 0,50 m; comprimento e metragem reais preservados; serviços sobre o valor corrigido.
- Planilha lateral do PC agora exibe orçamento, estoques e cargas em metro linear, sem confundir com m³. Mostra CMDP/serviços/valor no orçamento e carga; estoque mostra medidas reais sem controles de cobrança.

Verificação: testes de cálculo linear, persistência da configuração, CMDP e geração das planilhas do PC; sintaxe dos 31 scripts internos. Sem validação visual em navegador nesta sessão. Nenhuma nova consulta, assinatura do banco, cobrança real ou publicação em produção.
