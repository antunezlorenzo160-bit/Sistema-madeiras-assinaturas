"""Exercise saved assemblies with the real flow functions and local mock storage."""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
def fn(name):
 m=re.search(r'^  (?:async )?function '+name+r'\(',t,re.M)
 end=re.search(r'^  (?:async )?function ',t[m.end():],re.M)
 return t[m.start():m.end()+end.start()]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/*',lambda r:r.abort())
 page.set_content('''<header><div class="tabs"><button data-tab="calculadora">Calculadora</button></div></header><input id="nomeOrigemDestino"><input name="destinoLancamento" type="radio" value="carga"><input name="estoqueCarga" type="radio" value="estoque1"><button id="btnGuardarResumoCalc">Fechar</button><button id="btnNovoResumoCalc">Novo</button><button id="btnLimparLancamentos">Apagar</button>''')
 page.evaluate('''() => {
 let counter=0;Object.defineProperty(crypto,'randomUUID',{value:()=> 'new-'+(++counter),configurable:true});
 window.carregamentos=[];window.lancamentos=[];window.sessaoCargaAtual='A';window.baseTotalTopo={};window.contadorPacotes=0;window.sessaoPacotes='packages';window.modoMedida='m3';
 window.STORAGE={lancamentos:'lancamentos'};window.COL={cargas:'sm2_carregamentos'};window.ops=[];window.alertas=[];window.estoque={pecas:100};window.destination='carga';
 window.__v456Local={data:{},setItem(k,v){this.data[k]=v},getItem(k){return this.data[k]??null}};
 window.alert=m=>alertas.push(m);window.enfileirarOffline=(nome,id,obj,modo)=>ops.push({nome,id,obj,modo});window.sincronizarOfflineOps=async()=>{};
 window.save=()=>{__v456Local.setItem('carregamentos_lancamentos_v1',JSON.stringify(carregamentos));__v456Local.setItem('lancamentos',JSON.stringify(lancamentos))};
 window.salvarContador=()=>{};window.renderLancamentosV387=()=>{};window.renderLancamentos=()=>{};window.pcAtualizarPlanilhaDirecionada=()=>{};
 window.garantirPainelCargaV388=()=>null;window.destinoSelecionado=()=>destination;window.aplicarModoMedida=()=>{};
 window.adicionarReferenciaPesoV420=x=>x;
 window.statusEfetivoCargaV589=x=>x.cargaBaixadaEm||x.cargaStatus==='concluido'||x.cargaConferidaPor?'concluido':x.cargaFechadaEm||x.cargaStatus==='aguardando_conferencia'||x.cargaFechadaPor?'aguardando_conferencia':String(x.cargaStatus||'');
 }''')
 for name in ['itensGrupoCargaV388','itensCargaAtualV388','salvarPreCargaSemBaixaV388','guardarCarregamentoMontagemV594','fecharCarregamentoV388','atualizarFluxoCargaV388','itensMontagemGrupoV397','continuarCarregamentoV397']:
  source=fn(name)
  # The last function before unrelated event registration includes trailing statements.
  if name=='atualizarFluxoCargaV388': source=source.split('  // Permite corrigir')[0]
  page.evaluate('() => {'+source+';window.'+name+'='+name+';}')
 page.evaluate("() => {window.nomeUsuarioCargaV388=()=> 'Funcionário teste';}")
 a=t.index("  document.addEventListener('click',async e=>",t.index('function guardarCarregamentoMontagemV594'))
 b=t.index('  },true);',a)+len('  },true);')
 page.evaluate('() => {'+t[a:b]+'}')
 def add(id,name,tipo="m3"):
  page.evaluate("async ([id,name,tipo])=>{document.getElementById('nomeOrigemDestino').value=name;await salvarPreCargaSemBaixaV388({id,compradorDestino:name,destino:'carga',quantidade:1,volume:0.1,tipoMedida:tipo,...(tipo==='m2'?{contadoComoPacote:true,sessaoPacote:sessaoPacotes}:{})},'estoque1')}",[id,name,tipo])
 add('A1','Destino A')
 assert page.locator('#btnGuardarCargaMontagemV594').is_visible()
 page.locator('#btnGuardarCargaMontagemV594').click()
 assert page.evaluate('carregamentos[0].cargaStatus')=='montagem'
 assert page.evaluate('lancamentos.length')==0
 assert page.locator('#nomeOrigemDestino').input_value()==''
 assert page.locator('#btnGuardarCargaMontagemV594').is_disabled()
 # A single stored assembly must not auto-fill the empty desktop preview.
 start=t.index('    // A lista da Calculadora e a coleção de Carregamentos')
 end=t.index('    const cargaAtual=',start)
 preview=t[start:end]
 assert page.evaluate('() => {'+preview+';return grupoExibidoV593;}')==''

 second=page.evaluate('sessaoCargaAtual');assert second!='A'
 add('B1','Destino B','m2')
 page.locator('#btnNovoResumoCalc').click()
 assert page.evaluate('lancamentos.length')==0
 assert page.evaluate("carregamentos.every(x=>x.cargaStatus==='montagem'&&!x.cargaBaixadaEm&&!x.cargaFechadaEm)")
 # Rehydrate from the persisted local record to simulate closing and reopening.
 page.evaluate("() => {carregamentos=JSON.parse(__v456Local.getItem('carregamentos_lancamentos_v1'));lancamentos=JSON.parse(__v456Local.getItem('lancamentos'));sessaoCargaAtual=__v456Local.getItem('sessao_carga_atual_v1');continuarCarregamentoV397('A')}")
 assert page.evaluate('lancamentos.map(x=>x.id)')==['A1']
 assert page.locator('#nomeOrigemDestino').input_value()=='Destino A'
 add('A2','Destino A')
 # Switching directly saves A before selecting B; no close/stock write is involved.
 page.evaluate('gid=>continuarCarregamentoV397(gid)',second)
 assert page.evaluate('lancamentos.map(x=>x.id)')==['B1']
 assert page.evaluate('contadorPacotes')==1
 assert page.evaluate('modoMedida')=='m2'
 assert page.evaluate("carregamentos.filter(x=>x.grupoCargaId==='A').length")==2
 assert page.evaluate("carregamentos.every(x=>x.cargaStatus==='montagem')")
 assert page.evaluate('estoque.pecas')==100
 assert page.evaluate("ops.every(x=>x.nome==='sm2_carregamentos'&&x.modo==='set')")
 assert page.evaluate('new Set(carregamentos.map(x=>x.id)).size===carregamentos.length')
 page.locator('#btnGuardarResumoCalc').click()
 assert page.evaluate("carregamentos.find(x=>x.id==='B1').cargaStatus")=='aguardando_conferencia'
 page.evaluate('gid=>continuarCarregamentoV397(gid)',second)
 assert 'não está mais em montagem' in page.evaluate('alertas.at(-1)')
 page.evaluate("continuarCarregamentoV397('A')")
 assert page.evaluate('lancamentos.map(x=>x.id)')==['A1','A2']
 page.evaluate("() => {destination='estoque1';atualizarFluxoCargaV388()}")
 assert page.locator('#btnGuardarCargaMontagemV594').is_hidden()
 assert not errors,errors
 browser.close()
print('PASS: guardar, nova montagem, persistência local, retomar, trocar sem fechar, sem baixa, sem duplicação, fechamento original e botão só em Carga')
