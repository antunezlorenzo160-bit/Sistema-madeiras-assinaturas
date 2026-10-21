"""Checks the real copy formatter in Chromium; no network or Firebase access."""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
s=(root/'public/index.html').read_text()
t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
source=t[t.index('function resolverBloco('):t.index('function gerarPdfBloco(')]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844})
 page.route('**/*',lambda r:r.abort())
 page.set_content('''<style>.hidden{display:none}.no-print{display:block}</style>
 <article id="pedido"><div><div><h3>Cliente de teste</h3><div>20/10/2026, 22:08</div><div>Data de entrega: <strong>20/10/2026</strong></div><span>Entregue • 20/10/2026, 22:10</span><div>Assinado por RECEBEDOR TESTE • 20/10/2026, 22:16</div><figure class="assinatura-recebedor"><img src="data:," alt="Assinatura"><figcaption>Assinatura do recebedor</figcaption></figure></div><button>Gerar PDF</button></div>
 <div><table><tbody><tr><td colspan="5">Angelin — Ang001</td></tr>
 <tr><td>Qu.</td><td>Medi./CMDP.</td><td>Vol.</td><td>Ser.</td><td>Val.</td><td class="hidden">Ação</td></tr>
 <tr><td>23pç</td><td>2,5×25×3,0m</td><td>0,4313 m³</td><td></td><td>R$ 1.509,38</td><td class="hidden">REMOVER</td></tr>
 <tr><td>1pç</td><td>2,5×25×4,0m</td><td>0,0250 m³</td><td>IND 10%</td><td>R$ 100,00</td></tr>
 <tr><td colspan="4">Subtotal</td><td>R$ 1.609,38</td></tr>
 <tr><td colspan="5">Produto com nome muito longo que deve ser preservado integralmente</td></tr>
 <tr><td>Qu.</td><td>Medidas</td><td>Volume</td><td>Serv.</td><td>Valor</td></tr>
 <tr><td>2pç</td><td>Descrição longa que não pode perder letras</td><td>1,00 m²</td><td></td><td>R$ 20,00</td></tr></tbody></table></div>
 <div class="orc-totais"><div><span>Volume total</span><strong>0,4563 m³</strong></div><div><span>Subtotal</span><strong>R$ 1.629,38</strong></div><div><span>Acréscimo (serviços)</span><strong>R$ 0,00</strong></div><div><span>Total</span><strong>R$ 1.629,38</strong></div></div><div class="no-print">AÇÕES INTERNAS</div></article>''')
 page.evaluate('() => {'+source+';window.textoExportacao=textoExportacao;window.copiarBloco=copiarBloco;}')
 before=page.locator('#pedido').inner_html()
 text=page.evaluate("textoExportacao('pedido')")
 assert 'Cliente de teste\n20/10/2026' in text,text
 assert 'Data de entrega: 20/10/2026' in text
 assert 'Total: R$ 1.629,38' in text
 assert 'Volume total: 0,4563 m³' in text
 assert 'Assinado por RECEBEDOR TESTE' in text and 'Assinatura do recebedor' not in text
 assert 'REMOVER' not in text and 'AÇÕES INTERNAS' not in text and 'Gerar PDF' not in text
 assert '1.509,38' in text and '0,4313' in text and 'IND 10%' in text
 # Compact columns must fit the mobile budget and preserve price/unit meaning.
 blocks=re.findall(r'```\n(.*?)\n```',text,re.S)
 assert len(blocks)==2,text
 for block in blocks:
  assert all(len(line)<=34 for line in block.splitlines()),block
 assert 'm³' in blocks[0].splitlines()[0] and 'R$' in blocks[0].splitlines()[0]
 assert '1.509,38' in blocks[0] and '0,4313' in blocks[0]
 assert 'Serv. linha 2: IND 10%' in text
 assert 'Ser.' not in blocks[0]
 assert page.locator('#pedido').inner_html()==before
 assert page.evaluate("textoExportacao('missing')")==''
 # Check the real clipboard handler and its error path.
 page.evaluate("() => {window.copied=null;window.messages=[];window.alert=m=>messages.push(m);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.copied=t}}})}")
 page.evaluate("copiarBloco('pedido')")
 assert page.evaluate('window.copied')==text
 page.evaluate("() => {navigator.clipboard.writeText=async()=>{throw Error('denied')};document.execCommand=()=>false;}")
 page.evaluate("copiarBloco('pedido')")
 assert 'não permitiu' in page.evaluate('window.messages.at(-1)')
 assert page.locator('textarea').count()==0
 (root/'review').mkdir(exist_ok=True)
 (root/'review/copia-whatsapp.txt').write_text(text)
 page.set_content('<pre style="font:14px monospace;white-space:pre;background:#e7ffdb;padding:16px;border-radius:12px;width:max-content"></pre>')
 page.locator('pre').evaluate('(el,text)=>el.textContent=text',text)
 page.set_viewport_size({'width':900,'height':1000})
 page.screenshot(path=str(root/'review/copia-tabela.png'),full_page=True)
 browser.close()
print('PASS: header breaks, aligned columns, empty cells, groups, totals, signature metadata, hidden controls, clipboard and failure path')
