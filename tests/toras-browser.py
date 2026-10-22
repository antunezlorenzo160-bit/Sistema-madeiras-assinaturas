"""Exercise the actual tora module and clipboard formatter without Firebase."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
copy=t[t.index('function resolverBloco('):t.index('function gerarPdfBloco(')]
module=(root/'public/toras.mjs').read_text().replace('export function','function')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844})
 page.route('**/*',lambda r:r.abort())
 page.set_content('<button id="btnCubagemToras">Toras</button>')
 page.evaluate('() => {'+copy+module+''';window.cache={};window.messages=[];window.alert=x=>messages.push(x);
 Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>window.copied=t}});
 window.start=()=>iniciarCubagemToras({storage:{getItem:k=>cache[k],setItem:(k,v)=>cache[k]=v},copiar:copiarBloco,pdf:(id,title)=>window.pdfRequest={text:textoExportacao(id),title}});start();}''')
 page.click('#btnCubagemToras')
 page.fill('#toraDiametro','40');page.fill('#toraComprimento','3');page.fill('#toraQuantidade','2')
 assert '0,7540 m³' in page.locator('#toraPreview').inner_text()
 page.fill('#toraEspecie','<img src=x onerror=alert(1)>')
 page.click('#formToras button[type=submit]')
 assert page.locator('#torasTotal').inner_text()=='Total: 2 toras • 0,7540 m³'
 assert page.locator('#torasLinhas img').count()==0
 page.fill('#toraDiametro','25');page.fill('#toraComprimento','4');page.fill('#toraQuantidade','1');page.fill('#toraEspecie','Garapeira');page.click('#formToras button[type=submit]')
 assert page.locator('#torasTotal').inner_text()=='Total: 3 toras • 0,9503 m³'
 page.click('[data-copiar]');text=page.evaluate('window.copied')
 assert 'Volume por tora: 0,3770 m³' in text and 'Ponta fina: 40,00 cm' in text
 assert 'Total: 3 toras • 0,9503 m³' in text and 'Remover' not in text
 page.click('[data-pdf]');assert page.evaluate('window.pdfRequest.text')==text
 # Restore the list from company-scoped storage after reopening the component.
 page.evaluate("document.getElementById('cubagemToras').remove();start()")
 page.click('#btnCubagemToras')
 assert page.locator('#torasTotal').inner_text()=='Total: 3 toras • 0,9503 m³'
 page.locator('#torasLinhas button').first.click()
 assert page.locator('#torasTotal').inner_text()=='Total: 1 tora • 0,1963 m³'
 # Invalid values cannot add a record through form submission.
 page.fill('#toraDiametro','-1');page.fill('#toraComprimento','3');page.fill('#toraQuantidade','1')
 page.evaluate("document.getElementById('formToras').dispatchEvent(new Event('submit',{cancelable:true}))")
 assert page.locator('#torasLinhas button').count()==1
 page.fill('#toraDiametro','30')
 (root/'review').mkdir(exist_ok=True)
 page.screenshot(path=str(root/'review/toras-mobile.png'),full_page=True)
 page.on('dialog',lambda d:d.accept());page.click('[data-limpar]')
 assert page.locator('#torasTotal').inner_text()=='Total: 0 toras • 0,0000 m³'
 browser.close()
print('PASS: mobile inputs, cylinder preview, groups, totals, safe labels, copy, PDF summary, persistence, removal, invalid input and clearing')
