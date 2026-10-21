"""Hidden stock panels must stay lazy and refresh when opened; saves stay durable."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
a=t.index('const renderizacoesPendentesV595=');b=t.index('function atualizarTelasAposLancamento(',a);lazy=t[a:b]
names=['chaveAgrupamentoItem','agruparItensMedida','classeSeparacaoGrupo','formatoMedidaItem']
helpers='\n'.join(next(l for l in t.splitlines() if l.startswith('function '+name+'(')) for name in names)
a=t.index('function renderEstoqueLancamentos(){');b=t.index('\nfunction ',a+1);renderer=t[a:b]
a=t.index('function save(');b=t.index('// Resumo da Calculadora:',a);save=t[a:b]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/*',lambda r:r.abort())
 page.set_content('<main><section class="tab" id="estoque" style="display:none"><div id="estoquePrincipalPainel">'+''.join('<table><tbody id="tbEstoque'+str(i)+'Lanc"></tbody></table>'+''.join('<span id="est'+str(i)+n+'"></span>'for n in ['Qtd','M3','M2','Valor'])for i in [1,2])+'</div></section></main>')
 page.evaluate('''() => {window.$=id=>document.getElementById(id);window.esc=String;window.num2=x=>x.toFixed(2);window.num4=x=>x.toFixed(4);window.numM1=x=>x.toFixed(1);window.numCm=String;window.moeda=x=>'R$ '+x.toFixed(2);window.estoque1Lancamentos=Array.from({length:1500},(_,i)=>({id:'a'+i,madeiraId:'m',madeira:'Espécie',largura:i+1,espessura:2.5,comprimento:3,quantidade:1,volume:.1,valor:100,tipoMedida:'m3'}));window.estoque2Lancamentos=estoque1Lancamentos.map(x=>({...x,id:'b'+x.id}));}''')
 page.evaluate('() => {'+helpers+'\n'+lazy+'\n'+renderer+';window.renderStock=renderEstoqueLancamentos;window.pendingCount=()=>renderizacoesPendentesV595.size;}')
 timing=page.evaluate('''() => {const a=performance.now();for(let i=0;i<4;i++)renderStock();return performance.now()-a}''')
 assert page.locator('tr').count()==0
 assert page.evaluate('pendingCount()')==1
 # Latest data, not the dataset from the first render request, is shown on activation.
 page.evaluate("() => {estoque1Lancamentos.push({...estoque1Lancamentos[0],id:'latest',largura:9999,quantidade:7});document.getElementById('estoque').style.display='block'}")
 page.wait_for_function('document.getElementById("est1Qtd").textContent==="1507"')
 assert page.evaluate('pendingCount()')==0
 assert page.locator('#tbEstoque1Lanc tr').count()==1503
 # Repeated changes while hidden collapse to one refresh; reopening shows all items.
 page.evaluate("() => {document.getElementById('estoque').style.display='none';estoque1Lancamentos.push({...estoque1Lancamentos[0],id:'next',quantidade:3});renderStock();renderStock();}")
 assert page.locator('#est1Qtd').inner_text()=='1507'
 page.evaluate("document.getElementById('estoque').style.display='block'")
 page.wait_for_function('document.getElementById("est1Qtd").textContent==="1510"')
 page.evaluate('''() => {
 window.STORAGE={madeiras:'madeiras',lancamentos:'lancamentos',movimentos:'movimentos',orcamento:'orcamento'};
 window.lancamentos=[{id:'L'}];window.carregamentos=[{id:'L',cargaStatus:'montagem'}];
 const expensive={toJSON(){throw Error('Unchanged collections must not be serialized for a Carga launch')}};
 window.madeiras=expensive;window.movimentos=expensive;window.orcamento=expensive;
 window.estoque1Lancamentos=expensive;window.estoque2Lancamentos=expensive;
 window.writes=[];window.__v456Local={setItem:(key,value)=>writes.push({key,value})};window.broadcasts=0;window.__smSyncSummaryTabsV606=()=>broadcasts++;
 }''')
 page.evaluate('() => {'+save+';window.saveData=save;}')
 page.evaluate("saveData([STORAGE.lancamentos,'carregamentos_lancamentos_v1'])")
 writes=page.evaluate('writes')
 assert [w['key']for w in writes]==['lancamentos','carregamentos_lancamentos_v1']
 assert json.loads(writes[1]['value'])[0]['cargaStatus']=='montagem'
 assert page.evaluate('broadcasts')==1
 # Other paths keep the original full-save default.
 page.evaluate('''() => {madeiras=[];movimentos=[];orcamento=[];estoque1Lancamentos=[];estoque2Lancamentos=[];writes=[];saveData()}''')
 assert len(page.evaluate('writes'))==7
 assert not errors,errors
 browser.close()
print('PASS: hidden table stays empty; navigation refreshes latest totals; saves serialize only changed Carga data; default full save preserved. 4 hidden refresh requests: %.2f ms'%timing)
