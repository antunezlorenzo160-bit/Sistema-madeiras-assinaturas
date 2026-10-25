function criarDiagnosticoLeiturasV700({clock=Date.now,cacheMode=()=> 'desconhecido',canMount=()=>false}={}) {
  const started=clock(),sources=new Map(),stops=new Set(),references=new WeakMap();
  function source(ref){
    const parts=String(references.get(ref)||ref?.path||'desconhecido').split('/');
    const name=parts[0]==='empresas'&&parts[2]==='dados'?parts[3]:parts[0];
    if(!sources.has(name))sources.set(name,{collection:name,requests:{},returnedDocuments:0,listenersOpened:0,activeListeners:0,serverSnapshots:0,cacheSnapshots:0,pendingSnapshots:0,maxDocumentsInSnapshot:0,documentChanges:0,errors:0});
    return sources.get(name);
  }
  function error(row,err){row.errors++;row.lastErrorCode=String(err?.code||'desconhecido').slice(0,60);}
  function wrapRead(kind,fn){
    return (ref,...args)=>{
      const row=source(ref);row.requests[kind]=(row.requests[kind]||0)+1;
      return Promise.resolve().then(()=>fn(ref,...args)).then(snapshot=>{
        if(kind!=='contagemServidor')row.returnedDocuments+=typeof snapshot?.size==='number'?snapshot.size:typeof snapshot?.exists==='function'&&snapshot.exists()?1:0;
        return snapshot;
      },err=>{error(row,err);throw err;});
    };
  }
  function wrapSnapshot(fn){
    return (ref,...args)=>{
      const index=args.findIndex(arg=>typeof arg==='function');
      if(index<0)return fn(ref,...args);
      const row=source(ref),callback=args[index],onError=args[index+1];
      row.listenersOpened++;row.activeListeners++;
      let rawStop,ended=false;
      function stop(){if(ended)return;ended=true;row.activeListeners--;stops.delete(stop);rawStop?.();}
      args[index]=snapshot=>{
        if(ended)return;
        if(snapshot.metadata?.fromCache)row.cacheSnapshots++;
        else if(snapshot.metadata?.hasPendingWrites)row.pendingSnapshots++;
        else{
          row.serverSnapshots++;
          row.maxDocumentsInSnapshot=Math.max(row.maxDocumentsInSnapshot,typeof snapshot.size==='number'?snapshot.size:typeof snapshot.exists==='function'&&snapshot.exists()?1:0);
          if(typeof snapshot.docChanges==='function')row.documentChanges+=snapshot.docChanges({includeMetadataChanges:false}).length;
          if(row.collection==='sm2_orcamento_itens'&&Array.isArray(snapshot.docs)){
            const counts={active:0,excluded:0,activeWithoutExplicitFalse:0};
            for(const document of snapshot.docs){
              const data=document.data();
              if(data.excluido===true)counts.excluded++;
              else{counts.active++;if(data.excluido!==false)counts.activeWithoutExplicitFalse++;}
            }
            row.budgetDocuments=counts;
          }
        }
        callback(snapshot);
      };
      args[index+1]=err=>{if(ended)return;error(row,err);stop();onError?.(err);};
      try{rawStop=fn(ref,...args);if(ended)rawStop?.();else stops.add(stop);}catch(err){error(row,err);stop();throw err;}
      return stop;
    };
  }
  function report(){return {version:'leituras-v701-budget-counts',startedAt:new Date(started).toISOString(),elapsedSeconds:Math.round((clock()-started)/1000),firestoreCache:cacheMode(),
    note:'Medições locais do aplicativo, não extrato de leituras cobradas. Callbacks podem compartilhar a mesma conexão do SDK. Não inclui versões antigas, outros aparelhos ou a API da administração.',
    collections:[...sources.values()].map(row=>({...row,requests:{...row.requests}})).sort((a,b)=>a.collection.localeCompare(b.collection))};}
  function mount(doc){
    if(canMount()!==true){doc.getElementById('diagnosticoLeiturasV700')?.remove();return;}
    const host=doc.getElementById('configInterface');if(!host||doc.getElementById('diagnosticoLeiturasV700'))return;
    const box=doc.createElement('details');box.id='diagnosticoLeiturasV700';box.className='card';
    const title=doc.createElement('summary');title.textContent='Diagnóstico de leituras do Firebase';
    const note=doc.createElement('p');note.textContent='Esta medição é local e não consulta o banco. Ela ajuda a identificar consultas e reaberturas; os valores cobrados aparecem no console do Firebase.';
    const pre=doc.createElement('pre');pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px';
    const refresh=doc.createElement('button');refresh.type='button';refresh.className='btn btn-secondary';refresh.textContent='Atualizar medição';
    refresh.onclick=()=>{pre.textContent=JSON.stringify(report(),null,2);};
    const copy=doc.createElement('button');copy.type='button';copy.className='btn btn-secondary';copy.textContent='Copiar diagnóstico';
    const status=doc.createElement('p');status.setAttribute('role','status');
    copy.onclick=async()=>{try{await doc.defaultView.navigator.clipboard.writeText(JSON.stringify(report(),null,2));status.textContent='Diagnóstico copiado. Não contém registros, senhas ou tokens.';}catch{status.textContent='Não foi possível copiar. A medição pode ser selecionada abaixo.';}};
    box.append(title,note,refresh,copy,status,pre);host.append(box);box.addEventListener('toggle',()=>{if(box.open)refresh.onclick();});
  }
  return {wrapRead,wrapSnapshot,report,mount,identify(ref,path){references.set(ref,path);return ref;},stopAll(){for(const stop of [...stops])stop();}};
}
