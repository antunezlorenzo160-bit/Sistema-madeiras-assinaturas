"""Wheel-scroll test in the complete application: content moves while root and header remain stationary; Firebase mocked."""
import json,re,sys
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'public/index.html').read_text();t=json.loads(re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S)[1])
t=t.replace('parent.__v456Ready({', "window.__testNavigate=nome=>pcAbrirDestinoTelaCompleta(nome);window.__testEditar=()=>{madeiras=[{id:'cedro',nome:'Cedrinho',especie:'Cedrinho',tipoCadastro:'m3',bitolas:[]}];editarMadeira('cedro')};parent.__v456Ready({",1)
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/toras.mjs':body=(root/'public/toras.mjs').read_bytes();mime='application/javascript'
  else:body=b'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="holder"></div>';mime='text/html'
  self.send_response(200);self.send_header('Content-Type',mime);self.end_headers();self.wfile.write(body)
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[]
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
  page.evaluate('(html)=>{const frame=document.createElement("iframe");frame.style="width:100%;height:"+(innerHeight-20)+"px";frame.srcdoc=html;document.body.appendChild(frame)}',t)
  frame=page.frame_locator('iframe');frame.locator('#largura').wait_for(state='attached');page.wait_for_timeout(1500)
  f=page.frames[1]
  assert not errors, errors
  for route in ['cadastro','orcamento','carregamentos','clientes','configuracoes']:
   f.evaluate('(route)=>__testNavigate(route)',route);page.wait_for_timeout(150)
   assert f.evaluate("document.documentElement.classList.contains('rolagem-interna-abas')"),route
   f.evaluate("()=>{document.body.classList.add('tema-vidro');const extra=document.createElement('div');extra.id='test-long-content';extra.style.height='2000px';extra.textContent='Final do conteúdo de teste';document.querySelector('section.tab.active').appendChild(extra)}")
   page.wait_for_timeout(80)
   main=frame.locator('body>main');box=main.bounding_box()
   assert box and box['height']>100,(route,box)
   assert main.evaluate('(el)=>el.clientWidth')<=f.evaluate('innerWidth'),route
   header_before=frame.locator('body>header').bounding_box()
   page.mouse.move(box['x']+min(box['width']-12,200),box['y']+min(120,box['height']/2));page.mouse.wheel(0,550)
   page.wait_for_timeout(150)
   down=main.evaluate('(el)=>el.scrollTop')
   if down==0:print('HIT',f.evaluate("()=>{const r=document.querySelector('body>main').getBoundingClientRect();const e=document.elementFromPoint(r.left+Math.min(r.width-12,200),r.top+120);return {tag:e?.tagName,id:e?.id,classes:e?.className,body:document.body.className,rect:{top:r.top,right:r.right},active:document.activeElement?.id}}"))
   assert down>0,(route,down,main.evaluate('(el)=>({overflow:getComputedStyle(el).overflowY,h:el.clientHeight,content:el.scrollHeight})'))
   assert f.evaluate('window.scrollY')==0,route
   page.mouse.wheel(0,-250);page.wait_for_timeout(150)
   assert main.evaluate('(el)=>el.scrollTop')<down,route
   # Dispatch an actual touch scroll in mobile emulation as well.
   cdp=page.context.new_cdp_session(page)
   page.wait_for_timeout(300)
   main.evaluate('(el)=>el.scrollTop=0')
   x=int(box['x']+5);y=int(box['y']+box['height']-80)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   for passo in range(1,11):
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-passo*25}]});page.wait_for_timeout(20)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   page.wait_for_timeout(150)
   assert main.evaluate('(el)=>el.scrollTop')>0,('touch',route)
   cdp.detach()
   assert header_before==frame.locator('body>header').bounding_box(),route
   assert f.evaluate("getComputedStyle(document.body,'::before').position")=='fixed'
   if route=='cadastro':
    f.evaluate('__testEditar()');f.wait_for_function("document.querySelector('body>main').scrollTop<1")
    assert frame.locator('#editId').input_value()=='cedro'
   else:f.evaluate("window.__smRolarConteudo({top:0,behavior:'auto'})")
   assert main.evaluate('(el)=>el.scrollTop')==0
   f.evaluate("document.getElementById('test-long-content').remove()")
  for route in ['estoque','calculadora','inicio']:
   f.evaluate('(route)=>__testNavigate(route)',route);page.wait_for_timeout(150)
   assert not f.evaluate("document.documentElement.classList.contains('rolagem-interna-abas')"),route
  assert not errors,errors
  browser.close()
finally:server.shutdown()

print('PASS: real wheel scroll works both directions in five tabs; root/background/header stay fixed, scroll-to-top works, stock/calculator/home preserved')
