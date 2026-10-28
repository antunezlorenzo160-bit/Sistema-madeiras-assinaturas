import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {initializeAuth,browserLocalPersistence,inMemoryPersistence,onAuthStateChanged,signInWithEmailAndPassword,signOut,sendPasswordResetEmail} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const app=initializeApp({apiKey:'AIzaSyBQ1_mmY0mP8mdbonbmWLVv6VaDXuzHZkU',authDomain:'estoque-madeiras-cc4d7.firebaseapp.com',projectId:'estoque-madeiras-cc4d7',appId:'1:201851719270:web:8d71d7f6862d7c4709a7a7'},'sm-madeiras-login');
const auth=initializeAuth(app,{persistence:[browserLocalPersistence,inMemoryPersistence]}),$=id=>document.getElementById(id);
let state=null,busy=false;
const money=value=>(value/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function message(text){$('status').textContent=text;}
async function api(data){
 const user=auth.currentUser;if(!user)throw Error('Entre com sua conta para continuar.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{const token=await user.getIdToken();const response=await fetch('/.netlify/functions/company-contract',{cache:'no-store',method:data?'POST':'GET',headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:controller.signal});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível consultar os planos.');
  if(auth.currentUser?.uid!==user.uid)throw Error('A conta foi alterada. Entre novamente.');return result;
 }catch(error){if(error.name==='AbortError')throw Error('A conexão demorou. Tente novamente.');throw error;}finally{clearTimeout(timer);}
}
function showRequest(request){
 $('request-card').hidden=!request;if(!request)return;
 $('request-summary').textContent=[request.planName,money(request.amountCents)+(request.interval==='yearly'?' por ano, pago de uma vez':' por mês'),'Renovação desejada: '+(request.renewalPreference==='automatic'?'automática, ainda sem autorização de débito':'manual'),'Valor registrado na solicitação de: '+new Date(request.requestedAt).toLocaleString('pt-BR')].join('\n');
}
function describe(){
 const plan=state?.offers.find(p=>p.id===$('plan').value);
 const monthly=state?.offers.find(p=>p.interval==='monthly');
 const saving=plan?.interval==='yearly'&&monthly?monthly.amountCents*12-plan.amountCents:0;
 $('plan-description').textContent=plan?(plan.amountCents===0?'Gratuito neste valor. Não há pagamento a realizar no Mercado Pago.':plan.interval==='yearly'?money(plan.amountCents)+' pagos de uma vez pelos 12 meses. Não é parcelamento mensal.'+(saving>0?' Economia de '+money(saving)+' comparada a 12 mensalidades de '+money(monthly.amountCents)+'.':''):money(plan.amountCents)+' por mês.'):'Nenhum plano disponível. Entre em contato com a plataforma.';
 $('request-submit').disabled=!plan;$('acknowledge').checked=false;
 $('renewal-description').textContent=$('renewal').value==='automatic'?'Preferência de renovação automática para o futuro. Nenhum débito será agendado nesta prévia.':'Você decide se deseja pagar novamente a cada '+(plan?.interval==='yearly'?'ano.':'mês.');
}
function showPeriod(period){
 $('period-card').hidden=!period;
 $('choice-card').hidden=Boolean(period?.active&&!period.renewalOpen);
 if(!period)return;
 const date=value=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
 $('period-summary').textContent=[period.planName,'Valor garantido: '+money(period.amountCents)+(period.interval==='yearly'?' pelos 12 meses':' pelo mês'),'Início: '+date(period.startsAt),'Válido até: '+date(period.endsAt)].join('\n');
 $('period-renewal').textContent=!period.renewalOpen?'O período está vigente. A revisão do plano será exibida perto da renovação, sem alterar o preço atual.':
  period.priceChanged?'Seu período '+(period.expired?'venceu':'termina')+' em '+date(period.endsAt)+'. Para renovar, confira o novo valor: '+money(period.nextTerms.amountCents)+(period.nextTerms.interval==='yearly'?' por ano.':' por mês.')+' O novo valor só vale para o próximo período. Nenhum débito será feito automaticamente nesta prévia.':
  period.expired?'O período de teste registrado venceu. Você pode revisar o plano para simular a renovação. Seu acesso gratuito não foi bloqueado.':'Seu período está perto do vencimento. Você pode revisar o plano para a próxima renovação.';
}
async function load(){
 message('Consultando planos…');const result=await api();
 state=result;
 $('login').hidden=true;$('contract').hidden=false;$('company-name').textContent=result.company.name;
 $('catalog-notice').textContent=result.offers.length?'Preços atuais consultados na plataforma.':'Nenhum plano ativo com preço válido está disponível. Confira o cadastro dos planos na administração.';
 $('plan').replaceChildren();
 if(!result.offers.length){const empty=new Option('Nenhum plano disponível','');empty.disabled=true;$('plan').add(empty);}
 for(const plan of result.offers)$('plan').add(new Option(plan.name+' — '+money(plan.amountCents)+(plan.interval==='yearly'?' por ano':' por mês'),plan.id));
 describe();showPeriod(result.currentPeriod);showRequest(result.request);message('');
}
async function run(task){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await task();}catch(error){message(error.code?'Não foi possível entrar. Confira o e-mail e a senha.':error.message);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);if(state)$('request-submit').disabled=!state.offers.length;}}
function showPassword(visible){
 $('password').type=visible?'text':'password';
 $('toggle-password').setAttribute('aria-label',visible?'Ocultar senha':'Mostrar senha');
 $('toggle-password').setAttribute('aria-pressed',String(visible));
 $('password-slash').hidden=!visible;
}
$('toggle-password').addEventListener('pointerdown',event=>event.preventDefault());
$('toggle-password').onclick=()=>{
 const field=$('password'),position=field.selectionStart;showPassword(field.type==='password');
 field.focus({preventScroll:true});if(position!==null)try{field.setSelectionRange(position,position);}catch{}
};
$('forgot-password').onclick=()=>run(async()=>{
 const email=$('email').value.trim();
 if(!email||!$('email').validity.valid){message('Informe um e-mail válido no campo E-mail para recuperar sua senha.');$('email').focus();return;}
 if(!navigator.onLine){message('Conecte-se à internet para recuperar sua senha.');return;}
 message('Solicitando recuperação de senha…');
 const success='Se houver uma conta com este e-mail, você receberá um link para criar uma nova senha. Confira também a caixa de spam. Sua senha atual só muda se você concluir a redefinição.';
 try{auth.languageCode='pt-BR';await sendPasswordResetEmail(auth,email);message(success);}
 catch(error){message(error.code==='auth/user-not-found'?success:({'auth/invalid-email':'Confira o e-mail informado.','auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.','auth/network-request-failed':'Não foi possível conectar. Confira a internet e tente novamente.'}[error.code]||'Não foi possível solicitar a recuperação. Tente novamente mais tarde.'));}
});
$('login-form').onsubmit=event=>{event.preventDefault();run(async()=>{const password=$('password').value;$('password').value='';showPassword(false);await signInWithEmailAndPassword(auth,$('email').value.trim(),password);});};
onAuthStateChanged(auth,user=>{state=null;$('contract').hidden=true;$('login').hidden=false;if(user)load().catch(error=>message(error.message));else message('');});
$('contract-form').onsubmit=event=>{event.preventDefault();run(async()=>{
 const plan=state?.offers.find(p=>p.id===$('plan').value);if(!plan||!$('acknowledge').checked)throw Error('Confira o plano e marque a confirmação da simulação.');
 const result=await api({planId:plan.id,expectedAmountCents:plan.amountCents,expectedInterval:plan.interval,revision:plan.revision,renewalPreference:$('renewal').value,simulationOnly:true});
 showRequest(result.request);message('Solicitação de teste registrada. Nenhuma cobrança ou alteração no seu acesso foi realizada.');
});};
$('plan').onchange=describe;$('renewal').onchange=describe;
$('reload').onclick=()=>run(load);$('logout').onclick=()=>run(()=>signOut(auth));
