(() => {
 let policy=null,timer=null,stopWatch=null,session=null;
 const state=()=>billingAccessState(policy);
 window.__smGetAccessPolicy=()=>policy;
 window.__smAccessState=state;
 window.__smExigirEscrita=()=>{if(!state().write)throw Object.assign(new Error('Plano vencido: somente consultas e exportações estão disponíveis. Acesse Configurações → Planos para renovar.'),{code:'billing/read-only'});};
 function restricted(){
  if(!session)return;
  const workspace=document.getElementById('workspace'),login=document.getElementById('login');
  if(workspace)workspace.hidden=true;if(login)login.hidden=true;
  let page=document.getElementById('billing-settings-only');
  if(!page){page=document.createElement('main');page.id='billing-settings-only';page.style.cssText='max-width:700px;margin:20px auto;padding:24px;background:#172b20;color:#fff;border-radius:12px';
   const title=document.createElement('h1');title.textContent='Configurações';
   const text=document.createElement('p');text.textContent='Seu plano venceu e o prazo de consultas terminou. Os dados continuam guardados. Para voltar a usar o sistema, escolha um plano.';
   const plans=document.createElement('a');plans.href='/contratacao/';plans.textContent='Acessar Planos e renovar';plans.style.cssText='display:inline-block;padding:14px;background:#e5b347;color:#152319;border-radius:8px;margin:12px 0';
   const exit=document.createElement('button');exit.textContent='Sair da conta';exit.onclick=()=>{const button=document.getElementById('sair');if(button){button.disabled=false;button.click();}};page.append(title,text,plans,document.createElement('br'),exit);document.body.append(page);
  }
  document.querySelector('#holder iframe')?.contentWindow?.__smPausarPorPlano?.();
 }
 function apply(){
  clearTimeout(timer);const current=state();
  if(session){
   try{const key='sm_vinculo_confirmado_offline_v1:'+session.uid,record=JSON.parse(localStorage.getItem(key)||'null');if(record?.uid===session.uid&&record.empresaId===session.empresaId)localStorage.setItem(key,JSON.stringify({...record,planoAcesso:policy}));}catch{}
   if(current.phase==='settings')restricted();
   else if(document.getElementById('billing-settings-only')){window.location.reload();return;}
  }
  window.dispatchEvent(new CustomEvent('sm-access-policy',{detail:current}));
  const future=[policy?.endsAt,policy?.graceEndsAt,policy?.consultEndsAt].filter(value=>Number.isFinite(value)&&value>Date.now());
  if(future.length)timer=setTimeout(apply,Math.min(86400000,Math.max(50,Math.min(...future)-Date.now()+10)));
 }
 window.__smSetAccessPolicy=value=>{policy=value&&typeof value==='object'?value:null;apply();};
 window.__smRenderRestricted=restricted;
 window.__smBeginAccessSession=({uid,empresaId,sdk,db})=>{
  stopWatch?.();session={uid,empresaId};
  stopWatch=sdk.onSnapshot(sdk.doc(db,'empresas',empresaId,'acesso','plano'),snapshot=>{
   if(snapshot.metadata?.hasPendingWrites)return;
   if(snapshot.metadata?.fromCache&&!snapshot.exists())return;
   window.__smSetAccessPolicy(snapshot.exists()?snapshot.data():null);
  },()=>{});apply();
 };
 window.__smStopAccessSession=()=>{stopWatch?.();stopWatch=null;session=null;clearTimeout(timer);document.getElementById('billing-settings-only')?.remove();};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply();});
})();
