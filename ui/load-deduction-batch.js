// V833: validate every line against private virtual stock, then durably commit the load once.
async function commitLoadBatchV833(grupoId,itens,agora,quem){
 employeeRequireLoadAdmin();
 if(window.__smLoadRecoveryNeedsReload||window.__smLoadDeductionJournal.busy)throw Error('Aguarde a gravação ou reabra o sistema para recuperar a baixa interrompida.');
 if(await window.__smLoadDeductionJournal.recover()){window.__smLoadRecoveryNeedsReload=true;throw Error('Reabra o sistema para carregar a baixa recuperada.');}
 await window.__v456Local.flush?.();
 const company=empresaV456,actor=employeeLoadActor().uid;
 const snapshot=()=>[estoque1Lancamentos,estoque2Lancamentos,carregamentos,lancamentos,movimentos].map(rows=>JSON.stringify(rows));
 const baseline=snapshot();
 let state={stock1:estoque1Lancamentos,stock2:estoque2Lancamentos,loads:carregamentos,summary:lancamentos,moves:movimentos};
 const operations=[];
 const controls=[...(document.querySelectorAll?.('#calculadora input,#calculadora select,#calculadora button,[onclick*="conferirEDarBaixaCargaV388"]')||[])].map(el=>({el,disabled:el.disabled,text:el.textContent,busy:el.getAttribute?.('aria-busy')}));
 try{
  for(const {el}of controls){el.disabled=true;if(el.getAttribute?.('onclick')?.includes(String(grupoId))){el.textContent='Baixando…';el.setAttribute?.('aria-busy','true');}}
  await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  for(let index=0;index<itens.length;index++){
   const original=itens[index],concluido={...original,cargaStatus:'concluido',cargaBaixadaEm:agora,cargaConferidaPor:quem,cargaConferidaPorUid:actor,atualizadoEm:agora};
   const plan=await planLoadLineV833(state,concluido,concluido.estoqueOrigem||'estoque1','Carga');
   state=plan.state;operations.push(...plan.operations);
   if((index+1)%8===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(company!==empresaV456||actor!==employeeLoadActor().uid||snapshot().some((value,index)=>value!==baseline[index]))throw Error('Os dados mudaram durante a conferência. Nenhuma baixa desta tentativa foi gravada. Reabra a carga para conferir novamente.');
  const unique=new Map();state.loads.forEach(row=>unique.set(String(row.id),row));
  state.loads=[...unique.values()].map(row=>String(row.grupoCargaId||'')===String(grupoId)&&row.cargaFluxoV388===true?{...row,cargaStatus:'concluido',cargaBaixadaEm:row.cargaBaixadaEm||agora,cargaConferidaPor:row.cargaConferidaPor||quem,atualizadoEm:Math.max(Number(row.atualizadoEm||0),agora)}:row);
  state.summary=state.summary.filter(row=>String(row.grupoCargaId||'')!==String(grupoId));
  const queue=window.__smMergeLoadDeductionQueue(offlineOps(),operations,Date.now(),()=>crypto.randomUUID());
  employeeRequireLoadAdmin();exigirEscritaPlano();
  try{
   await window.__smLoadDeductionJournal.commit([
    ['estoque1_lancamentos_v1',JSON.stringify(state.stock1)],['estoque2_lancamentos_v1',JSON.stringify(state.stock2)],
    ['carregamentos_lancamentos_v1',JSON.stringify(state.loads)],[STORAGE.lancamentos,JSON.stringify(state.summary)],
    [STORAGE.movimentos,JSON.stringify(state.moves)],[OFFLINE_OPS_KEY,JSON.stringify(queue)]
   ]);
   estoque1Lancamentos=state.stock1;estoque2Lancamentos=state.stock2;carregamentos=state.loads;lancamentos=state.summary;movimentos=state.moves;
   await window.__v456Local.flush?.();
  }catch(error){window.__smLoadRecoveryNeedsReload=true;throw error;}
 }finally{
  for(const {el,disabled,text,busy}of controls){if(el.isConnected===false)continue;el.disabled=disabled;if(el.getAttribute?.('aria-busy')==='true'){el.textContent=text;if(busy===null||busy===undefined)el.removeAttribute?.('aria-busy');else el.setAttribute?.('aria-busy',busy);}}
 }
}
