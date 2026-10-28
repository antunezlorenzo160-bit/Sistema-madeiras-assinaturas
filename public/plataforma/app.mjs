import {createCompanyManagement} from './company-management.mjs';
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
async function api(data,{fresh=false}={}){
  const user=auth.currentUser;
  if(!user)throw Error('Entre com sua conta para continuar.');
  const controller=new AbortController();
  return withDeadline(async()=>{
    const token=await user.getIdToken();
    const response=await fetch('/.netlify/functions/platform-admin'+(!data&&fresh?'?refresh=1':''),{method:data?'POST':'GET',headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:controller.signal});
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
  $('subscription-simulation').hidden=true;
  $('total-companies').textContent=state.companies.length;
  const active=state.subscriptions.filter(s=>s.status==='active');$('total-active').textContent=active.length;
  $('total-monthly').textContent=money(Math.round(active.reduce((sum,s)=>{const p=state.plans.find(p=>p.id===s.planId);return sum+(p?(p.interval==='yearly'?p.amountCents/12:p.amountCents):0);},0)));
  companyManagement.render(state);
  list('plans-list',state.plans,(host,p)=>record(host,p.name,p.interval==='monthly'?'Mensal':'Anual',money(p.amountCents)));
  const labels={trial:'Em teste',active:'Ativa',past_due:'Pendente',canceled:'Cancelada'};
  list('subscriptions-list',state.subscriptions,(host,s)=>record(host,state.companies.find(c=>c.id===s.empresaId)?.name||s.empresaId,s.status==='trial'?companyManagement.trialLabel(s):state.plans.find(p=>p.id===s.planId)?.name||'Sem plano',(labels[s.status]||s.status)+(s.testPayment?.status==='approved'?' • Pagamento de teste validado':'')));
  for(const [id,items]of [['subscription-company',state.companies],['subscription-plan',state.plans],['charge-company',state.companies]]){
    const select=$(id),current=select.value;select.replaceChildren(new Option('Selecione…',''));
    items.forEach(item=>select.add(new Option(item.name,item.id)));select.value=current;
  }
  $('webhook-status').textContent=state.webhookConfigured?'Notificações automáticas configuradas. Novas aprovações de teste serão validadas pelo servidor. Atualize a lista para consultar.':'Confirmação automática aguardando configuração do webhook. Use Conferir pagamento de teste para consultar uma cobrança.';
  $('charge-submit').disabled=!state.testConfigured;
  $('payment-connection').textContent=state.testConfigured?'Credencial de teste cadastrada. O próximo checkout valida a conexão.':'Configure as credenciais de teste no servidor para habilitar.';
  $('provider-status').textContent=state.testConfigured?'Somente testes':'Aguardando conexão';
  $('provider-text').textContent=state.testConfigured?'Ambiente de testes. Cobranças reais permanecem desativadas.':'Conexão ainda não configurada. Nenhuma cobrança real será feita nesta prévia.';
  list('charges-list',[...(state.charges||[])].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)),(host,c)=>{
    record(host,money(c.amountCents),c.status==='test_payment_approved'?'Pagamento de teste aprovado e validado no Mercado Pago.':'Checkout de teste criado. Pagamento ainda não confirmado na plataforma.');
    if(c.status!=='test_payment_approved'){
      const verify=document.createElement('button');verify.type='button';verify.className='secondary';verify.textContent='Conferir pagamento de teste';
      verify.onclick=async()=>{verify.disabled=true;status('Consultando pagamento no Mercado Pago…');
        try{const result=await api({action:'charge.verify',chargeId:c.id});await refresh(true);
          const labels={approved:'Pagamento de teste aprovado e validado. O teste gratuito e o acesso continuam como estão.',not_found:'Pagamento ainda não encontrado. Se acabou de pagar, aguarde e confira novamente.',pending:'Pagamento de teste pendente.',in_process:'Pagamento de teste em análise.',rejected:'Pagamento de teste recusado.',cancelled:'Pagamento de teste cancelado.',refunded:'Pagamento de teste estornado.',charged_back:'Pagamento de teste contestado.'};
          status(labels[result.status]||'O pagamento ainda não foi aprovado.');
        }catch(error){status(error.message,true);}finally{verify.disabled=false;}
      };host.append(verify);
    }
    const identity=document.createElement('p');identity.textContent='Criado em: '+(c.createdAt?new Date(c.createdAt).toLocaleString('pt-BR'):'Data não registrada')+' • Operação: '+(c.paymentId||'Ainda não registrada');host.append(identity);
    const inspect=document.createElement('button');inspect.type='button';inspect.className='secondary';inspect.textContent='Ver configuração do checkout';
    const diagnostic=document.createElement('p');diagnostic.hidden=true;diagnostic.style.whiteSpace='pre-line';
    inspect.onclick=async()=>{inspect.disabled=true;try{
      const d=await api({action:'charge.inspect',chargeId:c.id});
      diagnostic.textContent=['Vendedor: '+d.sellerId,'Conta vendedora de teste: '+(d.testSeller?'Sim':'Credencial de teste'),'Aplicação usada no checkout: '+(d.applicationId||'Não informada pelo provedor'),'URL de notificação: '+(d.notificationUrl||'Não registrada neste checkout'),'Preferência: '+d.preferenceId].join('\n');diagnostic.hidden=false;
    }catch(error){status(error.message,true);}finally{inspect.disabled=false;}};host.append(inspect,diagnostic);
    try{const url=new URL(c.url);if(url.protocol==='https:'&&/^(?:[a-z0-9-]+\.)*mercadopago\.(com|com\.br)$/.test(url.hostname)){const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Abrir checkout de teste ↗';host.append(link);}}catch{}
  });
  const wm=state.watermark;$('wm-width').value=wm.widthMm;$('wm-opacity').value=Math.round(wm.opacity*100);image=wm.image||'';preview();
}
async function refresh(fresh=false){state=await api(undefined,{fresh});render();}
const companyManagement=createCompanyManagement({document,api,onChange:()=>refresh(true),status});
$('companies-refresh').onclick=async()=>{const b=$('companies-refresh');b.disabled=true;try{await refresh(true);status('Lista de empresas atualizada.');}catch(error){status(error.message,true);}finally{b.disabled=false;}};
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
$('subscription-simulate').onclick=()=>{
  const box=$('subscription-simulation');box.hidden=true;
  const company=state.companies.find(c=>c.id===$('subscription-company').value);
  const plan=state.plans.find(p=>p.id===$('subscription-plan').value);
  if(!company||!plan){status('Selecione a empresa e o plano para simular.',true);return;}
  if(plan.active===false||!Number.isSafeInteger(plan.amountCents)||plan.amountCents<0||!['monthly','yearly'].includes(plan.interval)){
    status('Este plano está indisponível. Escolha outro plano.',true);return;
  }
  const subscription=state.subscriptions.find(s=>s.empresaId===company.id);
  const current=subscription?.status==='trial'?companyManagement.trialLabel(subscription):
    ({active:'Assinatura ativa',past_due:'Assinatura pendente',canceled:'Assinatura cancelada'}[subscription?.status]||'Sem assinatura cadastrada');
  $('subscription-simulation-summary').textContent=[
    'Empresa: '+company.name,
    'Plano: '+plan.name,
    'Valor: '+money(plan.amountCents)+(plan.interval==='yearly'?' por ano':' por mês'),
    'Situação atual: '+current,
    'Renovação automática: desativada nesta prévia.'
  ].join('\n');
  box.hidden=false;status('Simulação pronta. Nenhuma alteração foi salva.');
};
$('subscription-form').addEventListener('change',()=>{$('subscription-simulation').hidden=true;});
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
 try{const result=await api({action:'invitation.create',name:f.get('name'),email:f.get('email')});const inviteUrl=new URL('/cadastro/',location.origin);inviteUrl.hash=new URL(result.url).hash;$('invite-url').value=inviteUrl.href;$('invite-result').hidden=false;$('invite-copy-status').textContent='';status('Convite pronto. Copie e envie ao responsável.');}
 catch(error){status(error.message,true);}finally{button.disabled=false;}
};
$('invite-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('invite-url').value);$('invite-copy-status').textContent='Link copiado.';}catch{$('invite-url').focus();$('invite-url').select();$('invite-copy-status').textContent='Selecione e copie o link acima.';}};
