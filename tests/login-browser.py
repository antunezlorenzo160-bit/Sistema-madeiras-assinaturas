"""Password eye and reset flow with real markup/handlers; email sending mocked."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'public/index.html').read_text();helpers=s[s.index('function atualizarVisibilidadeSenha('):s.index("$('entrar').onclick=async()=>{")]
html=re.sub(r'<script\b[^>]*>.*?</script\s*>','',s,flags=re.S)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();page.route('**/*',lambda r:r.abort());page.set_content(html)
 page.evaluate('''() => {window.$=id=>document.getElementById(id);window.out=$('resultado');window.busy=false;window.auth={};window.calls=[];window.code='';window.prepare=async()=>{};window.authSdk={sendPasswordResetEmail:async(a,email)=>{calls.push(email);if(code)throw {code}}};}''')
 page.evaluate('()=>{'+helpers+'}')
 page.fill('#senha','Senha de teste 123')
 assert page.locator('#senha').get_attribute('type')=='password'
 page.click('#alternarSenha');assert page.locator('#senha').get_attribute('type')=='text'
 assert page.locator('#alternarSenha').get_attribute('aria-label')=='Ocultar senha'
 assert page.locator('#olhoOcultar').is_visible() and not page.locator('#olhoMostrar').is_visible()
 assert page.locator('#senha').input_value()=='Senha de teste 123'
 page.click('#alternarSenha');assert page.locator('#senha').get_attribute('type')=='password'
 page.click('#esqueciSenha');assert 'e-mail válido' in page.locator('#resultado').inner_text() and page.evaluate('calls.length')==0
 page.fill('#email','invalid');page.click('#esqueciSenha');assert page.evaluate('calls.length')==0
 page.fill('#email','cliente@example.test');context.set_offline(True);page.click('#esqueciSenha')
 assert 'internet' in page.locator('#resultado').inner_text() and page.evaluate('calls.length')==0
 context.set_offline(False);page.click('#esqueciSenha');assert page.evaluate('calls')==['cliente@example.test']
 assert 'Se houver uma conta' in page.locator('#resultado').inner_text()
 page.evaluate("window.code='auth/user-not-found'");page.click('#esqueciSenha');assert 'Se houver uma conta' in page.locator('#resultado').inner_text()
 page.evaluate("window.code='auth/too-many-requests'");page.click('#esqueciSenha');assert 'Aguarde' in page.locator('#resultado').inner_text()
 assert page.locator('#entrar').is_enabled() and page.locator('#esqueciSenha').is_enabled()
 assert page.locator('#senha').input_value()=='Senha de teste 123'
 assert page.locator('.senha-campo').evaluate('(el)=>el.scrollWidth<=el.clientWidth')
 (root/'review').mkdir(exist_ok=True);page.screenshot(path=str(root/'review/login-senha.png'),full_page=True)
 browser.close()
print('PASS: masked default, eye toggle/accessibility/value preserved, valid email, offline/invalid checks, mocked reset, private response and rate limit recovery')
