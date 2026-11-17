export const durableRecordKeysV779=['madeiras_db_v1','lancamentos_db_v1','movimentos_db_v1','orcamento_db_v1','orcamentos_guardados_v1','estoque1_lancamentos_v1','estoque2_lancamentos_v1','carregamentos_lancamentos_v1','sm_offline_ops_v1','sm_resumos_calculadora_v1'];
export async function openRecordStoreV779(factory){
 if(!factory)throw Error('O banco offline não está disponível. Preserve os dados deste navegador.');
 const db=await new Promise((resolve,reject)=>{
  const request=factory.open('sm-offline-records-v779',1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('scopes'))request.result.createObjectStore('scopes');};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('Não foi possível abrir o banco offline.'));
  request.onblocked=()=>reject(Error('O banco offline está bloqueado por outra aba. Preserve os dados.'));
 });
 function transaction(mode,scope,value){return new Promise((resolve,reject)=>{
  let tx;try{tx=db.transaction('scopes',mode,{durability:'strict'});}catch{tx=db.transaction('scopes',mode);}
  const records=tx.objectStore('scopes');let result=null,failure=null;
  if(mode==='readonly'){
   const range=typeof IDBKeyRange==='undefined'?undefined:IDBKeyRange.bound([scope,''],[scope,'\uffff']);
   const request=records.openCursor(range);
   request.onsuccess=()=>{
    const cursor=request.result;if(!cursor)return;
    if(Array.isArray(cursor.key)&&cursor.key[0]===scope){
     if(!result)result={version:1,values:{}};
     if(cursor.key[1]===''){if(cursor.value?.version!==1){failure=Error('Versão do banco offline inválida.');tx.abort();return;}}
     else if(typeof cursor.value?.value==='string')result.values[cursor.key[1]]=cursor.value.value;
     else{failure=Error('Registro do banco offline inválido.');tx.abort();return;}
    }
    cursor.continue();
   };
  }else{
   records.put({version:1},[scope,'']);
   for(const [key,entry]of Object.entries(value.values)){
    if(entry===null)records.delete([scope,key]);else records.put({value:entry},[scope,key]);
   }
  }
  tx.oncomplete=()=>resolve(result);
  tx.onabort=()=>reject(failure||tx.error||Error('A gravação no banco offline foi interrompida.'));
  tx.onerror=()=>{};
 });}

 return {read:scope=>transaction('readonly',scope),write:(scope,value)=>transaction('readwrite',scope,value)};
}
export async function createRecordStorageV779({native,base,prefix,store,decode=value=>value,project=(key,value)=>value,isBatching=()=>false,onError=()=>{},onSaved=()=>{}}){
 if(!prefix||!native||!base||!store)throw Error('Armazenamento offline sem contexto.');
 const managed=new Set(durableRecordKeysV779),saved=await store.read(prefix);
 if(saved!==null&&(saved.version!==1||!saved.values||Array.isArray(saved.values)||Object.entries(saved.values).some(([key,value])=>!managed.has(key)||typeof value!=='string')))throw Error('O banco offline contém um registro inválido. Preserve os dados.');
 const values={...(saved?.values||{})},copies=[];let migrated=false;
 for(const key of managed){
  const original=native.getItem(prefix+key);if(original===null)continue;
  const raw=decode(original);
  if(typeof raw!=='string')throw Error('Não foi possível ler o registro local '+key);
  if(Object.hasOwn(values,key)&&values[key]!==raw)throw Error('Existem versões diferentes de '+key+' em duas formas de armazenamento. Preserve os dados e solicite conferência.');
  if(!Object.hasOwn(values,key)){values[key]=raw;migrated=true;}
  copies.push([key,original]);
 }
 // A crash before this transaction completes leaves every original copy intact.
 if(migrated||saved===null)await store.write(prefix,{version:1,values:{...values}});
 // Remove only byte-identical redundant copies, after durable confirmation.
 for(const [key,original]of copies){if(native.getItem(prefix+key)!==original)throw Error('Os dados mudaram em outra aba durante a migração. Preserve as duas páginas.');}
 for(const [key]of copies)native.removeItem(prefix+key);
 let revision=0,persisted=0,inflight=null,error=null;const dirty=new Map();
 function flush(){
  if(inflight)return inflight;
  inflight=(async()=>{
   while(persisted<revision){const target=revision,snapshot={version:1,values:Object.fromEntries([...dirty].map(([key,entry])=>[key,entry.value]))};await store.write(prefix,snapshot);for(const [key,entry]of dirty)if(entry.revision<=target)dirty.delete(key);persisted=target;}
   error=null;onSaved();
  })().catch(failure=>{error=failure;onError(failure);throw failure;}).finally(()=>{inflight=null;if(!error&&persisted<revision&&!isBatching())flush().catch(()=>{});});
  return inflight;
 }
 const schedule=()=>{if(!isBatching())flush().catch(()=>{});};
 function names(){return [...new Set([...Object.keys(values),...Array.from({length:base.length},(_,index)=>base.key(index)).filter(Boolean)])];}
 return Object.freeze({
  getItem:key=>managed.has(String(key))?project(String(key),values[String(key)]??null):base.getItem(key),
  setItem(key,value){key=String(key);if(!managed.has(key)){base.setItem(key,value);return;}values[key]=String(value);revision++;dirty.set(key,{revision,value:values[key]});schedule();},
  removeItem(key){key=String(key);if(!managed.has(key)){base.removeItem(key);return;}delete values[key];revision++;dirty.set(key,{revision,value:null});schedule();},
  clear(){for(const key of names())this.removeItem(key);},key:index=>names()[index]??null,get length(){return names().length;},
  get durable(){return base.durable;},flush,get pending(){return persisted<revision;},get error(){return error;}
 });
}
