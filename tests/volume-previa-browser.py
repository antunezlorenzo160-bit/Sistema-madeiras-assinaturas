"""The real preview updates from input events without writing or adding launches."""
from pathlib import Path
import re,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
a=t.index('function atualizarVolumeAntesLancamento(');b=t.index('// V351',a);functions=t[a:b]
a=t.index("['largura','comprimento'].forEach");b=t.index('// Ao tocar nos campos',a);events=t[a:b]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844})
 page.set_content('<div id="sumVolumeTopo" data-volume-lancado="1,0000 m³">1,0000 m³</div>'+''.join('<input id="'+id+'" type="text" value="'+value+'">' for id,value in [('quantidade','1'),('largura',''),('comprimento','3'),('espessura','2.5'),('precoM3','0'),('volumeGranelV384',''),('volumeFechadoV387','')])+''.join('<input type="checkbox" id="'+id+'">'for id in ['chkEndireitamento','chkAplainamento'])+''.join('<span id="'+id+'"></span>'for id in ['previewVolume','previewTotal','previewValor','precoFechadoV387','precoGranelV384']))
 page.evaluate('''() => {window.$=id=>document.getElementById(id);window.modoMedida='m3';window.madeiras=[];window.servicosM3={};window.lancamentos=[];window.num4=v=>v.toFixed(4).replace('.',',');window.num2=v=>v.toFixed(2).replace('.',',');window.moeda=String;window.volume=(l,e,c,q)=>(l/100)*(e/100)*c*q;window.areaM2=(l,c,q)=>(l/100)*c*q;window.regraLinearSelecionadaV381=()=>null;}''')
 page.evaluate('() => {'+functions+"function atualizarPrecoBitolaCalculadora(){calcPreview()}\n"+events+";window.preview=calcPreview;preview();}")
 page.fill('#largura','25');assert page.locator('#sumVolumeTopo').inner_text()=='0,0188 m³'
 # A refresh of launched totals must not overwrite the current measurements.
 page.evaluate("document.getElementById('sumVolumeTopo').dataset.volumeLancado='2,0000 m³';preview()")
 assert page.locator('#sumVolumeTopo').inner_text()=='0,0188 m³'
 page.evaluate("document.getElementById('sumVolumeTopo').dataset.volumeLancado='1,0000 m³'")
 # Android changes numeric fields into text; comma input must work on this event.
 page.fill('#comprimento','3,5');assert page.locator('#sumVolumeTopo').inner_text()=='0,0219 m³'
 assert page.locator('#comprimento').input_value()=='3.5'
 page.fill('#comprimento','3')
 page.fill('#quantidade','2');assert '0,0375 m³' in page.locator('#sumVolumeTopo').inner_text()
 page.fill('#comprimento','4');assert '0,0500 m³' in page.locator('#sumVolumeTopo').inner_text()
 page.fill('#espessura','4');assert '0,0800 m³' in page.locator('#sumVolumeTopo').inner_text()
 page.fill('#largura','');assert '1,0000 m³' in page.locator('#sumVolumeTopo').inner_text()
 page.fill('#largura','-25');page.fill('#espessura','-4');assert '1,0000 m³' in page.locator('#sumVolumeTopo').inner_text()
 page.evaluate("modoMedida='m2'");page.fill('#largura','25');assert '2,00 m²' in page.locator('#sumVolumeTopo').inner_text()
 page.evaluate("modoMedida='linear';preview()");assert '4,00 m' in page.locator('#sumVolumeTopo').inner_text()
 page.evaluate("modoMedida='granel'");page.fill('#volumeGranelV384','1.25');assert '1,2500 m³' in page.locator('#sumVolumeTopo').inner_text()
 page.evaluate("modoMedida='m3fechado'");page.fill('#volumeFechadoV387','2.5');assert '2,5000 m³' in page.locator('#sumVolumeTopo').inner_text()
 assert page.locator('#sumVolumeTopo').get_attribute('data-volume-lancado')=='1,0000 m³'
 assert page.evaluate('lancamentos.length')==0
 browser.close()
print('PASS: measures/quantity update preview immediately; blank/invalid inputs reset; all modes keep units; existing output only, restores launched total on clearing, no changes to records')
