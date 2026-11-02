export function createIndexedDBLoadJournal(factory,scope){
 if(!factory||typeof scope!=='string'||!scope)throw Error('O navegador não disponibilizou o armazenamento de recuperação. Preserve os dados e solicite suporte.');
 let connection;
 const open=()=>connection||(connection=new Promise((resolve,reject)=>{
  const request=factory.open('sm-load-deduction-recovery-v2',1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('journals'))request.result.createObjectStore('journals');};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>{connection=null;reject(request.error||Error('Não foi possível abrir a recuperação local.'));};
  request.onblocked=()=>{connection=null;reject(Error('A recuperação local está bloqueada por outra aba. Feche apenas as outras abas do sistema e tente novamente.'));};
 }));
 async function operation(mode,kind,value){
  const db=await open();return new Promise((resolve,reject)=>{
   let transaction;try{transaction=db.transaction('journals',mode,{durability:'strict'});}catch{transaction=db.transaction('journals',mode);}
   const store=transaction.objectStore('journals');
   const request=kind==='get'?store.get(scope):kind==='put'?store.add(value,scope):store.delete(scope);
   let result;
   request.onsuccess=()=>{result=request.result;};
   transaction.oncomplete=()=>resolve(result??null);
   transaction.onabort=()=>reject(transaction.error||request.error||Error('A gravação de recuperação foi interrompida.'));
   transaction.onerror=()=>{};
  });
 }
 return {get:()=>operation('readonly','get'),put:value=>operation('readwrite','put',value),remove:()=>operation('readwrite','delete')};
}
export function createLoadDeductionJournal(storage,{journalStore}={}){
 if(!journalStore)throw Error('O armazenamento durável da recuperação não foi configurado.');
 const legacyKey='sm_load_deduction_journal_v1';
 function validate(pending){
  if(![1,2].includes(pending?.version)||!Array.isArray(pending.entries)||pending.entries.some(e=>!Array.isArray(e)||e.length!==2||typeof e[0]!=='string'||typeof e[1]!=='string'||e[0]===legacyKey))throw Error('Registro de recuperação da baixa inválido. Preserve os dados deste navegador e solicite suporte.');
  return pending;
 }
 let busy=false;
 async function replay(){
  const legacy=storage.getItem(legacyKey);
  if(legacy!==null){
   const previous=await journalStore.get();
   if(previous)throw Error('Há duas recuperações pendentes. Preserve os dados e solicite suporte.');
   await journalStore.put(validate(JSON.parse(legacy)));
   storage.removeItem(legacyKey);
  }
  const pending=await journalStore.get();if(!pending)return false;
  validate(pending);
  for(const [key,value]of pending.entries)storage.setItem(key,value);
  await journalStore.remove();return true;
 }
 async function exclusive(task){
  if(busy)throw Error('Aguarde a gravação da operação em andamento.');
  busy=true;try{return await task();}finally{busy=false;}
 }
 return {
  recover:()=>exclusive(replay),
  commit:entries=>exclusive(async()=>{
   await replay();const pending=validate({version:2,entries});
   await journalStore.put(pending);
   // Keep the durable journal until every local projection is written.
   for(const [key,value]of pending.entries)storage.setItem(key,value);
   await journalStore.remove();
  }),
  get busy(){return busy;}
 };
}
export function mergeLoadDeductionQueue(previous,operations,now,newId){
 const result=new Map(previous.map(op=>[op.chave,op]));
 for(const op of operations){
  const chave=String(op.nome)+'|'+String(op.id),old=result.get(chave);
  let obj=op.obj,modo=op.modo;
  if(modo==='merge'&&old&&['set','merge'].includes(old.modo)){obj={...old.obj,...obj};modo=old.modo;}
  result.set(chave,{chave,nome:op.nome,id:op.id,obj,modo,criadoEm:now,revisao:newId()});
 }
 return [...result.values()];
}
