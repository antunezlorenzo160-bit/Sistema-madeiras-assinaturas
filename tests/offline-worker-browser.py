"""Real Chromium service worker installs assets, reopens offline, excludes APIs and signature URLs."""
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
worker=(root/'public/sw.js').read_text()
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  origin='http://127.0.0.1:'+str(self.server.server_port)
  if self.path=='/sw.js':
   body=worker.replace('https://www.gstatic.com/firebasejs/12.2.1/',origin+'/sdk/');mime='application/javascript'
  elif self.path.startswith('/sdk/') or self.path=='/toras.mjs':body='export const ready=true;';mime='application/javascript'
  elif self.path=='/':
   body='''<h1>Offline fixture</h1><button id="add">Lançar</button><output id="count"></output><script type="module">import {ready} from '/toras.mjs';import {ready as sdk} from '/sdk/firebase-app.js';count.textContent=localStorage.getItem('count')||'0';add.onclick=()=>{count.textContent=Number(count.textContent)+1;localStorage.setItem('count',count.textContent)};navigator.serviceWorker.register('/sw.js');</script>''';mime='text/html'
  else:body='private response';mime='text/plain'
  self.send_response(200);self.send_header('Content-Type',mime);self.end_headers();self.wfile.write(body.encode())
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context();page=context.new_page()
  origin='http://127.0.0.1:'+str(server.server_port)
  page.goto(origin);page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('!!navigator.serviceWorker.controller')
  page.click('#add');assert page.locator('#count').inner_text()=='1'
  page.evaluate("fetch('/.netlify/functions/assinatura-entrega').then(r=>r.text())")
  page.evaluate("fetch('/?assinar=fixture-only').then(r=>r.text())")
  keys=page.evaluate("async()=>{const cache=await caches.open('sm-offline-20261023-3');return (await cache.keys()).map(r=>r.url)}")
  assert len(keys)==5,keys
  assert all('assinar' not in k and '.netlify/functions' not in k for k in keys)
  context.set_offline(True);page.reload();page.wait_for_function("document.getElementById('count').textContent==='1'")
  page.click('#add');assert page.locator('#count').inner_text()=='2'
  page.reload();page.wait_for_function("document.getElementById('count').textContent==='2'")
  assert page.evaluate("async()=>{try{await fetch('/.netlify/functions/assinatura-entrega');return false}catch{return true}}")
  browser.close()
finally:server.shutdown()
print('PASS: actual SW warms shell/modules, offline reload preserves working inputs/local data, APIs and signature URLs excluded from cache')
