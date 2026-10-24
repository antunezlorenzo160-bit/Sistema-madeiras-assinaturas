"""Real complete template with mobile adapters and mocked Firebase; no production data access."""
import json,re,sys
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
t=t.replace('parent.__v456Ready({',"window.__testLinear=()=>{pcAbrirDestinoTelaCompleta('calculadora');modoMedida='linear';madeiras=[{id:'rod',nome:'Pinus',tipoCadastro:'linear',regrasLinear:[{tipo:'Rodapé',precoVarejo:10}]}];aplicarModoMedida();$('calcMadeira').value='rod';preencherTiposLinearV381();$('tipoLinear').value='0';$('comprimento').value='4';$('quantidade').value='23';document.querySelector('input[name=destinoLancamento][value=orcamento]').checked=true;destinoAtual='orcamento';orcamento=[];calcPreview();};window.__itensLinear=()=>orcamento;parent.__v456Ready({")
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/toras.mjs':body=(root/'public/toras.mjs').read_bytes();mime='application/javascript'
  else:body=b'<div id="holder"></div>';mime='text/html'
  self.send_response(200);self.send_header('Content-Type',mime);self.end_headers();self.wfile.write(body)
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://**/*',lambda r:r.abort())
  page.goto('http://127.0.0.1:'+str(server.server_port))
  page.evaluate('''() => {
  const ctx={empresaId:'mdeiras-oeste-pkwj3e',uid:'U'};window.__v456Context=()=>ctx;window.__v456TakeCredentials=()=>null;window.__v456Ready=()=>{};window.__v456Error=x=>console.error(x);window.__smDadosFirestoreV538=x=>x;
  const auth={currentUser:{uid:'U'},authStateReady:async()=>{}};
  const member={exists:()=>true,data:()=>({ativo:true,empresaId:ctx.empresaId})};
  const snap={docs:[],size:0,exists:()=>false,data:()=>({}),metadata:{fromCache:false,hasPendingWrites:false},docChanges:()=>[]};
  const ref=(db,...parts)=>({path:parts.join('/'),id:parts.at(-1)});
  const sdk={initializeFirestore:()=>({}),collection:ref,doc:ref,setDoc:async()=>{},deleteDoc:async()=>{},getDocs:async()=>snap,getDocsFromServer:async()=>snap,getCountFromServer:async()=>({data:()=>({count:0})}),getDocFromServer:async r=>r.path.startsWith('membros/')?member:snap,getDocFromCache:async()=>member,writeBatch:()=>({set(){},delete(){},update(){},commit:async()=>{}}),onSnapshot:(ref,opts,cb)=>{if(typeof opts==='function')cb=opts;queueMicrotask(()=>cb(snap));return ()=>{}},waitForPendingWrites:async()=>{},serverTimestamp:()=>Date.now(),persistentLocalCache:()=>({}),persistentMultipleTabManager:()=>({}),memoryLocalCache:()=>({})};
  window.__v470Runtime=()=>({app:{},auth,db:{},sdk,authSdk:{initializeAuth:()=>auth,inMemoryPersistence:{},signInWithEmailAndPassword:async()=>{},signOut:async()=>{},onAuthStateChanged:()=>()=>{}},appSdk:{initializeApp:()=>({})}});
  const key='sm_v462_principal:'+ctx.empresaId+':';localStorage.setItem(key+'madeiras_db_v1',JSON.stringify([{id:'cedro',nome:'Cedrinho',especie:'Cedrinho',tipoCadastro:'m3',preco:0,bitolas:[]}]))
  }''')
  page.evaluate('(html)=>{const frame=document.createElement("iframe");frame.style="width:100%;height:900px";frame.srcdoc=html;document.body.appendChild(frame)}',t)
  frame=page.frame_locator('iframe');frame.locator('#largura').wait_for(state='attached');page.wait_for_timeout(1500)
  f=page.frames[1]
  assert not errors, errors
  f.evaluate("document.querySelectorAll('section.tab').forEach(s=>s.classList.toggle('active',s.id==='calculadora'));document.getElementById('espessura').value='2.5';document.getElementById('comprimento').value='3';document.getElementById('quantidade').value='1'")
  f.evaluate("document.getElementById('largura').value='25';document.getElementById('comprimento').value='3,5';document.getElementById('comprimento').dispatchEvent(new Event('input',{bubbles:true}))")
  assert f.evaluate("document.getElementById('comprimento').value")=='3.5'
  assert frame.locator('#volumeAntesLancamento').count()==0
  assert frame.locator('#sumVolumeTopo').inner_text()=='0,0219 m³'
  f.evaluate('__testLinear()')
  page.wait_for_timeout(200)
  assert frame.locator('#btnVerdeOuCorrigirV260').is_hidden()
  assert 'Enc.' in frame.locator('#servicosM3Lancamento').inner_text()
  assert 'Friz.' in frame.locator('#servicosM3Lancamento').inner_text()
  assert frame.locator('#quantidade').is_visible()
  assert frame.locator('#quantidade').evaluate("el=>{const q=el.getBoundingClientRect(),c=document.getElementById('comprimento').getBoundingClientRect();return Math.abs(q.width-c.width)<1&&q.top>c.bottom&&Math.abs(q.left-c.left)<1}")
  assert frame.locator('#previewVolume').inner_text()=='4,00 m'
  assert frame.locator('#previewTotal').inner_text()=='92,00 m'
  assert frame.locator('#sumVolumeTopo').inner_text()=='92,00 m'
  assert '920,00' in frame.locator('#previewValor').inner_text()
  frame.locator('#btnLancar').evaluate('(el)=>el.click()')
  f.wait_for_function('__itensLinear().length===1')
  assert f.evaluate('__itensLinear()[0].quantidade')==23
  assert f.evaluate('__itensLinear()[0].volume')==92
  assert f.evaluate('__itensLinear()[0].valor')==920
  assert not errors,errors
  browser.close()
finally:server.shutdown()

print('PASS: linear quantity visible, 23 pieces x 4m = 92m, preview and saved quantity/meters/value agree')
