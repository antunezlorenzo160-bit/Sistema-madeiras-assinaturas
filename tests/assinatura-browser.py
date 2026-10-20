"""Local Chromium check; API calls are mocked and no Firebase data is accessed."""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'public/index.html').read_text()
template=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',html,re.S)[1])
def fn(name):
 start=template.index('function '+name+'(')
 end=template.find('\nfunction ',start+1)
 return template[start:end]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
 payloads=[]
 def api(route):
  payloads.append(route.request.post_data_json)
  route.fulfill(status=200,content_type='application/json',body='{"ok":true,"alreadySigned":false}')
 page.route('**/*',lambda route:route.abort())
 page.route('http://local.test/**',lambda route:route.fulfill(content_type='text/html',body=html))
 page.route('**/.netlify/functions/assinatura-entrega',api)
 page.goto('http://local.test/?assinar='+'a'*43)
 page.locator('#assinatura-nome-publico-v683').fill('Recebedor de teste')
 page.locator('#assinatura-codigo-publico-v683').fill('12345678')
 page.locator('#assinatura-enviar-v683').click()
 assert not payloads
 assert 'Desenhe' in page.locator('#assinatura-status-publico-v683').inner_text()
 def draw():
  box=page.locator('canvas').bounding_box()
  page.mouse.move(box['x']+25,box['y']+45);page.mouse.down()
  for x,y in [(50,30),(70,75),(90,25),(130,65),(170,40),(200,65)]:page.mouse.move(box['x']+x,box['y']+y,steps=4)
  page.mouse.up()
 draw();page.locator('#assinatura-limpar').click();page.locator('#assinatura-enviar-v683').click();assert not payloads
 draw();page.screenshot(path=str(root/'review/captura-assinatura.png'),full_page=True)
 page.locator('#assinatura-enviar-v683').click()
 page.wait_for_function("document.getElementById('assinatura-form-v683').hidden")
 assert 'Obrigado' in page.locator('#assinatura-concluida').inner_text()
 assert len(payloads)==1
 payload=payloads[0];assert payload['recipientName']=='Recebedor de teste'
 (root/'tests/fixtures/assinatura-teste.json').write_text(json.dumps(payload))
 # Run the actual history renderer and PDF clone code in an isolated document.
 page.goto('http://local.test/')
 page.evaluate("""() => {
 window.esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 window.aplicarCobrancaOrcamento=x=>x;window.agruparItensMedida=x=>x;window.ordenarGruposPorEspecie=x=>x;
 window.totaisOrcItens=()=>({subtotal:0,servicos:0,desconto:0,total:0});
 window.dataHoraCurta=()=> '20/10/2026 12:00';window.moeda=v=>'R$ '+v;
 window.nomeClientePedido=o=>o.cliente;window.rotuloUrgencia=()=>'';window.urgenciaOrc=()=> 'baixa';
 window.statusProducaoPedido=()=>'';window.reservaOrcamentoV380=()=>'';
 }""")
 # Expose functions without executing the full authenticated application.
 for name in ['assinaturaImagemPedido','htmlPlanilhaOrcamentoGuardado','resolverBloco','cloneLimpoParaExportar']:
  source=fn(name)
  if name=='cloneLimpoParaExportar':source=source[:source.index('\nasync function') ] if '\nasync function' in source else source
  page.evaluate('() => {'+source+'\nwindow.'+name+'='+name+';}')
 order={'id':'teste','status':'entregue','assinaturaStatus':'assinado','assinadoPor':'Recebedor de teste','assinadoEm':1,'cliente':'Pedido de teste','itens':[],'assinaturaImagem':payload['signatureImage']}
 page.evaluate("o=>{document.body.innerHTML=htmlPlanilhaOrcamentoGuardado(o)}",order)
 assert page.locator('.assinatura-recebedor img').count()==1
 assert page.locator('.assinatura-recebedor img').evaluate('(img)=>img.complete && img.naturalWidth===600')
 page.screenshot(path=str(root/'review/historico-assinatura.png'),full_page=True)
 page.evaluate("() => {const c=cloneLimpoParaExportar('orcGuardado_teste');document.body.replaceChildren(c)}")
 assert page.locator('.assinatura-recebedor img').count()==1
 page.pdf(path=str(root/'review/pedido-assinado.pdf'),format='A4',print_background=True)
 # Legacy orders remain renderable without an image.
 del order['assinaturaImagem']
 assert 'assinatura-recebedor' not in page.evaluate('o=>htmlPlanilhaOrcamentoGuardado(o)',order)
 browser.close()
print('PASS: blank, clear, draw, submit, visible success, history, PDF clone, legacy orders')
