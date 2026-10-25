import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { initializeAuth, browserLocalPersistence, inMemoryPersistence, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';

const app=initializeApp({apiKey:'AIzaSyBQ1_mmY0mP8mdbonbmWLVv6VaDXuzHZkU',authDomain:'estoque-madeiras-cc4d7.firebaseapp.com',projectId:'estoque-madeiras-cc4d7',appId:'1:201851719270:web:8d71d7f6862d7c4709a7a7'},'sm-madeiras-login');
const auth=initializeAuth(app,{persistence:[browserLocalPersistence,inMemoryPersistence]}),$=id=>document.getElementById(id);
let state={plans:[],companies:[],subscriptions:[]},image='';
const money=v=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function withDeadline(task, milliseconds=20000, onTimeout=()=>{}){
  let timer;
  const timeout=new Promise((resolve,reject)=>{timer=setTimeout(()=>{onTimeout();reject(Error('A verificação demorou demais. Confira a conexão e tente entrar novamente.'));},milliseconds);});
  return Promise.race([Promise.resolve().then(task),timeout]).finally(()=>clearTimeout(timer));
}
async function api(data){
  const user=auth.currentUser;
  if(!user)throw Error('Entre com sua conta para continuar.');
  const controller=new AbortController();
  return withDeadline(async()=>{
    const token=await user.getIdToken();
    const response=await fetch('/.netlify/functions/platform-admin',{method:data?'POST':'GET',headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:controller.signal});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(result.error||'Não foi possível acessar a plataforma.');
    return result;
  },20000,()=>controller.abort());
}

function record(host,title,detail,value){
  const row=document.createElement('div');row.className='record';
  const text=document.createElement('div'),name=document.createElement('strong'),small=document.createElement('small');
  name.textContent=title;small.textContent=detail;text.append(name,small);row.append(text);
  if(value){const extra=document.createElement('span');extra.textContent=value;row.append(extra);}host.append(row);
}
function list(id,items,render){const host=$(id);host.replaceChildren();if(!items.length){const p=document.createElement('p');p.textContent='Nenhum cadastro por enquanto.';host.append(p);}else items.forEach(item=>render(host,item));}
function preview(){
  $('wm-preview').hidden=!image;$('wm-default').hidden=!!image;$('wm-preview').src=image;
  $('wm-preview').style.opacity=String(Number($('wm-opacity').value)/100);
  $('wm-preview').style.width=Math.round(Number($('wm-width').value)/210*100)+'%';
}
function render(){
  $('total-companies').textContent=state.companies.length;
  const active=state.subscriptions.filter(s=>s.status==='active');$('total-active').textContent=active.length;
  $('total-monthly').textContent=money(Math.round(active.reduce((sum,s)=>{const p=state.plans.find(p=>p.id===s.planId);return sum+(p?(p.interval==='yearly'?p.amountCents/12:p.amountCents):0);},0)));
  list('companies-list',state.companies,(host,c)=>record(host,c.name,c.empresaId));
  list('plans-list',state.plans,(host,p)=>record(host,p.name,p.interval==='monthly'?'Mensal':'Anual',money(p.amountCents)));
  const labels={trial:'Em teste',active:'Ativa',past_due:'Pendente',canceled:'Cancelada'};
  list('subscriptions-list',state.subscriptions,(host,s)=>record(host,state.companies.find(c=>c.id===s.empresaId)?.name||s.empresaId,s.trialMode==='indefinite'?'Gratuito sem prazo definido':state.plans.find(p=>p.id===s.planId)?.name||s.planId,labels[s.status]||s.status));
  for(const [id,items]of [['subscription-company',state.companies],['subscription-plan',state.plans],['charge-company',state.companies]]){
    const select=$(id),current=select.value;select.replaceChildren(new Option('Selecione…',''));
    items.forEach(item=>select.add(new Option(item.name,item.id)));select.value=current;
  }
  $('charge-submit').disabled=!state.testConfigured;
  $('payment-connection').textContent=state.testConfigured?'Credencial de teste cadastrada. O próximo checkout valida a conexão.':'Configure as credenciais de teste no servidor para habilitar.';
  $('provider-status').textContent=state.testConfigured?'Somente testes':'Aguardando conexão';
  $('provider-text').textContent=state.testConfigured?'Ambiente de testes. Cobranças reais permanecem desativadas.':'Conexão ainda não configurada. Nenhuma cobrança real será feita nesta prévia.';
  list('charges-list',state.charges||[],(host,c)=>{
    record(host,money(c.amountCents),'Checkout de teste criado. Pagamento não confirmado.');
    try{const url=new URL(c.url);if(url.protocol==='https:'&&/^(?:[a-z0-9-]+\.)*mercadopago\.(com|com\.br)$/.test(url.hostname)){const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Abrir checkout de teste ↗';host.append(link);}}catch{}
  });
  const wm=state.watermark;$('wm-width').value=wm.widthMm;$('wm-opacity').value=Math.round(wm.opacity*100);image=wm.image||'';preview();
}
async function refresh(){state=await api();render();}
function page(name){document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==name);document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));$('page-title').textContent=document.querySelector(`[data-page="${name}"]`).textContent;status('');}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>page(b.dataset.page));
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>page(b.dataset.open));
let opening=null;
function openAdministration(user){
  if(opening?.uid===user.uid)return opening.promise;
  $('app').hidden=true;$('login').hidden=false;$('verify').hidden=true;
  $('login-status').textContent='Verificando acesso…';
  const promise=(async()=>{
    try{
      // Refresh claims even when this account is already signed in on another tab.
      await withDeadline(()=>user.getIdToken(true));
      await refresh();
      if(auth.currentUser?.uid!==user.uid)return false;
      $('login').hidden=true;$('app').hidden=false;return true;
    }catch(error){
      if(auth.currentUser?.uid===user.uid){$('login-status').textContent=error.message;$('verify').hidden=user.emailVerified;}
      return false;
    }
  })().finally(()=>{if(opening?.promise===promise)opening=null;});
  opening={uid:user.uid,promise};return promise;
}
$('login-form').onsubmit=async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;$('login-status').textContent='Verificando acesso…';
  const password=$('password').value;$('password').value='';
  try{
    const credential=await withDeadline(()=>signInWithEmailAndPassword(auth,$('email').value.trim(),password));
    // Firebase need not emit another state-change event for the same user.
    await openAdministration(credential.user);
  }catch(error){$('login-status').textContent=error.code?'Não foi possível entrar. Confira sua conta e a senha.':error.message;}
  finally{button.disabled=false;}
};
onAuthStateChanged(auth,user=>{
  if(user){openAdministration(user);return;}
  $('app').hidden=true;$('login').hidden=false;$('verify').hidden=true;
});
$('verify').onclick=async()=>{try{await sendEmailVerification(auth.currentUser);$('login-status').textContent='Confirme o link recebido no seu e-mail. Depois saia e entre novamente.';}catch{$('login-status').textContent='Não foi possível enviar a confirmação. Tente novamente mais tarde.';}};
$('logout').onclick=()=>signOut(auth);
async function save(form,data){
  const button=form.querySelector('button[type=submit],button:not([type])');button.disabled=true;status('Salvando…');
  try{await api(data);await refresh();status('Alteração salva na plataforma.');return true;}catch(error){status(error.message,true);return false;}finally{button.disabled=false;}
}
$('plan-form').onsubmit=async event=>{event.preventDefault();const f=new FormData(event.target);if(await save(event.target,{action:'plan.save',name:f.get('name'),amountCents:Math.round(Number(f.get('amount'))*100),interval:f.get('interval')}))event.target.reset();};
$('company-form').onsubmit=async event=>{event.preventDefault();const f=new FormData(event.target);if(await save(event.target,{action:'company.save',empresaId:f.get('empresaId'),name:f.get('name')}))event.target.reset();};
$('subscription-form').onsubmit=async event=>{event.preventDefault();const f=new FormData(event.target);await save(event.target,{action:'subscription.save',empresaId:f.get('empresaId'),planId:f.get('planId'),status:f.get('status')});};
$('watermark-form').onsubmit=async event=>{event.preventDefault();await save(event.target,{action:'watermark.save',widthMm:Number($('wm-width').value),opacity:Number($('wm-opacity').value)/100,image});};
for(const id of ['wm-width','wm-opacity'])$(id).oninput=preview;
$('wm-reset').onclick=()=>{image='';$('wm-file').value='';preview();};
$('wm-file').onchange=()=>{
  const file=$('wm-file').files[0];if(!file)return;
  if(!['image/png','image/jpeg'].includes(file.type)||file.size>250000){status('Selecione PNG ou JPEG de até 250 KB.',true);$('wm-file').value='';return;}
  const reader=new FileReader();reader.onload=()=>{image=reader.result;preview();};reader.readAsDataURL(file);
};

$('charge-form').onsubmit=async event=>{
 event.preventDefault();const button=$('charge-submit');button.disabled=true;status('Preparando checkout de teste…');
 try{await api({action:'charge.test',empresaId:$('charge-company').value});await refresh();status('Checkout de teste criado. Abra o link na lista abaixo. Nenhum pagamento foi confirmado.');}
 catch(error){status(error.message,true);}finally{button.disabled=!state.testConfigured;}
};

$('invite-form').onsubmit=async event=>{
 event.preventDefault();const button=event.target.querySelector('button'),f=new FormData(event.target);button.disabled=true;status('Gerando convite…');
 try{const result=await api({action:'invitation.create',name:f.get('name'),email:f.get('email')});$('invite-url').value=result.url;$('invite-result').hidden=false;$('invite-copy-status').textContent='';status('Convite pronto. Copie e envie ao responsável.');}
 catch(error){status(error.message,true);}finally{button.disabled=false;}
};
$('invite-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('invite-url').value);$('invite-copy-status').textContent='Link copiado.';}catch{$('invite-url').focus();$('invite-url').select();$('invite-copy-status').textContent='Selecione e copie o link acima.';}};
