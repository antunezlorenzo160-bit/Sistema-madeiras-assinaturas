// Opt-in purchase cart. Physical stock is only created by the atomic server confirmation.
let stockPurchaseDraftV728=null,stockPurchaseBusyV728=false;
const purchaseElV728=id=>document.getElementById(id),purchaseStorageV728=()=>'stock_purchase_v728:'+empresaV456;
const purchaseOwnerV728=()=>parent.__smEmployeeMember?.()?.papel==='admin';
function purchaseFreshV728(){const d=new Date();return {id:crypto.randomUUID(),enabled:false,confirmed:false,pending:null,lines:[],stock:null,supplier:'',date:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),reference:'',unit:'',freight:'',other:'',freightIncluded:false,otherIncluded:false};}
function purchaseStoreV728(next){const raw=JSON.stringify(next);window.__v456Local.setItem(purchaseStorageV728(),raw);if(window.__v456Local.getItem(purchaseStorageV728())!==raw)throw Error('Não foi possível preservar o rascunho neste aparelho.');stockPurchaseDraftV728=next;}
function purchaseReadFieldsV728(){return {...stockPurchaseDraftV728,enabled:purchaseElV728('purchaseEnabledV728').checked,supplier:purchaseElV728('purchaseSupplierV728').value.trim(),date:purchaseElV728('purchaseDateV728').value,reference:purchaseElV728('purchaseReferenceV728').value.trim(),unit:purchaseElV728('purchaseUnitV728').value,freight:purchaseElV728('purchaseFreightV728').value,other:purchaseElV728('purchaseOtherV728').value,freightIncluded:purchaseElV728('purchaseFreightIncludedV728').checked,otherIncluded:purchaseElV728('purchaseOtherIncludedV728').checked};}
function purchaseInputV728(){if(stockPurchaseBusyV728||stockPurchaseDraftV728?.pending||stockPurchaseDraftV728?.confirmed)return;try{purchaseStoreV728(purchaseReadFieldsV728());purchaseRenderV728();}catch(e){purchaseElV728('purchaseStatusV728').textContent=e.message;}}
function purchasePayloadV728(draft){return normalizeStockPurchase({companyId:empresaV456,id:draft.id,date:draft.date,supplier:draft.supplier,reference:draft.reference,stock:draft.stock,freightCents:financeCents(draft.freight.trim()||'0'),otherCents:financeCents(draft.other.trim()||'0'),freightIncluded:draft.freightIncluded,otherIncluded:draft.otherIncluded,lines:draft.lines.map(({madeira,...line})=>line)});}
function purchaseRawPayloadV728(draft){const parsed=purchasePayloadV728(draft);return {companyId:parsed.companyId,id:parsed.id,date:parsed.date,supplier:parsed.supplier,reference:parsed.reference,stock:parsed.stock,freightCents:parsed.freightCents,otherCents:parsed.otherCents,freightIncluded:parsed.freightIncluded,otherIncluded:parsed.otherIncluded,lines:parsed.lines.map(({amountCents,acquisitionCents,...line})=>line)};}
function stockPurchaseVisibilityV728(){
 const node=purchaseElV728('stockPurchaseV728');if(!node)return;
 const stock=['estoque1','estoque2'].includes(destinoSelecionado()),supported=['m3','granel'].includes(modoMedida);node.hidden=!purchaseOwnerV728()||!stock||!supported;
 if(!node.hidden&&!stockPurchaseDraftV728){purchaseMountV728();return;}
 if(!node.hidden&&stockPurchaseDraftV728?.pending)node.open=true;
}
function purchaseRenderV728(){
 const draft=stockPurchaseDraftV728;if(!draft)return;
 purchaseElV728('purchaseFieldsV728').hidden=!draft.enabled;
 const linesHost=purchaseElV728('purchaseLinesV728'),linesSignature=JSON.stringify(draft.lines);
 // Keep remove buttons mounted across input blur/change so their click is not lost.
 if(linesHost.dataset.linesSignatureV753!==linesSignature){
 linesHost.innerHTML=draft.lines.map((line,index)=>'<div class="purchase-line-v728"><strong>'+esc(line.madeira)+'</strong><span>'+esc(line.tipoMedida==='granel'?'A granel':line.espessura+' × '+line.largura+' cm · '+line.comprimento+' m · '+line.quantidade+' peças')+' · '+num4(line.volume)+' m³ · '+finMoneyV722(line.unitCents)+'/m³</span><button type="button" class="btn btn-secondary" data-purchase-remove="'+index+'">Retirar da lista</button></div>').join('')||'<p class="note">Preencha a medida na calculadora e toque em Lançar peça para adicionar.</p>';
 linesHost.dataset.linesSignatureV753=linesSignature;
 }
 try{const totals=purchasePayloadV728(draft);purchaseElV728('purchaseTotalV728').textContent=(draft.stock==='estoque2'?'Estoque 2':'Estoque 1')+' · Madeira: '+finMoneyV722(totals.goodsCents)+' · Gastos acrescentados: '+finMoneyV722(totals.addedCents)+' · Compra: '+finMoneyV722(totals.totalCents);}catch{purchaseElV728('purchaseTotalV728').textContent=draft.lines.length+' item(ns) na lista. Preencha fornecedor, data e gastos para conferir o total.';}
 const locked=stockPurchaseBusyV728||!!draft.pending||draft.confirmed;
 for(const node of purchaseElV728('stockPurchaseV728').querySelectorAll('input,[data-purchase-remove]'))node.disabled=locked;
 purchaseElV728('purchaseConfirmV728').disabled=stockPurchaseBusyV728||draft.confirmed||!draft.lines.length||window.__v456Local.durable===false;
 purchaseElV728('purchaseConfirmV728').textContent=draft.pending?'Conferir confirmação / tentar novamente':'Confirmar descarregamento e compra';
 purchaseElV728('purchaseNewV728').disabled=stockPurchaseBusyV728||!!draft.pending;
}
function purchaseFillV728(){const d=stockPurchaseDraftV728;for(const [id,key] of [['purchaseSupplierV728','supplier'],['purchaseDateV728','date'],['purchaseReferenceV728','reference'],['purchaseUnitV728','unit'],['purchaseFreightV728','freight'],['purchaseOtherV728','other']])purchaseElV728(id).value=d[key]||'';for(const [id,key] of [['purchaseEnabledV728','enabled'],['purchaseFreightIncludedV728','freightIncluded'],['purchaseOtherIncludedV728','otherIncluded']])purchaseElV728(id).checked=d[key]===true;purchaseRenderV728();}
function stockPurchaseCaptureV728(item,destination){
 if(!['m3','granel'].includes(item.tipoMedida)||!purchaseOwnerV728()||!stockPurchaseDraftV728||!purchaseElV728('purchaseEnabledV728').checked)return false;
 const status=purchaseElV728('purchaseStatusV728');purchaseElV728('stockPurchaseV728').open=true;
 try{
  if(stockPurchaseBusyV728||stockPurchaseDraftV728.pending)throw Error('Confira a confirmação pendente antes de adicionar outra entrada.');
  if(stockPurchaseDraftV728.confirmed)throw Error('Esta compra já foi confirmada. Toque em Novo descarregamento.');
  if(!['m3','granel'].includes(item.tipoMedida))throw Error('A compra está disponível para madeira em m³ e a granel.');
  const draft=purchaseReadFieldsV728();if(draft.stock&&draft.stock!==destination)throw Error('Confirme esta lista no estoque escolhido antes de trocar de estoque.');
  const unitCents=financeCents(draft.unit.trim());
  const line={id:item.id,madeiraId:item.madeiraId,madeira:item.madeira,tipoMedida:item.tipoMedida,largura:Number(item.largura||0),espessura:Number(item.espessura||0),comprimento:Number(item.comprimento||0),quantidade:Number(item.quantidade||0),volume:Number(item.volume||0),estadoMadeira:item.tipoMedida==='m3'&&$('chkMadeiraVerde')?.checked?'verde':'seca',unitCents};
  const next={...draft,stock:destination,supplier:draft.supplier||String(item.fornecedorOrigem||''),lines:groupStockPurchaseLinesV754([...draft.lines,line])};
  // Validate physical quantity and price now; supplier may be completed before confirmation.
  if(line.estadoMadeira==='verde')line.secagemDias=Number($('diasSecagemVerde')?.value||0);
  purchasePayloadV728({...next,supplier:next.supplier||'Fornecedor a preencher'});
  purchaseStoreV728(next);purchaseFillV728();status.textContent=next.lines.length<draft.lines.length+1?'Medida agrupada na lista: peças e volume somados. O estoque ainda não foi alterado.':'Item adicionado à lista. O estoque ainda não foi alterado.';
  if(item.tipoMedida==='m3')prepararProximoLancamentoM3();else{$('volumeGranelV384').value='';calcPreview();}
 }catch(e){status.textContent=e.message;}
 return true;
}
async function purchaseRequestV728(payload){
 if(!purchaseOwnerV728())throw Error('A compra é exclusiva do responsável pela empresa.');
 if(!navigator.onLine)throw Error('Conecte-se à internet para confirmar. O rascunho foi preservado.');
 const user=authV456.currentUser;if(!user)throw Error('Entre novamente.');
 const response=await fetch('/.netlify/functions/company-stock-purchase',{method:'POST',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)}),result=await response.json();
 if(!response.ok){const error=Error(result.error||'Não foi possível confirmar o descarregamento.');error.status=response.status;throw error;}return result;
}
async function purchaseRefreshStockV728(receipt){
 // Re-read current documents, never reinsert the original receipt quantity after a concurrent exit.
 const col=receipt.stock==='estoque2'?COL.estoque2:COL.estoque1;
 const [snapshots,history]=await Promise.all([Promise.all(receipt.lines.map(line=>getDocFromServer(doc(db,col,line.stockId)))),Promise.all(receipt.lines.map(line=>getDocFromServer(doc(db,COL.movimentos,line.movementId))))]);
 if(temOperacoesPendentesV428(col))throw Error('A compra está salva. Aguarde a sincronização do estoque antes de atualizar a tela.');
 const ids=new Set(receipt.lines.map(line=>line.stockId)),fresh=snapshots.filter(s=>s.exists()).map(s=>({...s.data(),id:s.id}));
 if(receipt.stock==='estoque2')estoque2Lancamentos=estoque2Lancamentos.filter(i=>!ids.has(i.id)).concat(fresh);else estoque1Lancamentos=estoque1Lancamentos.filter(i=>!ids.has(i.id)).concat(fresh);
 const movementIds=new Set(receipt.lines.map(line=>line.movementId));movimentos=movimentos.filter(i=>!movementIds.has(i.id)).concat(history.filter(s=>s.exists()).map(s=>({...s.data(),id:s.id})));
 lancamentos=lancamentos.filter(i=>!ids.has(i.id)).concat(fresh);save();renderEstoque();renderLancamentos();renderPlanilhasM3Especies();
}
async function purchaseConfirmV728(){
 if(stockPurchaseBusyV728||!purchaseOwnerV728()||stockPurchaseDraftV728.confirmed)return;
 const status=purchaseElV728('purchaseStatusV728');let payload;
 if(window.__v456Local.durable===false){status.textContent='Este navegador não está preservando o rascunho após fechar a página. Permita o armazenamento do site ou use uma janela normal antes de confirmar a compra.';return;}
 try{
  if(!navigator.onLine)throw Error('Conecte-se à internet para confirmar. O rascunho foi preservado.');
  if(!stockPurchaseDraftV728.pending){const next=purchaseReadFieldsV728();payload=purchaseRawPayloadV728(next);purchaseStoreV728({...next,pending:payload});}else payload=stockPurchaseDraftV728.pending;
 }catch(e){status.textContent=e.message;return;}
 stockPurchaseBusyV728=true;purchaseRenderV728();status.textContent='Confirmando estoque e compra…';let submitted=false;
 try{
  await sincronizarOfflineOps();await waitForPendingWrites(db);
  if(temOperacoesPendentesV428(COL.estoque1)||temOperacoesPendentesV428(COL.estoque2)||temOperacoesPendentesV428(COL.movimentos))throw Error('Há registros aguardando sincronização. Preserve o rascunho e tente novamente depois.');
  submitted=true;const result=await purchaseRequestV728(payload);purchaseStoreV728({...stockPurchaseDraftV728,pending:null,confirmed:true});
  financeLoadedRangeV722=null;
  status.textContent='Descarregamento confirmado: compra de '+finMoneyV722(result.receipt.totalCents)+' vinculada ao estoque e ao financeiro.';
  try{await purchaseRefreshStockV728(result.receipt);}catch(e){status.textContent+=' '+e.message+' A compra já foi salva; não lance novamente.';}
 }catch(e){
  if(!submitted||[400,403,413].includes(e.status))try{purchaseStoreV728({...stockPurchaseDraftV728,pending:null});}catch{}
  status.textContent=e.message+(stockPurchaseDraftV728.pending?' Use Conferir confirmação / tentar novamente. A identificação foi preservada para não duplicar.':' O rascunho foi preservado.');
 }finally{stockPurchaseBusyV728=false;purchaseRenderV728();}
}
function purchaseMountV728(){
 const node=purchaseElV728('stockPurchaseV728');if(!node||!purchaseOwnerV728()||stockPurchaseDraftV728)return;
 try{const saved=JSON.parse(window.__v456Local.getItem(purchaseStorageV728())||'null');stockPurchaseDraftV728=saved&&typeof saved==='object'&&Array.isArray(saved.lines)&&saved.id?saved:purchaseFreshV728();}catch{stockPurchaseDraftV728=purchaseFreshV728();}
 if(!stockPurchaseDraftV728.pending&&!stockPurchaseDraftV728.confirmed){
  try{const lines=groupStockPurchaseLinesV754(stockPurchaseDraftV728.lines);if(JSON.stringify(lines)!==JSON.stringify(stockPurchaseDraftV728.lines))purchaseStoreV728({...stockPurchaseDraftV728,lines});}catch(e){purchaseElV728('purchaseStatusV728').textContent=e.message;}
 }
 purchaseFillV728();stockPurchaseVisibilityV728();
 for(const input of node.querySelectorAll('input'))input.addEventListener('change',purchaseInputV728);
 purchaseElV728('purchaseLinesV728').addEventListener('click',event=>{const button=event.target.closest('[data-purchase-remove]');if(!button||stockPurchaseBusyV728||stockPurchaseDraftV728.pending||stockPurchaseDraftV728.confirmed)return;try{purchaseStoreV728({...purchaseReadFieldsV728(),lines:stockPurchaseDraftV728.lines.filter((_,n)=>n!==Number(button.dataset.purchaseRemove))});purchaseRenderV728();purchaseElV728('purchaseStatusV728').textContent='Item retirado da lista. O estoque não foi alterado.';}catch(e){purchaseElV728('purchaseStatusV728').textContent=e.message;}});
 purchaseElV728('purchaseConfirmV728').onclick=purchaseConfirmV728;
 purchaseElV728('purchaseNewV728').onclick=()=>{if(stockPurchaseBusyV728||stockPurchaseDraftV728.pending)return;if(stockPurchaseDraftV728.lines.length&&!stockPurchaseDraftV728.confirmed&&!confirm('Descartar a lista ainda não confirmada?'))return;try{purchaseStoreV728(purchaseFreshV728());purchaseFillV728();purchaseElV728('purchaseStatusV728').textContent='Novo descarregamento. Nenhum item adicionado ainda.';}catch(e){purchaseElV728('purchaseStatusV728').textContent=e.message;}};
 document.addEventListener('change',stockPurchaseVisibilityV728);
 if(stockPurchaseDraftV728.pending)purchaseElV728('purchaseStatusV728').textContent='Há uma confirmação pendente. Use Conferir confirmação / tentar novamente; não lance a compra outra vez.';
}
setTimeout(purchaseMountV728,0);
