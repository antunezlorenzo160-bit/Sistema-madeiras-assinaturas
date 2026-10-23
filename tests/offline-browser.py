"""Offline session gates and durable queue use actual application functions, no Firebase access."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
s=(root/'public/index.html').read_text();m=re.search(r'const TEMPLATE=(".*?");\nlet credentials',s,re.S);t=json.loads(m[1]);outer=s[:m.start(1)]+"''"+s[m.end(1):]
opening=outer[outer.index('async function abrirSessaoV492()'):outer.index('function falhaEntradaV492(')]
wrappers=t[t.index('function setDoc('):t.index('const {app,auth:authV456,db}')]
queue=t[t.index('function offlineOps()'):t.index('let offlineSyncPromiseV396=')]
sync=t[t.index('let offlineSyncPromiseV396='):t.index("window.addEventListener('online',()=>{atualizarPendenciasCadastroV457()")]
scope=t[t.index('function caminhoV456('):t.index('const credentialV456=')]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context();context.set_offline(True)
 page=context.new_page();page.set_content('<div id="holder"></div>')
 page.evaluate('''() => {window.member={ativo:true,empresaId:'A'};window.auth={currentUser:{uid:'U'}};window.expected={U:'A'};window.cacheReads=0;window.serverReads=0;window.db={};window.probeDb={};window.credentials=null;window.context=null;window.frame=null;window.primeiroErroInterface=null;window.TEMPLATE='<p>Cached interface</p>';window.out={textContent:''};window.$=id=>document.getElementById(id);window.sdk={doc:(database,...path)=>({database,path:path.join('/')}),getDocFromCache:async()=>{cacheReads++;if(!member)throw Error('cache miss');return {exists:()=>true,data:()=>member}},getDocFromServer:async ref=>{serverReads++;if(ref.path==='membros/U')return {exists:()=>true,data:()=>member};throw {code:'permission-denied'}},getDocsFromServer:async()=>[],query:x=>x,collection:()=>({}),limit:()=>({})}}''')
 page.evaluate('() => {'+opening+';window.openCompany=abrirSessaoV492;}')
 page.evaluate('openCompany()');assert page.evaluate('context.offline') is True
 assert page.evaluate('cacheReads')==1 and page.evaluate('serverReads')==0
 for member in [None,{'ativo':False,'empresaId':'A'},{'ativo':True,'empresaId':'B'}]:
  page.evaluate('(m)=>{window.member=m;window.context=null;window.frame=null}',member)
  assert page.evaluate("async()=>{try{await openCompany();return false}catch{return context===null&&frame===null}}")
 page.evaluate("auth.currentUser=null")
 assert page.evaluate("async()=>{try{await openCompany();return false}catch{return true}}")
 context.set_offline(False);page.evaluate("auth.currentUser={uid:'U'};member={ativo:false,empresaId:'A'};cacheReads=0")
 assert page.evaluate("async()=>{try{await openCompany();return false}catch{return true}}")
 assert page.evaluate('cacheReads')==0 # Online denial must never fall back to cache.
 context.set_offline(True)
 page.evaluate('''() => {window.seq=0;crypto.randomUUID=()=>String(++seq);window.mem={};window.__v456Local={getItem:k=>mem[k],setItem:(k,v)=>{mem[k]=v}};window.OFFLINE_OPS_KEY='queue';window.atualizarPendenciasCadastroV457=()=>{};window.atualizarStatusSync=()=>{};window.parent.__smDadosFirestoreV538=x=>x;window.rawCommitCalls=0;window.rawSetDocV538=()=>{throw Error('offline network write')};window.rawDeleteDocOffline=()=>{throw Error('offline network delete')};window.rawWriteBatchV538=()=>({set(){},delete(){},update(){},commit(){rawCommitCalls++;return new Promise(()=>{})}});window.empresaV456='A';window.boundV456={uid:'U'};auth.currentUser={uid:'U'};window.readyV456=true;window.authV456=auth;window.permitidasV456=new Set(['sm2_madeiras']);window.rawDocV456=(database,...path)=>({path:path.join('/')});window.rawCollectionV456=()=>{};}''')
 page.evaluate('() => {'+scope+queue+wrappers+sync+''';window.replay=sincronizarOfflineOps;window.queue=offlineOps;window.makeDoc=id=>doc(db,'sm2_madeiras',id);window.makeBatch=()=>writeBatch(db);window.write=setDoc;window.remove=deleteDoc;}''')
 page.evaluate("async()=>{const batch=makeBatch();batch.set(makeDoc('cedro'),{nome:'Cedrinho',preco:10});batch.set(makeDoc('cedro'),{preco:20},{merge:true});batch.delete(makeDoc('old'));await batch.commit()}")
 ops=page.evaluate('queue()');assert len(ops)==2
 assert ops[0]['obj']=={'nome':'Cedrinho','preco':20} and ops[0]['modo']=='set'
 assert ops[1]['modo']=='delete' and page.evaluate('rawCommitCalls')==0
 page.evaluate("write(makeDoc('pinus'),{nome:'Pinus'})")
 assert len(page.evaluate('queue()'))==3
 assert page.evaluate("async()=>{try{const b=makeBatch();b.set({path:'empresas/B/dados/sm2_madeiras/registros/x'},{nome:'x'});await b.commit();return false}catch{return true}}")
 assert len(page.evaluate('queue()'))==3
 assert json.loads(page.evaluate('mem.queue'))==page.evaluate('queue()')
 # Replay the same queue after reconnecting; only acknowledged revisions disappear.
 context.set_offline(False)
 page.evaluate("() => {window.server={};window.COL={madeiras:'sm2_madeiras'};window.erroCadastroSyncV457='';window.dadosEscutadosV428=new Map();window.agendarAplicacaoV428=()=>{};window.getDocsFromServer=async()=>({});window.rawSetDocV538=async(ref,obj)=>{server[ref.path]=obj};window.rawDeleteDocOffline=async ref=>{delete server[ref.path]};}")
 page.evaluate('replay()')
 assert page.evaluate('queue()')==[]
 assert page.evaluate("server['empresas/A/dados/sm2_madeiras/registros/cedro']")=={'nome':'Cedrinho','preco':20}
 assert page.evaluate("server['empresas/A/dados/sm2_madeiras/registros/pinus']")=={'nome':'Pinus'}

 browser.close()
print('PASS: cached session/company validation, rejects missing/inactive/wrong memberships, online denial never bypassed, offline batch returns immediately, durable scoped operations and merged updates')
