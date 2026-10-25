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
