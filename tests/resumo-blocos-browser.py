"""Check the actual summary renderer and PDF export with changes of dimensions."""
from pathlib import Path
import re,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
def fn(name):
 a=t.index('function '+name+'(');m=re.search(r'^function |^async function ',t[a+10:],re.M)
 return t[a:a+10+m.start()]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844});page.route('**/*',lambda r:r.abort())
 page.set_content('<main><section id="resumoCalculadoraExport"><div class="stats">'+''.join('<span id="'+name+'"></span>'for name in ['statSumValor','labelSumQtd','sumQtd','sumVolume','sumVolumeTopo','sumValor','sumTipos'])+'</div><div class="table-wrap"><table><tbody id="tbLancamentos"></tbody></table></div></section></main>')
 page.evaluate('''() => {
 window.$=id=>document.getElementById(id);window.esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 window.num4=n=>Number(n).toLocaleString('pt-BR',{minimumFractionDigits:4,maximumFractionDigits:4});window.num2=n=>Number(n).toFixed(2);window.numCm=n=>Number(n).toLocaleString('pt-BR');window.numM1=n=>Number(n).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});window.numCompOrc=n=>Number(n).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2});window.moeda=n=>'R$ '+Number(n).toFixed(2);
 window.modoMedida='m3';window.baseTotalTopo={};window.orcamento=[];window.resumoOrcOculto=false;window.destinoSelecionado=()=> 'carga';window.chaveBaseTotalTopo=()=> 'carga';window.itemPertenceModoCalculadoraV387=()=>true;window.atualizarIndicadorRegrasV376=()=>{};window.nomeGranelV385=x=>x.madeira;window.compOrcamento=x=>numCompOrc(x.comprimento)+' m';
 }''')
 for name in ['chaveAgrupamentoItem','agruparItensResumoCalculadora','fonteResumoAtual','classeSeparacaoGrupo','renderLancamentos','resolverBloco','cloneLimpoParaExportar','gerarPdfBloco']:
  source=fn(name)
  if name=='renderLancamentos':source=source.split('// V377')[0]
  if name=='gerarPdfBloco':source=source.split('window.copiarBloco=')[0]
  page.evaluate('() => {'+source+';window.'+name+'='+name+';}')
 def item(id,especie,e,c,l,q,v,tipo='m3'):
  return {'id':id,'madeiraId':especie,'madeira':especie,'tipoMedida':tipo,'espessura':e,'comprimento':c,'largura':l,'quantidade':q,'volume':v,'valor':v*100,'preco':100}
 data=[item('a','Garapeira',4,6,15,1,.036),item('b','Garapeira',4,6,10,2,.048),item('c','Garapeira',4,4.5,49,1,.0882),item('d','Garapeira',5,4.5,10,1,.0225),item('e','Garapeira',5,4.5,20,1,.045),item('f','Angelin',5,4.5,20,1,.045)]
 page.evaluate('data=>{window.lancamentos=data;renderLancamentos()}',data)
 heads=page.locator('.resumo-bloco-inicio-v596').all_text_contents()
 assert len(heads)==4,heads
 assert '4 cm' in heads[0] and '6,0 m' in heads[0]
 assert '4 cm' in heads[1] and '4,5 m' in heads[1]
 assert '5 cm' in heads[2] and '4,5 m' in heads[2]
 assert 'Angelin' in heads[3]
 assert page.locator('.grupo-especie-head').count()==4
 assert page.locator('.linha-excluir-pecas').count()==6
 assert page.locator('#sumQtd').inner_text()=='7'
 assert page.locator('#sumVolume').inner_text()=='0,2847 m³'
 # Same species/thickness/length, different width stays in the same block.
 assert page.locator('#tbLancamentos tr').nth(3).locator('td').nth(2).inner_text()=='10 cm'
 styles=''.join(re.findall(r'<style\b[^>]*>.*?</style>',t,re.S|re.I))
 page.evaluate('css=>{document.head.innerHTML=css}',styles)
 page.evaluate("() => {window.print=()=>{window.printReady=true};gerarPdfBloco('resumoCalculadoraExport','Resumo dos lançamentos')}")
 page.wait_for_function('window.printReady===true')
 pdfheads=page.locator('#printAreaCustom .resumo-bloco-inicio-v596').all_text_contents()
 assert pdfheads==heads
 (root/'review').mkdir(exist_ok=True)
 page.pdf(path=str(root/'review/resumo-blocos.pdf'),format='A4',print_background=True)
 # Export must not change the stored source items.
 assert page.evaluate('lancamentos')==data
 # Area and linear data must split by length, not invent thickness; granel has no length.
 mixed=[item('m1','Produto',0,3,10,2,1,'m2'),item('m2','Produto',0,4,10,2,1,'m2'),item('l1','Produto',0,4,0,1,4,'linear'),item('g1','Granel',0,0,0,1,1,'granel')]
 page.evaluate('data=>{window.lancamentos=data;renderLancamentos()}',mixed)
 heads=page.locator('#tbLancamentos .resumo-bloco-inicio-v596').all_text_contents()
 assert len(heads)==4,heads
 assert all('Esp.' not in h for h in heads)
 assert 'Comp.' not in heads[-1]
 browser.close()
print('PASS: new blocks for thickness/length/species/unit, width stays inside block, quantities/volume unchanged, same headers in real PDF, mixed measurement types')
