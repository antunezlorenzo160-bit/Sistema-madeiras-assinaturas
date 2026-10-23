"""Price registration and launch snapshots using the real module, mocked company persistence."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
copy=t[t.index('function resolverBloco('):t.index('function gerarPdfBloco(')]
module=(root/'public/toras.mjs').read_text().replace('export function','function')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844});page.route('**/*',lambda r:r.abort())
 page.set_content('<button id="btnCubagemToras">Toras</button>')
 page.evaluate('() => {'+copy+module+''';window.cache={};window.server=null;window.failSave=false;window.alert=()=>{};
 window.start=()=>iniciarCubagemToras({storage:{getItem:k=>cache[k],setItem:(k,v)=>cache[k]=v},copiar:x=>window.copied=textoExportacao(x),pdf:id=>window.pdfText=textoExportacao(id),observarPrecos:(receber,falhar)=>{window.receber=receber;window.falhar=falhar;return ()=>{}},salvarPrecos:async config=>{if(failSave)throw Error('network');window.server=structuredClone(config)}});start();}''')
 page.click('#btnCubagemToras');page.locator('#cadastroPrecosToras summary').click()
 assert page.locator('#salvarPrecoToras').is_disabled()
 page.evaluate('receber(null)')
 page.fill('#toraPrecoBase','100');page.click('#salvarPrecoToras')
 assert page.evaluate('server.base')==100
 page.fill('#toraPrecoEspecie','Cedrinho');page.fill('#toraPrecoEspecial','150');page.click('#salvarPrecoToras')
 assert page.evaluate('server.especies')==[{'especie':'Cedrinho','preco':150}]
 page.locator('#cadastroPrecosToras summary').click()
 def launch(species,d,c,q=1):
  page.fill('#toraEspecie',species);page.fill('#toraDiametro',str(d));page.fill('#toraComprimento',str(c));page.fill('#toraQuantidade',str(q));page.click('#formToras button[type=submit]')
 page.check('#toraCobrar');launch('Pinus',40,3,2)
 launch('  CEDRINHO ',25,4)
 assert '104,85' in page.locator('#torasTotal').inner_text()
 rows=page.locator('#torasLinhas tbody tr');assert rows.count()==2
 assert rows.nth(0).locator('td').all_text_contents()[6:8]==['100,00','75,40']
 assert rows.nth(1).locator('td').all_text_contents()[6:8]==['150,00','29,45']
 # Updating company prices does not reprice existing launches.
 page.evaluate("receber({base:200,especies:[{especie:'Cedrinho',preco:300}]})")
 assert '104,85' in page.locator('#torasTotal').inner_text()
 launch('Pinus',25,4)
 assert rows.nth(2).locator('td').all_text_contents()[6:8]==['200,00','39,27']
 page.uncheck('#toraCobrar');launch('Toras próprias',25,4)
 assert rows.nth(3).locator('td').all_text_contents()[6:8]==['—','—']
 assert '144,12' in page.locator('#torasTotal').inner_text()
 page.click('[data-copiar]');assert '144,12' in page.evaluate('copied') and '75,40' in page.evaluate('copied')
 page.click('[data-pdf]');assert '144,12' in page.evaluate('pdfText')
 page.evaluate("document.getElementById('cubagemToras').remove();start();receber(server)")
 page.click('#btnCubagemToras');assert '144,12' in page.locator('#torasTotal').inner_text()
 # Save failures do not confirm a new base or discard the earlier one.
 page.locator('#cadastroPrecosToras summary').click();page.fill('#toraPrecoBase','999');page.evaluate('window.failSave=true');page.click('#salvarPrecoToras')
 assert 'Não foi possível confirmar' in page.locator('#toraPrecoStatus').inner_text()
 assert page.evaluate('server.base')==100
 # An empty or failed company read must not allow priced launches from stale cache.
 page.evaluate('falhar()');assert page.locator('#salvarPrecoToras').is_disabled()
 page.locator('#cadastroPrecosToras summary').click();page.check('#toraCobrar');launch('Pinus',30,3)
 assert page.locator('#torasLinhas tbody tr').count()==4
 assert 'Aguarde' in page.locator('#toraPreview').inner_text()
 (root/'review').mkdir(exist_ok=True);page.screenshot(path=str(root/'review/toras-precos-mobile.png'),full_page=True)
 browser.close()
print('PASS: company price readiness, base, species override, historical rates, money totals, own logs, copy/PDF, persistence and save failure')
