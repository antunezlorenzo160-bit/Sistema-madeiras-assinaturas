async function serverReadWithDeadlineV792(read){let timer;try{return await Promise.race([read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('O servidor não respondeu em 20 segundos.')),20000);})]);}finally{clearTimeout(timer);}}
async function conferirEnvioCargaV792(gid){
 employeeRequireLoadAdmin();
 const rows=loadRowsForGroupV793(typeof carregamentos==='undefined'?[]:carregamentos,gid),ids=new Set(rows.map(row=>String(row.id)));
 if(!rows.length){alert('Não encontrei os itens desta carga no aparelho. Volte à lista e abra o carregamento novamente.');return;}
 const queue=offlineOps(),pending=queue.filter(op=>op.nome===COL.cargas&&(ids.has(String(op.id))||String(op.obj?.grupoCargaId||'')===String(gid)));
 const locallyCompleted=rows.filter(row=>row.cargaBaixadaEm&&row.cargaStatus==='concluido').length;
 let panel=document.getElementById('loadSyncCheckV792');
 if(!panel){panel=document.createElement('section');panel.id='loadSyncCheckV792';panel.className='card';document.getElementById('v408-detalhe')?.prepend(panel);}
 panel.replaceChildren();const message=document.createElement('p');panel.append(message);
 const report={version:792,load:String(gid),local:loadRecordDiagnosticV791(rows),locallyCompleted,pendingLoadOperations:pending.length,totalPendingOperations:queue.length};
 try{const failure=JSON.parse(window.__v456Local.getItem('sm_load_last_failure_v2')||'null');if(failure&&String(failure.group)===String(gid))report.lastLocalFailure={at:failure.at,stage:failure.stage,locallyCommitted:failure.locallyCommitted,error:failure.error};}catch{}
 message.textContent='Neste aparelho: '+rows.length+' registro(s), '+locallyCompleted+' com baixa registrada. Envios da carga pendentes: '+pending.length+'. Conferindo servidor…';
 try{
  if(!conexaoOnline())throw Error('Sem internet; conferência limitada ao aparelho.');
  const sdk=parent.__v470Runtime().sdk;
  let remote;
  if(rows.length===1&&!rows[0].grupoCargaId){const snap=await serverReadWithDeadlineV792(()=>getDocFromServer(doc(db,COL.cargas,String(rows[0].id))));remote=snap.exists()?[{...snap.data(),id:snap.id}]:[];}
  else{const query=sdk.query(collection(db,COL.cargas),sdk.where('grupoCargaId','==',String(gid)),sdk.limit(1001));const snap=await serverReadWithDeadlineV792(()=>getDocsFromServer(query));remote=snap.docs.map(item=>({...item.data(),id:item.id}));}
  const byId=new Map(remote.map(row=>[String(row.id),row]));
  const fields=['quantidade','volume','volumeReal','volumeGranel','volumeFechado','comprimento','largura','espessura','cargaStatus','cargaBaixadaEm'];
  const different=rows.filter(row=>{const server=byId.get(String(row.id));return !server||fields.some(key=>JSON.stringify(row[key]??null)!==JSON.stringify(server[key]??null));}).map(row=>String(row.id));
  const partial=remote.length>=1001,missing=rows.filter(row=>!byId.has(String(row.id))).map(row=>String(row.id));
  report.server={recordsRead:remote.length,partial,missingIds:missing,differentIds:different,incompleteRecords:remote.filter(incompleteLoadRowV791).length};
  const matches=!partial&&different.length===0&&remote.length===rows.length;
  message.textContent='Neste aparelho: '+rows.length+' registro(s), '+locallyCompleted+' com baixa registrada. Envios da carga pendentes: '+pending.length+'. '+(partial?'Conferência parcial: carga com mais de 1.000 registros.':matches?'Os dados físicos e o status desta carga coincidem com o servidor.':'Servidor: '+remote.length+' registro(s). Há '+different.length+' registro(s) ausente(s) ou diferente(s) do aparelho.')+(queue.length?' Existem envios pendentes neste aparelho.':'')+' Não refaça a baixa para tentar sincronizar.';
 }catch(error){report.serverError=String(error?.code||error?.message||error).slice(0,150);message.textContent='Neste aparelho: '+rows.length+' registro(s), '+locallyCompleted+' com baixa registrada. Envios da carga pendentes: '+pending.length+'. Não foi possível confirmar no servidor: '+report.serverError+'. Não repita a baixa.';}
 const copy=document.createElement('button');copy.type='button';copy.className='btn btn-secondary';copy.textContent='Copiar conferência';copy.onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(report,null,2));copy.textContent='Conferência copiada';}catch{const area=document.createElement('textarea');area.readOnly=true;area.value=JSON.stringify(report,null,2);panel.append(area);area.focus();area.select();}};panel.append(copy);
}
window.conferirEnvioCargaV792=conferirEnvioCargaV792;
