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
 # Reproduce the stock sheet sent through WhatsApp: compact columns and footers.
 page.evaluate("""() => {
 const stock=document.createElement('article');stock.id='estoque';stock.className='planilha-m3';
 const bloco=(comp,rows,qtd,vol)=>`<div class="comprimento-bloco"><h5 class="comprimento-titulo">${comp} m</h5><table><thead><tr><th>pç</th><th>espessura</th><th>largura</th><th>comprimento</th><th>volume</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[0]}pç${r[3]||''}</td><td>2,5 cm</td><td>${r[1]} cm</td><td>× ${comp} m</td><td>${r[2]} m³${r[4]||''}</td></tr>`).join('')}</tbody><tfoot><tr><td><strong>${qtd}pç</strong></td><td>2,5 cm</td><td>—</td><td>Total ${comp} m</td><td>${vol} m³</td></tr></tfoot></table></div>`;
 stock.innerHTML='<h3>Angelin</h3><div>Estoque 1</div><h4>Angelin 2,5 cm</h4><div class="stat"><small>Peças nesta espessura</small><strong>46</strong><span><span>Compradas: 2 pç</span><br><span>Reservadas: 1 pç</span><br><span>Restantes: 43 pç</span></span></div><div class="stat"><small>Volume total</small><strong>0,4800 m³</strong><span>Volume livre: 0,4500 m³</span></div>'+bloco('3,0',[[8,15,'0,0900','<span>RES 1 pç</span>','<span>LIVRE 0,0788 m³</span>'],[35,12,'0,3150']],43,'0,4050')+bloco('4,0',[[3,25,'0,0750']],3,'0,0750')+'<div class="stat"><small>Volume total da planilha</small><strong>0,4800 m³</strong><span>Volume livre: 0,4500 m³</span></div>';
 document.body.appendChild(stock);
 }""")
 stock_before=page.locator('#estoque').inner_html()
 stock_text=page.evaluate("textoExportacao('estoque')")
 stock_blocks=re.findall(r'```\n(.*?)\n```',stock_text,re.S)
 assert len(stock_blocks)==2,stock_text
 assert 'Espessura: 2,5 cm • Comprimento: 3,0 m' in stock_text
 assert 'Espessura: 2,5 cm • Comprimento: 4,0 m' in stock_text
 assert 'Subtotal: 43 pç • 0,4050 m³' in stock_text
 assert 'Subtotal: 3 pç • 0,0750 m³' in stock_text
 assert 'Volume total: 0,4800 m³\nVolume livre: 0,4500 m³' in stock_text
 assert 'Peças nesta espessura: 46\nCompradas: 2 pç\nReservadas: 1 pç\nRestantes: 43 pç' in stock_text
 assert 'Largura 15 cm: RES 1 pç; LIVRE 0,0788 m³' in stock_text
 for block in stock_blocks:
  assert len(block.splitlines()) in (2,3),block
  assert 'Larg.cm' in block and 'm³' in block
  assert all(len(line)<=26 for line in block.splitlines()),block
 assert page.locator('#estoque').inner_html()==stock_before
 (root/'review').mkdir(exist_ok=True)
 (root/'review/copia-estoque-whatsapp.txt').write_text(stock_text)
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
