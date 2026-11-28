// V834: keep an open romaneio independent of unrelated list and network refreshes.
const romaneioBusyV834=new Set();
function romaneioSignatureV834(gid){return JSON.stringify(itensGrupoCargaV400(gid).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))));}
function captureRomaneioV834(){
 const node=document.getElementById('v418-romaneio-preview');
 if(!node||node.hidden||!node.romaneioGroupV834||!node.romaneioSignatureV834)return null;
 return {node,gid:node.romaneioGroupV834,signature:node.romaneioSignatureV834};
}
function currentRomaneioV834(){const saved=captureRomaneioV834();return !!saved&&String(estadoCargasV408.gid)===saved.gid&&romaneioSignatureV834(saved.gid)===saved.signature;}
function restoreRomaneioV834(saved){
 if(!saved||String(estadoCargasV408.gid)!==saved.gid||romaneioSignatureV834(saved.gid)!==saved.signature)return;
 const host=document.getElementById('v418-romaneio-preview');if(host&&host!==saved.node)host.replaceWith(saved.node);
}
async function congelarPesoLegadoV420(gid){
 const altered=new Map();
 for(const row of itensGrupoCargaV400(gid)){
  if(row.pesoReferenciaV420)continue;
  const reference=referenciaPesoCargaV420(row,row.estadoMadeira==='verde'||row.origemMadeira==='verde');
  if(reference)altered.set(String(row.id),{...row,pesoReferenciaV420:reference});
 }
 if(!altered.size)return;
 employeeRequireLoadAdmin();exigirEscritaPlano();
 if(window.__smLoadRecoveryNeedsReload||window.__smLoadDeductionJournal.busy)throw Error('Aguarde a gravação pendente ou reabra o sistema antes de preparar o romaneio.');
 const company=empresaV456,baseline=romaneioSignatureV834(gid);iniciarMutacaoCargaV396();
 try{
  if(await window.__smLoadDeductionJournal.recover()){window.__smLoadRecoveryNeedsReload=true;throw Error('Reabra o sistema para carregar a gravação recuperada.');}
  if(company!==empresaV456||romaneioSignatureV834(gid)!==baseline)throw Error('Os dados da carga mudaram. Reabra o carregamento para conferir o romaneio.');
  employeeRequireLoadAdmin();exigirEscritaPlano();
  const operations=[...altered.values()].map(row=>({nome:COL.cargas,id:row.id,obj:row,modo:'set'}));
  for(const op of operations){employeeCheckLoadWrite(doc(db,op.nome,op.id),op.obj,op.modo);employeeAssertWrite(doc(db,op.nome,op.id));}
  const loads=carregamentos.map(row=>altered.get(String(row.id))||row),summary=lancamentos.map(row=>altered.has(String(row.id))?{...row,pesoReferenciaV420:altered.get(String(row.id)).pesoReferenciaV420}:row);
  const queue=window.__smMergeLoadDeductionQueue(offlineOps(),operations,Date.now(),()=>crypto.randomUUID());
  try{
   await window.__smLoadDeductionJournal.commit([['carregamentos_lancamentos_v1',JSON.stringify(loads)],[STORAGE.lancamentos,JSON.stringify(summary)],[OFFLINE_OPS_KEY,JSON.stringify(queue)]]);
   carregamentos=loads;lancamentos=summary;await window.__v456Local.flush?.();
  }catch(error){window.__smLoadRecoveryNeedsReload=true;throw error;}
 }finally{finalizarMutacaoCargaV396();}
 // Sending must never keep the screen's mutation lock held until a server response.
 sincronizarOfflineOps().catch(error=>marcarSyncErro(error,'Referência de peso salva no aparelho; envio pendente'));
}
async function abrirRomaneioV418(gid){
 employeeRequireLoadAdmin();
 if(!validarClienteSalvoV407(gid)||!validarTransporteSalvoV414(gid)||romaneioBusyV834.has(String(gid)))return;
 let host=document.getElementById('v418-romaneio-preview');if(!host)return alert('Abra o carregamento original novamente para preparar o romaneio.');
 if(!host.hidden){host.hidden=true;host.innerHTML='';return;}
 const company=empresaV456;romaneioBusyV834.add(String(gid));
 try{
  await congelarPesoLegadoV420(gid);
  if(company!==empresaV456||String(estadoCargasV408.gid)!==String(gid))return;
  host=document.getElementById('v418-romaneio-preview');if(!host)return;
  const documentNode=documentoRomaneioV418(gid);if(!documentNode)return alert('Feche o carregamento antes de gerar o romaneio.');
  const toolbar=document.createElement('div');toolbar.className='v418-romaneio-toolbar no-print';
  const title=document.createElement('strong');title.textContent='Romaneio de carga — prévia';toolbar.appendChild(title);
  const pdf=document.createElement('button');pdf.type='button';pdf.className='btn btn-primary';pdf.textContent='PDF do romaneio';pdf.addEventListener('click',()=>pdfRomaneioV418(gid));toolbar.appendChild(pdf);
  const close=document.createElement('button');close.type='button';close.className='btn btn-secondary';close.textContent='Fechar';close.addEventListener('click',()=>{host.hidden=true;host.innerHTML='';});toolbar.appendChild(close);
  host.replaceChildren(toolbar,documentNode);host.hidden=false;host.romaneioGroupV834=String(gid);host.romaneioSignatureV834=romaneioSignatureV834(gid);host.scrollIntoView({block:'start',behavior:'auto'});
 }catch(error){alert(error.message||'Não foi possível preparar o romaneio.');}finally{romaneioBusyV834.delete(String(gid));}
}
async function pdfRomaneioV418(gid){
 if(!validarClienteSalvoV407(gid)||!validarTransporteSalvoV414(gid)||romaneioBusyV834.has(String(gid))||window.__smPrintingV556)return;
 const company=empresaV456;romaneioBusyV834.add(String(gid));
 try{
  await congelarPesoLegadoV420(gid);if(company!==empresaV456||String(estadoCargasV408.gid)!==String(gid))return;
  const documentNode=documentoRomaneioV418(gid);if(!documentNode)return alert('Carregamento indisponível para gerar o romaneio.');
  const name=nomeClienteCargaV407(itensGrupoCargaV400(gid));if(typeof gerarPdfBloco==='function')return gerarPdfBloco(documentNode,'Romaneio de carga — '+name);
  alert('Não foi possível acessar a impressão neste aparelho.');
 }catch(error){alert(error.message||'Não foi possível gerar o PDF.');}finally{romaneioBusyV834.delete(String(gid));}
}
