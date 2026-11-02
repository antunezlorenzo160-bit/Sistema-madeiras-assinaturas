"""Do not declare offline readiness before shell, SDK assets and verified cached membership exist."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'public/index.html').read_text();m=re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S);o=s[m.end(1):]
helpers=o[o.index('function erroDeRedeOffline('):o.index('async function abrirSessaoV492(')]
source=o[o.index('let preparandoAcessoOffline='):o.index('window.__v456Ready=c=>')]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context();page=context.new_page();page.set_content('<input type="checkbox" id="lembrar" checked><iframe></iframe>')
 page.evaluate('''() => {window.$=id=>document.getElementById(id);window.frame=document.querySelector('iframe');frame.contentDocument.body.innerHTML='<header>System</header>';window.expected={U:'A'};window.context={uid:'U',empresaId:'A'};window.auth={currentUser:{uid:'U'}};window.db={};window.assetReady=true;window.member={ativo:true,empresaId:'A'};window.__smOfflineRegistration=Promise.resolve({update:async()=>{}});Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{ready:Promise.resolve({active:{}}),register:async()=>({update:async()=>{}})}});Object.defineProperty(window,'caches',{configurable:true,value:{keys:async()=>['sm-offline-test'],open:async()=>({match:async()=>assetReady?{}:null})}});window.sdk={doc:()=>({}),getDocFromCache:async()=>({exists:()=>true,data:()=>member})}}''')
 page.evaluate('() => {'+helpers+source.replace('}catch{','}catch(e){window.readinessError=String(e);')+';window.prepareOffline=prepararAcessoOffline;}')
 def status():return page.frame_locator('iframe').locator('#acessoOfflineStatus span').inner_text()
 page.evaluate('prepareOffline()');assert status()=='Pronto para abrir sem internet neste navegador.',(status(),page.evaluate('window.readinessError'))
 page.evaluate('assetReady=false;prepareOffline()');assert 'ainda não está preparada' in status()
 assert page.frame_locator('iframe').locator('#acessoOfflineStatus button').is_visible()
 page.evaluate("assetReady=true;member={ativo:true,empresaId:'B'};prepareOffline()");assert 'ainda não está preparada' in status()
 page.uncheck('#lembrar');page.evaluate('prepareOffline()');assert 'Manter conectado' in status()
 context.set_offline(True);page.evaluate('prepareOffline()');assert 'Modo offline' in status()
 browser.close()
print('PASS: readiness needs assets and cached company; failures show retry, remembered-session requirement and current offline mode')
