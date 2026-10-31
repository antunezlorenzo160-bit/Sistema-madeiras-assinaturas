(() => {
 let member=null,memberUid=null;
 window.__smEmployeeMember=()=>member;
 window.__smEmployeeCan=(area,write=false)=>employeeCan(member,area,write);
 window.__smEmployeeCollectionCan=(name,write=false)=>employeeCollectionCan(member,name,write);
 window.__smSetEmployeeMember=(data,uid)=>{
  const previous=member;
  member=data&&typeof data==='object'?JSON.parse(JSON.stringify(data)):null;memberUid=uid;
  const signature=m=>JSON.stringify([m?.ativo,m?.empresaId,m?.papel,m?.permissionsVersion,m?.permissoes,m?.permissionsRevision]);
  try{const key='sm_vinculo_confirmado_offline_v1:'+uid,record=JSON.parse(localStorage.getItem(key)||'null');if(record?.uid===uid&&record.empresaId===member?.empresaId)localStorage.setItem(key,JSON.stringify({...record,employeeMember:member}));}catch{}
  if(previous&&signature(previous)!==signature(member)&&document.querySelector('#holder iframe')){
   document.querySelector('#holder iframe').hidden=true;
   window.location.reload();
  }
 };
 window.__smEmployeeStorageValue=(key,value)=>{
  if(!window.__smEmployeeStorageAllowed(key))return null;
  if(member?.papel!=='admin'&&key==='lancamentos_db_v1'){try{return JSON.stringify(JSON.parse(value||'[]').filter(x=>employeeCan(member,({orcamento:'budgets',carga:'loads',estoque1:'stock',estoque2:'stock',transferencia:'stock',plaina:'stock'})[x.destino]||'calculator')));}catch{return null;}}
  return value;
 };
 window.__smEmployeeStorageAllowed=key=>{
  if(member?.papel==='admin')return true;
  const map={madeiras_db_v1:'catalog',clientes:'clients',orcamento_db_v1:'budgets',orcamentos_guardados_v1:'budgets',orcamento_cliente_v1:'budgets',movimentos_db_v1:'stock',estoque1_lancamentos_v1:'stock',estoque2_lancamentos_v1:'stock',carregamentos_lancamentos_v1:'loads',sm2_movimentos:'stock'};
  for(const [prefix,area] of Object.entries(map))if(String(key).startsWith(prefix))return employeeCan(member,area);
  if(/cubagem_toras|servicos/.test(key))return employeeCan(member,'services');
  if(/lancamentos|resumo|contador|pacotes|base_total_topo/.test(key))return employeeCan(member,'calculator');
  return true;
 };
})();
