(() => {
 let member=null,memberUid=null,companyRoleContext=null;
 window.__smGetCompanyRoleContext=()=>companyRoleContext;
 window.__smClearEmployeeSession=()=>{member=null;memberUid=null;companyRoleContext=null;};
 window.__smSetCompanyRoleContext=(value,uid,empresaId)=>{
  if(!value||value.uid!==uid||value.empresaId!==empresaId||typeof value.isCompanyOwner!=='boolean')throw Error('Perfil de acesso não corresponde à sessão.');
  companyRoleContext=Object.freeze({...value});
 };
 window.__smResolveCompanyMember=async(data,uid)=>{
  if(!data||data.ativo!==true)throw Error('Vínculo inativo.');
  if(companyRoleContext&&(companyRoleContext.uid!==uid||companyRoleContext.empresaId!==data.empresaId))companyRoleContext=null;
  if(data.papel==='employee')return data;
  if(!companyRoleContext){try{const saved=JSON.parse(localStorage.getItem('sm_vinculo_confirmado_offline_v1:'+uid)||'null');if(saved?.uid===uid&&saved.empresaId===data.empresaId&&saved.ativo===true&&!saved.bloqueado&&saved.companyRoleContext)window.__smSetCompanyRoleContext(saved.companyRoleContext,uid,data.empresaId);}catch{}}
  const runtime=window.__v470Runtime();
  if(runtime.auth.currentUser?.uid!==uid)throw Error('Sessão alterada. Entre novamente.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetch('/.netlify/functions/company-session',{headers:{Authorization:'Bearer '+await runtime.auth.currentUser.getIdToken()},cache:'no-store',signal:controller.signal});
   const result=await response.json();
   if(!response.ok)throw Object.assign(Error(result.error||'Não foi possível confirmar seu perfil.'),{code:response.status>=500?'unavailable':response.status===401?'unauthenticated':'permission-denied'});
   if(result.uid!==uid||result.empresaId!==data.empresaId||result.member?.empresaId!==data.empresaId||result.member?.ativo!==true||runtime.auth.currentUser?.uid!==uid)throw Error('Perfil de outra sessão. Entre novamente.');
   window.__smSetCompanyRoleContext(result.roleContext,uid,data.empresaId);
   return result.member;
  }catch(error){
   const transient=error.name==='AbortError'||error instanceof TypeError||error instanceof SyntaxError||error.code==='unavailable';
   if(transient&&companyRoleContext?.uid===uid&&companyRoleContext.empresaId===data.empresaId)return data;
   if(transient)error.code='unavailable';
   throw error;
  }finally{clearTimeout(timer);}
 };
 window.__smEmployeeMember=()=>member;
 window.__smEmployeeCan=(area,write=false)=>employeeCan(member,area,write);
 window.__smEmployeeCollectionCan=(name,write=false)=>employeeCollectionCan(member,name,write);
 window.__smSetEmployeeMember=(data,uid)=>{
  const previous=member;
  if(companyRoleContext&&(companyRoleContext.uid!==uid||companyRoleContext.empresaId!==data?.empresaId))companyRoleContext=null;
  member=data&&typeof data==='object'?JSON.parse(JSON.stringify(data)):null;memberUid=uid;
  if(member&&companyRoleContext?.uid===uid&&companyRoleContext.empresaId===member.empresaId){
   member.papel=companyRoleContext.isCompanyOwner?'admin':member.papel==='admin'?'employee':member.papel;
   member.nome=member.nome||companyRoleContext.name;member.email=member.email||companyRoleContext.email;
  }
  const signature=m=>JSON.stringify([m?.ativo,m?.empresaId,m?.papel,m?.permissionsVersion,m?.permissoes,m?.permissionsRevision]);
  try{const key='sm_vinculo_confirmado_offline_v1:'+uid,record=JSON.parse(localStorage.getItem(key)||'null');if(record?.uid===uid&&record.empresaId===member?.empresaId)localStorage.setItem(key,JSON.stringify({...record,employeeMember:member,companyRoleContext:companyRoleContext}));}catch{}
  if(previous&&signature(previous)!==signature(member)&&document.querySelector('#holder iframe')){
   document.querySelector('#holder iframe').hidden=true;
   window.location.reload();
  }
 };
 window.__smEmployeeStorageValue=(key,value)=>{
  if(!window.__smEmployeeStorageAllowed(key))return null;
  if(member?.papel!=='admin'&&key==='carregamentos_lancamentos_v1'){try{return JSON.stringify(JSON.parse(value||'[]').filter(isLoadDraft));}catch{return null;}}
  if(member?.papel!=='admin'&&key==='lancamentos_db_v1'){try{return JSON.stringify(JSON.parse(value||'[]').filter(x=>(x.destino!=='carga'||isLoadDraft(x))&&employeeCan(member,({orcamento:'budgets',carga:'loads',estoque1:'stock',estoque2:'stock',transferencia:'stock',plaina:'stock'})[x.destino]||'calculator')));}catch{return null;}}
  return value;
 };
 window.__smEmployeeStorageAllowed=key=>{
  if(member?.papel==='admin')return true;
  const map={madeiras_db_v1:'catalog',clientes:'clients',orcamento_db_v1:'budgets',orcamentos_guardados_v1:'orders',orcamento_cliente_v1:'budgets',movimentos_db_v1:'stock',estoque1_lancamentos_v1:'stock',estoque2_lancamentos_v1:'stock',carregamentos_lancamentos_v1:'loads',sm2_movimentos:'stock'};
  if(key==='madeiras_db_v1')return employeeCollectionCan(member,'sm2_madeiras');
  for(const [prefix,area] of Object.entries(map))if(String(key).startsWith(prefix))return employeeCan(member,area);
  if(/cubagem_toras|servicos/.test(key))return employeeCan(member,'services');
  if(/lancamentos|resumo|contador|pacotes|base_total_topo/.test(key))return employeeCan(member,'calculator');
  return true;
 };
})();
