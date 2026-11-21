from pathlib import Path
import json,threading,http.server,functools
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1100,'height':900})
 page.goto('http://127.0.0.1:%d/tests/browser-fixture.html'%server.server_port)
 page.wait_for_function('window.testReady===true')
 result=page.evaluate('window.testResult');assert result['rows']==77,result
 assert result['pieces']==451,result
 assert result['before']==result['after'],result
 assert result['copySame'],result
 page.emulate_media(media='print')
 out=ROOT.parent/'screenshots';out.mkdir(exist_ok=True)
 page.pdf(path=str(out/'compact77.pdf'),format='A4',print_background=True,margin={'top':'10mm','bottom':'10mm','left':'10mm','right':'10mm'})
 page.screenshot(path=str(out/'compact77.png'),full_page=True)
 browser.close()
server.shutdown()
import fitz
pdf=fitz.open(out/'compact77.pdf');assert len(pdf)==1,len(pdf)
assert '15,4392' in ''.join(page.get_text() for page in pdf)
print('Chromium: 77 linhas,451 peças,1página A4; original DOM e cópia preservados.')
