"""Real complete template with mobile adapters and mocked Firebase; no production data access."""
import json,re,sys
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
t=t.replace('parent.__v456Ready({',"window.__testVerde=()=>{pcAbrirDestinoTelaCompleta('calculadora');modoMedida='m3fechado';madeiras=[{id:'euc',nome:'Eucalipto',tipoCadastro:'m3',preco:2300,precoVerde:1500,bitolas:[]}];aplicarModoMedida();$('calcMadeira').value='euc';$('espessura').value='5';$('comprimento').value='3';$('volumeFechadoV387').value='2';atualizarPrecoBitolaCalculadora();orcamento=[];};window.__itensVerde=()=>orcamento;window.__editarVerde=()=>editarMadeira('euc');parent.__v456Ready({")
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
  f.evaluate('__testVerde()')
  assert '4.600,00' in frame.locator('#previewValor').inner_text()
  frame.locator('#chkVerdeFechado').evaluate('(el)=>{el.checked=true;el.dispatchEvent(new Event("change",{bubbles:true}))}')
  assert '3.000,00' in frame.locator('#previewValor').inner_text()
  frame.locator('#btnLancar').evaluate('(el)=>el.click()')
  f.wait_for_function('__itensVerde().length===1')
  assert f.evaluate('__itensVerde()[0].estadoMadeira')=='verde'
  assert f.evaluate('__itensVerde()[0].preco')==1500
  frame.locator('#chkVerdeFechado').evaluate('(el)=>{el.checked=false;el.dispatchEvent(new Event("change",{bubbles:true}))}')
  assert frame.locator('#precoM3').input_value()=='2300'
  f.evaluate('__editarVerde()')
  assert frame.locator('#cadPrecoVerde').input_value()=='1500'
  assert not errors,errors
  browser.close()
finally:server.shutdown()

print('PASS: green wood closed-volume price updates, launch snapshots green state and price, dry price restores, registration edit retains green price')
