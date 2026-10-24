"""Integration: public Firebase SDK assets only; auth emulator and Firestore data are synthetic and local. Requires internet for the initial SDK download."""
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import re,json,time,base64,tempfile,urllib.request
assets=Path(tempfile.mkdtemp(prefix="sm-offline-sdk-"))
for name in ["firebase-app.js","firebase-auth.js","firebase-firestore.js"]:
 (assets/name).write_bytes(urllib.request.urlopen("https://www.gstatic.com/firebasejs/12.2.1/"+name,timeout=30).read())
root=Path(__file__).resolve().parents[1];s=(root/'public/index.html').read_text();m=re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S);o=s[m.end(1):]
prepare=o[o.index('async function prepare(){'):o.index('async function close(){')]
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_POST(self):
  def enc(x):return base64.urlsafe_b64encode(json.dumps(x).encode()).decode().rstrip('=')
  tok=enc({'alg':'none'})+'.'+enc({'sub':'U','user_id':'U','email':'offline@example.test','auth_time':int(time.time()),'iat':int(time.time()),'exp':int(time.time())+3600,'firebase':{'sign_in_provider':'password'}})+'.fixture'
  body=json.dumps({'localId':'U','email':'offline@example.test','idToken':tok,'refreshToken':'fixture-only','expiresIn':'3600','registered':True})
  if 'accounts:lookup' in self.path:body=json.dumps({'users':[{'localId':'U','email':'offline@example.test','emailVerified':False,'providerUserInfo':[],'createdAt':str(int(time.time()*1000))}]})
  self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(body.encode())
 def do_GET(self):
  origin='http://127.0.0.1:'+str(self.server.server_port)
  if self.path=='/sw.js':body=(root/'public/sw.js').read_text().replace('https://www.gstatic.com/firebasejs/12.2.1/',origin+'/sdk/');mime='application/javascript'
  elif self.path.startswith('/sdk/firebase-'):
   name=self.path.split('/')[-1];body=(assets/name).read_text().replace('https://www.gstatic.com/firebasejs/12.2.1/',origin+'/sdk/');mime='application/javascript'
  elif self.path=='/toras.mjs':body='export const ready=true';mime='application/javascript'
  else:
   body='''<p id="state">starting</p><script type="module">
 let etapaEntradaOffline='',auth=null,db=null,sdk=null,authSdk=null,mainApp=null,appSdk=null,probeDb=null;
 const config={apiKey:'fixture-key',projectId:'offline-fixture',appId:'fixture',authDomain:'localhost'};
 '''+prepare.replace('https://www.gstatic.com/firebasejs/12.2.1/',origin+'/sdk/')+'''
 try{await prepare();await auth.authStateReady();window.runtime=()=>({auth,db,sdk,authSdk});document.getElementById('state').textContent=auth.currentUser?'restored '+auth.currentUser.uid:'no session';}catch(e){document.getElementById('state').textContent=e.message}
 navigator.serviceWorker.register('/sw.js');</script>''';mime='text/html'
  self.send_response(200);self.send_header('Content-Type',mime);self.end_headers();self.wfile.write(body.encode())
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context();page=context.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)));page.route('https://**/*',lambda r:r.abort())
  origin='http://127.0.0.1:'+str(server.server_port);page.goto(origin);page.wait_for_function("document.getElementById('state').textContent!=='starting'")
  assert page.locator('#state').inner_text()=='no session',errs
  page.evaluate("async origin=>{const {auth,authSdk,db,sdk}=runtime();authSdk.connectAuthEmulator(auth,origin,{disableWarnings:true});await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);await authSdk.signInWithEmailAndPassword(auth,'offline@example.test','fixture-password');await sdk.disableNetwork(db);const ref=sdk.doc(db,'membros','U');sdk.setDoc(ref,{ativo:true,empresaId:'A'});await sdk.getDocFromCache(ref);}",origin)
  page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('!!navigator.serviceWorker.controller');page.wait_for_timeout(500)
  context.set_offline(True);page.reload();page.wait_for_function("document.getElementById('state').textContent!=='starting'")
  assert page.locator('#state').inner_text()=='restored U',errs
  assert page.evaluate("async()=>{const {sdk,db}=runtime();try{const d=await sdk.getDocFromCache(sdk.doc(db,'membros','U'));return d.data()}catch(e){return e.message}}")=={'ativo':True,'empresaId':'A'}
  assert not errs,errs
  browser.close()
finally:server.shutdown()

print("PASS: real SDK remembers the synthetic user and company cache across offline reload; no production Firebase accessed")
