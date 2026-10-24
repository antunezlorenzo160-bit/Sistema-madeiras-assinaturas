"""Real block builders for original, commercial, and romaneio; no Firebase access."""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
def fn(name,indent='  '):
 m=re.search(r'^'+indent+r'(?:async )?function '+name+r'\(',t,re.M);end=re.search(r'^'+indent+r'(?:async )?function ',t[m.end():],re.M)
 source=t[m.start():m.end()+end.start()]
 if name=='gerarPdfBloco':source=source.split('window.copiarBloco=')[0]
 return source
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844});page.route('**/*',lambda r:r.abort())
 page.set_content('<main id="test"></main>')
 page.evaluate('''() => {
 window.esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 window.numCm=n=>Number(n).toLocaleString('pt-BR');window.numCompOrc=n=>Number(n).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2});window.numM1=window.numCompOrc;
 window.moeda=n=>'R$ '+Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
 window.resumoGrupoV392=()=>({});window.obterAjusteV403=()=>({});window.calcularFinanceiroV403=base=>({valido:true,total:base});window.resumoFinanceiroHtmlV403=x=>'<div class="total-financeiro">Total geral: '+moeda(x.total)+'</div>';
 window.documentoEmpresaHtmlV421=()=>'<h2 class="v421-empresa-documento">Emitente de teste</h2>';window.documentoClienteHtmlV407=()=>'<p>Cliente de teste</p>';window.documentoTransporteHtmlV414=()=>'';window.htmlResumoEspeciesV591=()=>'';window.anexarFiscalV560=x=>x;
 }''')
 names=['nomeLinhaV392','medidasLinhaV392','compLinhaV392','origemCargaV392','valorOriginalLinhaV399','precoUnitarioOriginalLinhaV399','precoVisivelCargaV402','valorTotalOriginalCargaV402','valorProdutoAusenteV402','unidadePrecoLinhaV399','chaveLinhaV392','chaveProdutoCopiaV400','nomeProdutoCopiaV400','percentualSalvoCopiaV400','gruposProdutosCopiaV400','itensGrupoCargaV400','idCopiaPainelV400','agruparLinhasCopiaV400','dadosCopiaComercialV400','arredondarV403','numeroFisicoV418','metricaLinhaRomaneioV418','somarMetricasRomaneioV418','numeroRomaneioV418','resumoRomaneioV418','celulaMetricaV418','resumoTotaisFisicosHtmlV418','gruposMedidasCargaV599','linhaTotalMedidaCargaV599','blocosEspeciesPdfV406','planilhaBlocosCargaV599','documentoCargaConferenciaV401','documentoCopiaPadronizadaV405','htmlCopiaComercialV400','gruposRomaneioV418','blocoRomaneioV418']
 for name in names:page.evaluate('() => {'+fn(name)+';window.'+name+'='+name+';}')
 for name in ['resolverBloco','cloneLimpoParaExportar','gerarPdfBloco']:
  page.evaluate('() => {'+fn(name,'')+';window.'+name+'='+name+';}')
 raw=[(2.5,12,4,.036),(4,45,2,.108),(2.5,36,3,.081),(4,36,3,.1296),(2.5,45,4,.135),(4,30,1,.036),(2.5,23,2,.0345),(4,12,2,.0288),(2.5,20,1,.015),(4,25,4,.12),(2.5,25,3,.05625),(4,24,1,.0288),(2.5,56,1,.042),(4,21,1,.0252)]
 data=[dict(id=str(i),grupoCargaId='G',madeiraId='madeira-'+str(i%3),madeira='Garapeira',tipoMedida='m3',espessura=e,largura=l,comprimento=3,quantidade=q,volume=v,valor=v*2000,preco=2000,copiaComercialPercentualV400=80,estoqueOrigem='estoque1'if i%2 else'estoque2',pesoReferenciaV420={'kgM3':500})for i,(e,l,q,v)in enumerate(raw)]
 page.evaluate('data=>window.carregamentos=data',data)
 # Original on-screen planilha retains each row's source stock, physical units and price.
 page.evaluate("() => {document.getElementById('test').innerHTML=planilhaBlocosCargaV599(agruparLinhasCopiaV400(carregamentos),false,true)}")
 assert page.locator('.v404-carga-especie').count()==2
 assert page.locator('.v404-carga-linha').count()==14
 assert page.locator('thead tr').nth(1).locator('th').count()==10
 assert 'origem' in page.locator('thead').first.inner_text()
 assert 'Estoque 1' in page.locator('#test').inner_text() and 'Estoque 2' in page.locator('#test').inner_text()
 totals=page.locator('.v599-total-medida').all_text_contents()
 assert totals==['Volume total do bloco: 0,3998 m³','Volume total do bloco: 0,4764 m³'],totals
 original=sum(x['valor']for x in data)
 page.evaluate("() => {document.getElementById('test').replaceChildren(documentoCargaConferenciaV401('G'))}")
 assert page.locator('.v404-carga-especie').count()==2
 assert page.locator('.v599-total-medida').all_text_contents()==totals
 assert 'R$ 1.752,30' in page.locator('.total-financeiro').inner_text()
 # Render the actual PDF exporter, including the existing print CSS.
 styles=''.join(re.findall(r'<style\b[^>]*>.*?</style>',t,re.S|re.I));page.evaluate('css=>document.head.innerHTML=css',styles)
 page.evaluate("() => {window.print=()=>window.printReady=true;gerarPdfBloco(documentoCargaConferenciaV401('G'),'Carregamento original')}")
 page.wait_for_function('window.printReady===true')
 assert page.locator('#printAreaCustom .v404-carga-especie').count()==2
 assert page.locator('#printAreaCustom .v599-total-medida').all_text_contents()==totals
 (root/'review').mkdir(exist_ok=True);page.pdf(path=str(root/'review/carregamento-blocos.pdf'),format='A4',print_background=True)
 # Commercial on-screen/PDF retains its independent 80% values and the same physical totals.
 page.evaluate("() => {document.getElementById('test').innerHTML=htmlCopiaComercialV400('G',0,carregamentos,'Teste',gruposProdutosCopiaV400(carregamentos))}")
 assert page.locator('#test .v404-carga-especie').count()==2
 assert page.locator('#test .v599-total-medida').all_text_contents()==totals
 expected=page.evaluate("dadosCopiaComercialV400('G',carregamentos,gruposProdutosCopiaV400(carregamentos)).valorComercial")
 page.evaluate("() => document.getElementById('test').replaceChildren(documentoCopiaPadronizadaV405('G'))")
 assert page.locator('#test .v404-carga-especie').count()==2
 assert page.locator('#test .v599-total-medida').all_text_contents()==totals
 assert page.evaluate("document.querySelector('#test .total-financeiro').textContent===('Total geral: '+moeda(dadosCopiaComercialV400('G',carregamentos,gruposProdutosCopiaV400(carregamentos)).valorComercial))")
 assert expected<original
 # Romaneio keeps no monetary columns and uses the same dimensions/physical totals.
 page.evaluate("() => document.getElementById('test').innerHTML=[...gruposRomaneioV418(carregamentos).values()].map(blocoRomaneioV418).join('')")
 assert page.locator('#test .v404-carga-especie').count()==2
 assert page.locator('#test .v599-total-medida').all_text_contents()==totals
 assert page.locator('#test .v404-carga-linha').count()==14
 assert 'R$' not in page.locator('#test').inner_text()
 assert page.evaluate('carregamentos')==data
 # A different length is a new block, and area/linear/granel use the correct units.
 page.evaluate("() => {const extra={...carregamentos[0],id:'extra',comprimento:4};window.mixed=[extra,{...extra,id:'area',tipoMedida:'m2',volume:2},{...extra,id:'linear',tipoMedida:'linear',volume:4},{...extra,id:'granel',tipoMedida:'granel',volume:1}];document.getElementById('test').innerHTML=planilhaBlocosCargaV599([...carregamentos,...mixed])}")
 assert page.locator('#test .v404-carga-especie').count()==6
 texts=page.locator('#test .v599-total-medida').all_text_contents()
 assert any('Área total do bloco: 2,00 m²' in x for x in texts)
 assert any('Metragem total do bloco: 4,00 m' in x for x in texts)
 assert page.evaluate('planilhaBlocosCargaV599([])')=='<div class="table-wrap"></div>'
 browser.close()
print('PASS: original/commercial on-screen and PDFs, romaneio, interleaved dimensions, volume totals, origins, prices, mixed units, unchanged source records')
