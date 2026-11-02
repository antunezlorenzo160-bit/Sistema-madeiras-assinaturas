window.arquivarCargaInconsistenteV1=async function(group){
 try{
  employeeRequireLoadAdmin();exigirEscritaPlano();
  if(window.__smLoadRecoveryNeedsReload)throw Error('Reabra o sistema para recuperar a operação interrompida.');
  if(window.__smLoadDeductionJournal.recover()){window.__smLoadRecoveryNeedsReload=true;throw Error('Reabra o sistema para carregar os registros recuperados.');}
  const actor=employeeLoadActor().uid;
  const plan=planInconsistentLoadArchive(carregamentos,lancamentos,String(group),actor,Date.now());
  if(plan.alreadyArchived)return alert('Este carregamento já está arquivado com inconsistência.');
  if(!confirm('Arquivar este carregamento de teste com inconsistência?\n\nEle sairá dos pendentes. Estoque, movimentos e histórico serão preservados. Esta ação não confirma nem desfaz a baixa.'))return;
  const operations=plan.operations.map(op=>({...op,nome:COL.cargas}));
  for(const op of operations){employeeCheckLoadWrite(doc(db,op.nome,op.id),op.obj,op.modo);employeeAssertWrite(doc(db,op.nome,op.id));}
  const queue=window.__smMergeLoadDeductionQueue(offlineOps(),operations,Date.now(),()=>crypto.randomUUID());
  try{window.__smLoadDeductionJournal.commit([
   ['carregamentos_lancamentos_v1',JSON.stringify(plan.loads)],
   [STORAGE.lancamentos,JSON.stringify(plan.summary)],
   [OFFLINE_OPS_KEY,JSON.stringify(queue)]
  ]);}catch(error){window.__smLoadRecoveryNeedsReload=true;throw error;}
  carregamentos=plan.loads;lancamentos=plan.summary;
  try{window.__smSyncSummaryTabsV606?.();}catch{}
  renderLancamentos();renderCarregamentosV392();
  sincronizarOfflineOps().catch(()=>{});
  alert('Carregamento arquivado com inconsistência. Estoque e movimentos foram preservados.');
 }catch(error){alert(String(error?.message||error));}
};
