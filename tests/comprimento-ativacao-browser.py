"""Real cadastro toggle/save/reopen flow with mocked Firebase; no production data access."""
import json,re,sys
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
t=t.replace('parent.__v456Ready({', "window.__testRegrasComprimento=()=>regrasControleComprimentosV370(madeiras.find(m=>m.id==='cedro'));window.__testDadosMadeira=()=>madeiras.find(m=>m.id==='cedro');window.__testAssinatura=assinaturaMadeiras;window.__testValidar=()=>{estoque1Lancamentos=[[40,3],[30,4],[20,6]].map(([q,c])=>({madeiraId:'cedro',madeira:'Cedrinho',tipoMedida:'m3',espessura:4,largura:25,comprimento:c,quantidade:q,volume:volume(25,4,c,q)}));return validarControleVendaComprimentosV370([{madeiraId:'cedro',madeira:'Cedrinho',tipoMedida:'m3',espessura:4,largura:25,comprimento:6,quantidade:10,volume:0.6}]);};parent.__v456Ready({",1)
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
  window.fixtureMadeira={id:'cedro',nome:'Cedrinho',especie:'Cedrinho',tipoCadastro:'m3',preco:100,bitolas:[{estruturaV347:true,espessuraRegra:'4',preco:100,precoVarejo:100,regrasLargura:[],regrasComprimento:[]}],controleVendaComprimentos:[{espessura:4,intermediariaDe:4,controladaDe:5,baseComum:2,baseIntermediaria:2,baseControlada:2,referenciaEm:123,excecaoControlada:0.3}]};
  const madeiraSnap={...snap,docs:[{id:'cedro',data:()=>fixtureMadeira}],size:1};
  const sdk={initializeFirestore:()=>({}),collection:ref,doc:ref,setDoc:async(ref,data)=>{window.saved={ref:ref.path,data}},deleteDoc:async()=>{},getDocs:async()=>snap,getDocsFromServer:async()=>snap,getCountFromServer:async()=>({data:()=>({count:0})}),getDocFromServer:async r=>r.path.startsWith('membros/')?member:snap,getDocFromCache:async()=>member,writeBatch:()=>({set(){},delete(){},update(){},commit:async()=>{}}),onSnapshot:(ref,opts,cb)=>{if(typeof opts==='function')cb=opts;queueMicrotask(()=>cb(ref.path.includes('sm2_madeiras')?madeiraSnap:snap));return ()=>{}},waitForPendingWrites:async()=>{},serverTimestamp:()=>Date.now(),persistentLocalCache:()=>({}),persistentMultipleTabManager:()=>({}),memoryLocalCache:()=>({})};
  window.__v470Runtime=()=>({app:{},auth,db:{},sdk,authSdk:{initializeAuth:()=>auth,inMemoryPersistence:{},signInWithEmailAndPassword:async()=>{},signOut:async()=>{},onAuthStateChanged:()=>()=>{}},appSdk:{initializeApp:()=>({})}});
  const key='sm_v462_principal:'+ctx.empresaId+':';localStorage.setItem(key+'madeiras_db_v1',JSON.stringify([{id:'cedro',nome:'Cedrinho',especie:'Cedrinho',tipoCadastro:'m3',preco:0,bitolas:[]}]))
  }''')
  page.evaluate('(html)=>{const frame=document.createElement("iframe");frame.style="width:100%;height:900px";frame.srcdoc=html;document.body.appendChild(frame)}',t)
  frame=page.frame_locator('iframe');frame.locator('#largura').wait_for(state='attached');page.wait_for_timeout(1500)
  f=page.frames[1]
  assert not errors, errors
  f.evaluate("editarMadeira('cedro')")
  assert frame.locator('#editId').input_value()=='cedro'
  assert frame.locator('#btnAtivarControleComprimentos').get_attribute('aria-pressed')=='true'
  assert f.evaluate('__testRegrasComprimento().length')==1
  assert f.evaluate('__testValidar().ok') is False
  f.evaluate("document.getElementById('btnAtivarControleComprimentos').click()")
  assert frame.locator('#btnAtivarControleComprimentos').get_attribute('aria-pressed')=='false'
  assert 'desativado' in frame.locator('.controle-v370-status').inner_text()
  f.evaluate("document.getElementById('btnSalvarMadeira').click()")
  page.wait_for_function('saved?.data?.controleVendaComprimentosAtivo===false')
  assert page.evaluate('saved.data.controleVendaComprimentos[0].referenciaEm')==123
  assert page.evaluate('saved.data.controleVendaComprimentos[0].excecaoControlada')==0.3
  assert f.evaluate('__testRegrasComprimento().length')==0
  assert f.evaluate('__testValidar().ok') is True
  # Reopen shows the inactive state, while all original rows remain editable.
  f.evaluate("editarMadeira('cedro')")
  assert frame.locator('#btnAtivarControleComprimentos').get_attribute('aria-pressed')=='false'
  assert frame.locator('#cadControleComprimentosListaV370 .controle-v370-linha').count()==1
  assert frame.locator('.ctrl-v370-control').input_value()=='5'
  # Remote signature must include the activation state.
  assert f.evaluate("()=>{const m=__testDadosMadeira();return __testAssinatura([m])!==__testAssinatura([{...m,controleVendaComprimentosAtivo:true}])}")
  f.evaluate("document.getElementById('btnAtivarControleComprimentos').click();document.getElementById('btnSalvarMadeira').click()")
  page.wait_for_function('saved?.data?.controleVendaComprimentosAtivo===true')
  assert f.evaluate('__testRegrasComprimento().length')==1
  assert f.evaluate('__testValidar().ok') is False
  assert page.evaluate('saved.data.controleVendaComprimentos[0].referenciaEm')==123
  browser.close()
finally:server.shutdown()

print('PASS: legacy active by default, toggle/save, no active rules when disabled, preserved limits/reference/exception, reopen inactive, reactivate and sync signature')
