"""Local Chromium check; API calls are mocked and no Firebase data is accessed."""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
(root/'review').mkdir(exist_ok=True)
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
 assert page.locator('#assinatura-codigo-publico-v683').count()==0
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
 # Run the real renderer, export function and print styles with mocked order data.
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
 for name in ['assinaturaImagemPedido','htmlPlanilhaOrcamentoGuardado','resolverBloco','cloneLimpoParaExportar','gerarPdfBloco']:
  source=fn(name)
  if name=='cloneLimpoParaExportar':source=source[:source.index('\nasync function') ] if '\nasync function' in source else source
  if name=='gerarPdfBloco':source=source.split('\nwindow.copiarBloco=')[0]
  page.evaluate('() => {'+source+'\nwindow.'+name+'='+name+';}')
 order={'id':'teste','status':'entregue','assinaturaStatus':'assinado','assinadoPor':'Recebedor de teste','assinadoEm':1,'cliente':'Pedido de teste','itens':[],'assinaturaImagem':payload['signatureImage']}
 styles=''.join(re.findall(r'<style\b[^>]*>.*?</style>',template,re.S|re.I))
 page.evaluate('styles=>{document.head.innerHTML=styles}',styles)
 page.evaluate("o=>{document.body.innerHTML=htmlPlanilhaOrcamentoGuardado(o)}",order)
 assert page.locator('.assinatura-recebedor img').count()==1
 assert page.locator('.assinatura-entrega-rodape').count()==1
 assert page.evaluate("Boolean(document.querySelector('.orc-totais').compareDocumentPosition(document.querySelector('.assinatura-entrega-rodape')) & Node.DOCUMENT_POSITION_FOLLOWING)")
 assert 'Assinado por' not in page.locator('#orcGuardado_teste > div').first.inner_text()
 assert page.locator('.assinatura-entrega-rodape').bounding_box()['y']>=page.locator('.orc-totais').bounding_box()['y']+page.locator('.orc-totais').bounding_box()['height']

 assert page.locator('.assinatura-recebedor img').evaluate('(img)=>img.complete && img.naturalWidth===600')
 page.screenshot(path=str(root/'review/historico-assinatura.png'),full_page=True)
 page.evaluate("() => {window.print=()=>{window.printReady=true};gerarPdfBloco('orcGuardado_teste','Pedido de teste')}")
 page.wait_for_function('window.printReady===true')
 assert page.locator('#printAreaCustom .assinatura-recebedor img').count()==1
 assert page.evaluate("Boolean(document.querySelector('#printAreaCustom .orc-totais').compareDocumentPosition(document.querySelector('#printAreaCustom .assinatura-entrega-rodape')) & Node.DOCUMENT_POSITION_FOLLOWING)")

 assert page.locator('#printAreaCustom .assinatura-recebedor img').evaluate('(img)=>img.complete && img.naturalWidth===600')
 page.pdf(path=str(root/'review/pedido-assinado.pdf'),format='A4',print_background=True)
 # Pending invitations remain visible near the delivery status, without a footer.
 pending={**order,'assinaturaStatus':'pendente'}
 pending_html=page.evaluate('o=>htmlPlanilhaOrcamentoGuardado(o)',pending)
 assert 'Aguardando assinatura do cliente' in pending_html
 assert 'assinatura-entrega-rodape' not in pending_html
 # Legacy orders remain renderable without an image.
 del order['assinaturaImagem']
 assert 'assinatura-recebedor' not in page.evaluate('o=>htmlPlanilhaOrcamentoGuardado(o)',order)
 browser.close()
print('PASS: blank, clear, draw, submit, visible success, history, signature below totals on screen/PDF, pending status, real PDF export, legacy orders')
