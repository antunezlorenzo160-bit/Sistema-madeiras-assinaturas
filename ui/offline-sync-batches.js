// OFFLINE_SYNC_BATCHES_V794
let offlineSyncPromiseV396=null;
const offlineSyncProgressV794={active:false,startedAt:0,lastConfirmedAt:0,confirmed:0,lastBatchSize:0,lastError:'',blockedReason:'',failedOperation:null};
async function sincronizarOfflineOps(){
 if(offlineSyncPromiseV396)return offlineSyncPromiseV396;
 if(!acessoPlanoAtual().write){offlineSyncProgressV794.blockedReason='A conta está sem permissão de escrita.';atualizarStatusSync('aguarda','Envio pendente: '+offlineSyncProgressV794.blockedReason);return;}
 if(lotePacotesEmCurso){offlineSyncProgressV794.blockedReason='Há um lançamento em andamento.';return;}
 if(!conexaoOnline()){offlineSyncProgressV794.blockedReason='Sem conexão para enviar.';atualizarStatusSync('aguarda','Sem internet • dados locais preservados');return;}
 // Defer the task so the single-flight promise is installed before any callback.
 offlineSyncPromiseV396=Promise.resolve().then(async()=>{
  Object.assign(offlineSyncProgressV794,{active:true,startedAt:Date.now(),confirmed:0,lastBatchSize:0,lastError:'',blockedReason:'',failedOperation:null});
  await window.__v456Local.flush?.();
  while(conexaoOnline()&&!lotePacotesEmCurso&&acessoPlanoAtual().write){
   const snapshot=offlineOps();if(!snapshot.length)break;
   let progressed=false;
   for(const group of offlineSyncBatchesV794(snapshot,COL.orcamento)){
    if(!conexaoOnline()||lotePacotesEmCurso||!acessoPlanoAtual().write)return;
    const operations=group.operations;let currentOperation=operations[0];
    try{
     for(const op of operations){currentOperation=op;if(!parent.__smEmployeeCollectionCan(op.nome,true)){const error=Error('Sem permissão de envio nesta coleção.');error.code='permission-denied';throw error;}}
     if(group.budget){await enviarOperacaoOrcamentoV705(currentOperation);}
     else{
      const batch=writeBatch(db);
      for(const op of operations){
       currentOperation=op;const reference=doc(db,op.nome,op.id);
       if(op.modo==='delete')batch.delete(reference);
       else if((op.modo==='set'||op.modo==null))batch.set(reference,op.obj||{});
       else if(op.modo==='merge')batch.set(reference,op.obj||{},{merge:true});
       else throw Error('Operação pendente com modo desconhecido.');
      }
      // The wrapper queues locally if connectivity changed; that is not an acknowledgement.
      if(!conexaoOnline())return;
      await batch.commit();
     }
     if(!conexaoOnline())return;
    }catch(error){
     const code=String(error?.code||error?.name||'falha no envio').slice(0,80);
     erroEnvioOfflineV792={key:currentOperation.chave,revision:String(currentOperation.revisao||currentOperation.criadoEm||0),code};
     offlineSyncProgressV794.lastError=code;
     offlineSyncProgressV794.failedOperation={collection:currentOperation.nome,id:currentOperation.id,mode:currentOperation.modo,fieldNames:Object.keys(currentOperation.obj||{}),message:String(error?.message||error).slice(0,250)};
     if(operations.some(op=>op.nome===COL.madeiras))erroCadastroSyncV457=code;
     atualizarStatusSync('erro','Envio não confirmado: '+code+' • pendências preservadas');
     return; // No automatic retry or destructive queue clearing after a rejected batch.
    }
    const remaining=acknowledgeOfflineBatchV794(offlineOps(),operations);
    salvarOfflineOps(remaining);await window.__v456Local.flush?.();
    progressed=true;offlineSyncProgressV794.confirmed+=operations.length;offlineSyncProgressV794.lastConfirmedAt=Date.now();offlineSyncProgressV794.lastBatchSize=operations.length;
    if(group.budget)agendarAplicacaoV428();
    if(operations.some(op=>op.nome===COL.madeiras)&&!remaining.some(op=>op.nome===COL.madeiras)){erroCadastroSyncV457='';atualizarPendenciasCadastroV457();agendarAplicacaoV428();}
    atualizarStatusSync(remaining.length?'aguarda':'ok',remaining.length?remaining.length+' alteração(ões) pendente(s) • '+offlineSyncProgressV794.confirmed+' confirmada(s) nesta tentativa':'Envios confirmados');
    await new Promise(resolve=>setTimeout(resolve,0));
   }
   if(!progressed)break;
  }
 }).catch(error=>{
  offlineSyncProgressV794.lastError=String(error?.code||error?.name||'falha de persistência').slice(0,80);
  marcarSyncErro(error,'Envio interrompido • preserve os dados deste aparelho');
 }).finally(()=>{
  offlineSyncProgressV794.active=false;offlineSyncPromiseV396=null;
  if(offlineSyncProgressV794.lastError)atualizarStatusSync('erro','Envio não confirmado: '+offlineSyncProgressV794.lastError+' • pendências preservadas');
  else atualizarStatusSync('ok','Envios confirmados');
 });
 return offlineSyncPromiseV396;
}
window.tentarEnviarPendenciasV794=()=>sincronizarOfflineOps();
