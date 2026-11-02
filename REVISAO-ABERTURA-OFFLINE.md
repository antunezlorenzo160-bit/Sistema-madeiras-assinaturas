# Abertura offline — revisão 5

Sintoma relatado: o sistema funciona sem internet na aba que já estava aberta, mas não inicia novamente em uma aba nova.

Mudanças:
- Registro do service worker no carregamento inicial, antes dos módulos de login/Firebase, em vez de depender apenas da conclusão da entrada no sistema.
- Novo cache de arquivos públicos (página, toras e três módulos Firebase); confirmação por mensagem com o worker ativo antes de anunciar que o acesso offline está preparado.
- Reparação dos arquivos ausentes e erro explícito de preparação quando a rede não permite salvá-los. Respostas HTTP temporariamente malsucedidas usam a cópia disponível.
- Revalidação HTTP da página e do worker para receber atualizações; cache do worker continua disponível offline.
- Nenhuma alteração nas regras de conta/vínculo, dados locais, filas de lançamentos ou leituras do banco. APIs, páginas administrativas e links de assinatura não entram nesse cache.

Verificação: testes simulados de instalação limpa, nova navegação sem rede, módulos, reparação após remoção de arquivo, falha de reparação, exclusão de URLs privadas e ordem do bootstrap. Sintaxe do login e da inicialização verificada. O teste final no Chrome do aparelho depende da preparação online no mesmo endereço e perfil; armazenamento apagado pelo navegador não pode ser recuperado sem nova preparação.

Conferência no aparelho: abrir a prévia com internet, entrar com Manter conectado, aguardar “Pronto para abrir sem internet neste navegador”, fechar a aba, desligar a conexão e reabrir o mesmo endereço. Não apagar os dados do site nem usar aba anônima.
