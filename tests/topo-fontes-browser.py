"""Complete header typography and fixed button geometry across screens, with mocked Firebase."""
import json,re,sys
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
ajuste=re.search(r'<script id="fontes-paineis-fixos">(.*?)</script>',t,re.S)[1];t=re.sub(r'<script id="fontes-paineis-fixos">.*?</script>','',t,flags=re.S)
t=t.replace('parent.__v456Ready({', "window.__testNavigate=nome=>pcAbrirDestinoTelaCompleta(nome);window.__testStock=()=>{madeiras=[{id:'ang',nome:'Angelin',especie:'Angelin',tipoCadastro:'m3',bitolas:[]}];estoque1Lancamentos=[{id:'x',madeiraId:'ang',madeira:'Angelin',espessura:2.5,largura:15,comprimento:3,quantidade:8,volume:0.09,tipoMedida:'m3'}];estoque2Lancamentos=estoque1Lancamentos.map(x=>({...x,id:'y'}));estoqueTipo='m3';pcAbrirDestinoTelaCompleta('estoque');abrirSubabaEstoque('principal');selecionarEstoquePlanilha('estoque1');renderPlanilhasM3Especies();};parent.__v456Ready({",1)
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
  for route in ['estoque','cadastro','orcamento','calculadora','movimentacoes','clientes','configuracoes']:
   # Restore the base typography before switching screen; then apply the real adjustment.
   if route!='estoque':
    f.evaluate("window.dispatchEvent(new Event('beforeprint'))")
   if route=='estoque':f.evaluate('__testStock()')
   elif route=='movimentacoes':f.evaluate("__testNavigate('estoque');document.getElementById('estoqueHistoricoPainel').classList.add('ativo');document.getElementById('estoquePrincipalPainel').classList.remove('ativo')")
   else:f.evaluate('(route)=>__testNavigate(route)',route)
   page.wait_for_timeout(100)
   base=f.evaluate("[...document.querySelectorAll('header button')].filter(b=>b.getBoundingClientRect().width>0&&b.getBoundingClientRect().height>0).map(b=>({text:b.textContent,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height,font:parseFloat(getComputedStyle(b).fontSize)}))")
   if route=='estoque':f.add_script_tag(content=ajuste)
   else:f.evaluate("window.__smPrintingV556=false;window.dispatchEvent(new Event('afterprint'))")
   page.wait_for_timeout(100)
   after=f.evaluate("[...document.querySelectorAll('header button')].filter(b=>b.getBoundingClientRect().width>0&&b.getBoundingClientRect().height>0).map(b=>({text:b.textContent,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height,font:parseFloat(getComputedStyle(b).fontSize),fits:b.scrollHeight<=b.clientHeight+1&&b.scrollWidth<=b.clientWidth+1}))")
   assert len(base)==len(after),(route,base,after)
   for a,z in zip(base,after):
    assert abs(a['w']-z['w'])<=1 and abs(a['h']-z['h'])<=1,(route,a,z)
    assert z['font']>=a['font'],(route,a,z)
    assert z['fits'],(route,a,z)
   print(route,[(a['text'].strip(),a['font'],z['font'])for a,z in zip(base,after)])
  assert not errors,errors
  browser.close()
finally:server.shutdown()

print('PASS: header font enlargement keeps all button boxes unchanged across screens')
