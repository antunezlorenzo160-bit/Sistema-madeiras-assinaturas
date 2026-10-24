"""Manager note autosaves and is visible read-only to staff, using actual queue/render/save functions."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
def fn(name):
 a=t.index('function '+name+'(');m=re.search(r'^function |^async function ',t[a+10:],re.M);return t[a:a+10+m.start()]
helpers=t[t.index('function podeEditarObservacaoProducao('):t.index('function pedidoProducaoDados(')]
queue=t[t.index('function offlineOps()'):t.index('let offlineSyncPromiseV396=')]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844});page.set_content('<div id="telaProducaoCompartilhada"><div id="listaProducaoCompartilhada"></div></div>')
 page.evaluate('''() => {window.seq=0;crypto.randomUUID=()=>String(++seq);window.mem={};window.__v456Local={getItem:k=>mem[k],setItem:(k,v)=>mem[k]=v};window.OFFLINE_OPS_KEY='queue';window.STORAGE={orcamentosGuardados:'pedidos'};window.COL={orcamentosGuardados:'sm2_orcamentos_guardados'};window.online=true;window.conexaoOnline=()=>online;window.atualizarPendenciasCadastroV457=()=>{};window.statusProducaoPedido=()=>'';window.iniciarCaixinhasMaterialUsado=()=>{};window.limparQuebrasLiteraisProducaoV624=()=>{};window.orcamentosGuardados=[{id:'P',status:'confirmado',cliente:'Cliente teste',itens:[{id:'i',madeira:'Cedrinho',quantidade:1,espessura:8,largura:15,comprimento:3.25,aplainamento:true}]}];window.remote=structuredClone(orcamentosGuardados[0]);window.alert=()=>{};}''')
 page.evaluate('()=>{'+queue+helpers+''';window.observacaoProducaoHtml=observacaoProducaoHtml;window.estadoObservacaoProducao=estadoObservacaoProducao;window.enfileirarOffline=enfileirarOffline;window.offlineOps=offlineOps;window.salvarOfflineOps=salvarOfflineOps;window.sincronizarOfflineOps=async()=>{if(!online)return;for(const op of offlineOps()){window.lastOp=structuredClone(op);remote=op.modo==='merge'?{...remote,...op.obj}:op.obj}salvarOfflineOps([])};}''')
 for name in ['escProd','servicosProducaoTexto','pedidoProducaoDados','renderTelaProducao','fecharTelaProducao']:
  page.evaluate('()=>{'+fn(name)+';window.'+name+'='+name+';}')
 page.evaluate('renderTelaProducao()');field=page.locator('.prod-observacao-input');assert field.count()==1
 page.fill('.prod-observacao-input','Separar peças sem nós.');page.wait_for_function("remote.observacaoProducao==='Separar peças sem nós.'")
 assert page.evaluate('lastOp.modo')=='merge' and page.evaluate('remote.itens[0].aplainamento') is True
 assert page.evaluate('remote.cliente')=='Cliente teste'
 # Closing before the debounce fires flushes the current text, including safe literal markup.
 page.fill('.prod-observacao-input','Cuidar das pontas.\n<img src=x>');page.evaluate('fecharTelaProducao()')
 page.wait_for_function("remote.observacaoProducao.includes('<img src=x>')")
 # Staff device reads the saved server record and gets no editor.
 page.evaluate("() => {mem.sm_dev_usuario_atual_teste_v1='worker';mem.sm_dev_usuarios_empresa_v2=JSON.stringify([{id:'worker',status:'ativo',funcao:'Estoque'}]);orcamentosGuardados=[structuredClone(remote)];document.getElementById('telaProducaoCompartilhada').style.display='block';document.getElementById('telaProducaoCompartilhada').hidden=false;document.getElementById('telaProducaoCompartilhada').style.display='block';renderTelaProducao()}")
 assert page.locator('.prod-observacao-input').count()==0
 assert 'Cuidar das pontas.\n<img src=x>' in page.locator('.prod-observacao-leitura').inner_text()
 assert page.locator('img').count()==0
 before=page.evaluate('JSON.stringify(remote)');page.evaluate("salvarObservacaoProducao({dataset:{obsPedido:'P'},value:'Não autorizado'})")
 assert page.evaluate('JSON.stringify(remote)')==before
 # Offline note must not replace a full order still pending creation.
 page.evaluate("() => {delete mem.sm_dev_usuario_atual_teste_v1;online=false;enfileirarOffline(COL.orcamentosGuardados,'P',structuredClone(remote),'set');renderTelaProducao()}")
 page.fill('.prod-observacao-input','Nota offline');page.evaluate('fecharTelaProducao()')
 assert page.evaluate('offlineOps()[0].modo')=='set'
 assert page.evaluate('offlineOps()[0].obj.itens[0].madeira')=='Cedrinho'
 assert page.evaluate('offlineOps()[0].obj.observacaoProducao')=='Nota offline'
 # Reopen restores the local pending note; reconnect sends it with order data intact.
 page.evaluate("document.getElementById('telaProducaoCompartilhada').hidden=false;document.getElementById('telaProducaoCompartilhada').style.display='block';renderTelaProducao()")
 assert page.locator('.prod-observacao-input').input_value()=='Nota offline'
 page.evaluate('online=true;sincronizarOfflineOps()');assert page.evaluate('remote.observacaoProducao')=='Nota offline'
 # Clearing the optional field persists an empty note.
 page.fill('.prod-observacao-input','');page.evaluate('fecharTelaProducao()');assert page.evaluate('remote.observacaoProducao')==''
 browser.close()
print('PASS: manager autosave, close flush, merge persistence, staff read-only, safe multiline text, offline order creation preserved, re-open/reconnect and clearing')
