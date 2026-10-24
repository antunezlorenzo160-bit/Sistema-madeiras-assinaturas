"""Service flags on actual production queue and directed calculator renderers; no server access."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
def fn(name):
 a=t.index('function '+name+'(');m=re.search(r'^function |^async function ',t[a+10:],re.M);return t[a:a+10+m.start()]
names=['escProd','servicosProducaoTexto','servicosProducaoHtml','pedidoProducaoDados','renderTelaProducao','numeroProd','specsMaterialUsado','baixaCalculadaMaterial','producaoDirecionadaHtml']
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844});page.route('**/*',lambda r:r.abort());page.set_content('<div id="listaProducaoCompartilhada"></div><div id="direcionada"></div>')
 page.evaluate('''() => {window.statusProducaoPedido=()=>'';window.iniciarCaixinhasMaterialUsado=()=>{};window.limparQuebrasLiteraisProducaoV624=()=>{};window.linhaProducaoCalcJaUsada=()=>false;window.num2=String;window.orcamentosGuardados=[{id:'pedido',status:'confirmado',cliente:'Teste',itens:[
 {id:'apl',madeira:'Só aplainado',quantidade:1,largura:15,espessura:8,comprimento:3.25,aplainamento:true,endireitamento:false},
 {id:'ind',madeira:'Só endireitado',quantidade:1,largura:15,espessura:8,comprimento:3.25,endireitamento:true},
 {id:'ambos',madeira:'Dois serviços',quantidade:1,largura:15,espessura:8,comprimento:3.25,aplainamento:true,endireitamento:true},
 {id:'sem',madeira:'Sem serviço',quantidade:1,largura:15,espessura:8,comprimento:3.25,aplainamento:false,endireitamento:false,aplainamentoChamado:true},
 {id:'legado',madeira:'Legado',quantidade:1,largura:15,espessura:8,comprimento:3.25,servicos:'Serviço antigo <img src=x>'}
 ]}];}''')
 for name in names:page.evaluate('()=>{'+fn(name)+';window.'+name+'='+name+';}')
 before=page.evaluate('JSON.stringify(orcamentosGuardados)');page.evaluate('renderTelaProducao()')
 assert page.locator('#listaProducaoCompartilhada .prod-servicos').all_text_contents()==['Aplainar','Endireitar','Endireitar + Aplainar','Serviço antigo <img src=x>']
 page.evaluate("document.getElementById('direcionada').innerHTML=producaoDirecionadaHtml(orcamentosGuardados[0])")
 assert page.locator('#direcionada .prod-servicos').all_text_contents()==['Aplainar','Endireitar','Endireitar + Aplainar','Serviço antigo <img src=x>']
 assert page.locator('img').count()==0
 assert page.evaluate('JSON.stringify(orcamentosGuardados)')==before
 (root/'review').mkdir(exist_ok=True);page.screenshot(path=str(root/'review/producao-servicos.png'),full_page=True)
 browser.close()
print('PASS: aplainado, endireitado, both, disabled flags/remembered calls, legacy safe text, queue and directed production; data unchanged')
