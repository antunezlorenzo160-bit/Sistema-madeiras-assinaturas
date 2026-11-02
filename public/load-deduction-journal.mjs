export function createLoadDeductionJournal(storage){
 const key='sm_load_deduction_journal_v1';
 function recover(){
  const raw=storage.getItem(key);if(raw===null)return false;
  const pending=JSON.parse(raw);
  if(pending?.version!==1||!Array.isArray(pending.entries)||pending.entries.some(e=>!Array.isArray(e)||e.length!==2||typeof e[0]!=='string'||typeof e[1]!=='string'||e[0]===key))throw Error('Registro de recuperação da baixa inválido. Preserve os dados deste navegador e solicite suporte.');
  for(const [name,value]of pending.entries)storage.setItem(name,value);
  storage.removeItem(key);return true;
 }
 function commit(entries){
  recover();
  storage.setItem(key,JSON.stringify({version:1,entries}));
  recover();
 }
 return {recover,commit};
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
