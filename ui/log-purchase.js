// V756: purchases use a private receipt; the existing cubage/labour list stays independent.
let logPurchaseRootV756=null,logPurchaseDraftV756=null,logPurchaseBusyV756=false,logPurchaseRowsV756=[],logPurchaseCompanyV756=null,logPurchaseCanWriteV756=true;
const logOwnerV756=()=>parent.__smEmployeeMember?.()?.papel==='admin'&&(!logPurchaseCompanyV756||logPurchaseCompanyV756===empresaV456);
const logElV756=id=>logPurchaseRootV756?.querySelector('#'+id);
const logKeyV756=()=>'log_purchase_v756:'+logPurchaseCompanyV756;
const logContextV756=context=>context.company===logPurchaseCompanyV756&&context.root===logPurchaseRootV756&&logOwnerV756();
function logFreshV756(){const d=new Date();return {id:crypto.randomUUID(),supplier:'',date:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),reference:'',freight:'',other:'',freightIncluded:false,otherIncluded:false,lines:[],pending:null,confirmed:false};}
function logStoreV756(next){if(!logOwnerV756())throw Error('Reabra a empresa para continuar.');const raw=JSON.stringify(next);window.__v456Local.setItem(logKeyV756(),raw);if(window.__v456Local.getItem(logKeyV756())!==raw)throw Error('Não foi possível preservar esta compra no aparelho.');logPurchaseDraftV756=next;}
function logReadV756(){return {...logPurchaseDraftV756,...purchasePaymentDraftV757('lpPay'),supplier:logElV756('lpSupplierV756').value.trim(),date:logElV756('lpDateV756').value,reference:logElV756('lpReferenceV756').value.trim(),freight:logElV756('lpFreightV756').value,other:logElV756('lpOtherV756').value,freightIncluded:logElV756('lpFreightIncludedV756').checked,otherIncluded:logElV756('lpOtherIncludedV756').checked};}
function logRawV756(draft,includePayment=true){const raw={companyId:logPurchaseCompanyV756,id:draft.id,date:draft.date,supplier:draft.supplier,reference:draft.reference,freightCents:financeCents(draft.freight.trim()||'0'),otherCents:financeCents(draft.other.trim()||'0'),freightIncluded:draft.freightIncluded,otherIncluded:draft.otherIncluded,lines:draft.lines};if(includePayment&&draft.paymentMode){const base=normalizeLogPurchaseV756(raw);raw.payment=purchasePaymentInputV757(draft,base.totalCents,base.date);}return raw;}
function logStatusV756(text){const node=logElV756('lpStatusV756');if(node)node.textContent=text;}
function logRenderV756(){
 const draft=logPurchaseDraftV756;if(!draft||!logPurchaseRootV756)return;
 const host=logElV756('lpLinesV756'),signature=JSON.stringify(draft.lines);
 if(host.dataset.signature!==signature){host.innerHTML=draft.lines.map((row,n)=>'<div class="lp-line-v756"><strong>'+esc(row.especie)+'</strong><span>'+row.quantidade+' tora(s) · Ø '+row.diametro+' cm · '+row.comprimento+' m · '+num4(volumeToras(row.diametro,row.comprimento,row.quantidade).total)+' m³ · '+finMoneyV722(row.unitCents)+'/m³</span><button type="button" class="btn btn-secondary" data-lp-remove="'+n+'">Retirar da lista</button></div>').join('')||'<p class="note">Adicione as medidas das toras.</p>';host.dataset.signature=signature;}
 try{const total=normalizeLogPurchaseV756(logRawV756(draft));logElV756('lpTotalV756').textContent=total.totalQuantity+' tora(s) · '+num4(total.totalVolume)+' m³ · Toras: '+finMoneyV722(total.goodsCents)+' · Gastos acrescentados: '+finMoneyV722(total.addedCents)+' · Total da compra: '+finMoneyV722(total.totalCents);}catch{logElV756('lpTotalV756').textContent=draft.lines.length+' medida(s) agrupada(s). Preencha fornecedor, data e gastos para conferir o total.';}
 const locked=logPurchaseBusyV756||!!draft.pending||draft.confirmed||!logOwnerV756();
 for(const el of logElV756('lpDraftV756').querySelectorAll('input,select,button'))el.disabled=locked;
 logElV756('lpConfirmV756').disabled=logPurchaseBusyV756||draft.confirmed||!draft.lines.length||!logOwnerV756()||!logPurchaseCanWriteV756||window.__v456Local.durable===false;
 logElV756('lpConfirmV756').textContent=draft.pending?'Conferir confirmação / tentar novamente':'Confirmar compra e financeiro';
 logElV756('lpNewV756').disabled=logPurchaseBusyV756||!!draft.pending||!logOwnerV756();
 logElV756('lpHistoryLoadV756').disabled=logPurchaseBusyV756;
 for(const el of logElV756('lpHistoryV756').querySelectorAll('button'))el.disabled=logPurchaseBusyV756||!logPurchaseCanWriteV756;
}
function logFillV756(){const d=logPurchaseDraftV756;for(const [id,key] of [['lpSupplierV756','supplier'],['lpDateV756','date'],['lpReferenceV756','reference'],['lpFreightV756','freight'],['lpOtherV756','other']])logElV756(id).value=d[key]||'';logElV756('lpFreightIncludedV756').checked=d.freightIncluded;logElV756('lpOtherIncludedV756').checked=d.otherIncluded;purchasePaymentFillV757('lpPay',d);logRenderV756();}
function logAddV756(event){
 event?.preventDefault();if(!logOwnerV756()||logPurchaseBusyV756||logPurchaseDraftV756.pending||logPurchaseDraftV756.confirmed)return;
 try{
  const row={id:crypto.randomUUID(),especie:logElV756('lpSpeciesV756').value.trim(),diametro:Number(logElV756('lpDiameterV756').value),comprimento:Number(logElV756('lpLengthV756').value),quantidade:Number(logElV756('lpQuantityV756').value),unitCents:financeCents(logElV756('lpUnitV756').value)};
  const draft=logReadV756(),next={...draft,lines:groupLogPurchaseLinesV756([...draft.lines,row])};normalizeLogPurchaseV756({...logRawV756(next,false),supplier:next.supplier||'Fornecedor a preencher'});logStoreV756(next);logRenderV756();logStatusV756('Toras adicionadas à lista. Confirme a compra para registrar no financeiro.');logElV756('lpDiameterV756').value='';
 }catch(e){logStatusV756(e.message);}
}
function logRemoveV756(event){const button=event.target.closest('[data-lp-remove]');if(!button||logPurchaseBusyV756||logPurchaseDraftV756.pending||logPurchaseDraftV756.confirmed)return;try{const n=Number(button.dataset.lpRemove);if(!Number.isSafeInteger(n)||n<0||n>=logPurchaseDraftV756.lines.length)return;logStoreV756({...logReadV756(),lines:logPurchaseDraftV756.lines.filter((_,i)=>i!==n)});logRenderV756();logStatusV756('Medida retirada da lista.');}catch(e){logStatusV756(e.message);}}
async function logRequestV756(action,purchase,range){
 if(!logOwnerV756())throw Error('A compra de toras é exclusiva do responsável pela empresa.');
 if(!navigator.onLine)throw Error('Conecte-se à internet. O rascunho foi preservado.');
 const user=authV456.currentUser;if(!user)throw Error('Entre novamente.');
 const query=range?'?'+new URLSearchParams(range):'',response=await fetch('/.netlify/functions/company-log-purchase'+query,{method:range?'GET':'POST',headers:{Authorization:'Bearer '+await user.getIdToken(),...(range?{}:{'Content-Type':'application/json'})},...(range?{}:{body:JSON.stringify({action,purchase})}),signal:AbortSignal.timeout(30000)}),result=await response.json();
 if(!response.ok){const error=Error(result.error||'Não foi possível registrar a compra de toras.');error.status=response.status;throw error;}return result;
}
async function logConfirmV756(){
 if(!logOwnerV756()||logPurchaseBusyV756||logPurchaseDraftV756.confirmed)return;
 if(window.__v456Local.durable===false){logStatusV756('Permita o armazenamento neste navegador para preservar a confirmação.');return;}
 const context={company:logPurchaseCompanyV756,root:logPurchaseRootV756};
 let payload;try{if(!navigator.onLine)throw Error('Conecte-se à internet para confirmar.');if(logPurchaseDraftV756.pending)payload=logPurchaseDraftV756.pending;else{const draft=logReadV756();payload=logRawV756(draft);if(logElV756('lpPayModeV757')){const base=normalizeLogPurchaseV756({...payload,payment:undefined});payload.payment=purchasePaymentInputV757(draft,base.totalCents,base.date,true);}normalizeLogPurchaseV756(payload);logStoreV756({...draft,pending:payload});}}catch(e){logStatusV756(e.message);return;}
 logPurchaseBusyV756=true;logRenderV756();logStatusV756('Confirmando compra de toras e financeiro…');
 try{
  const result=await logRequestV756('confirm',payload);if(!logContextV756(context))return;logStoreV756({...logPurchaseDraftV756,pending:null,confirmed:true});financeLoadedRangeV722=null;
  logPurchaseRowsV756=[result.receipt,...logPurchaseRowsV756.filter(r=>r.id!==result.receipt.id)];logHistoryRenderV756();logStatusV756(result.receipt.status==='cancelled'?'Esta compra já havia sido cancelada. Confira o histórico.':'Compra de toras confirmada: '+finMoneyV722(result.receipt.totalCents)+' registrada uma única vez no financeiro.');
 }catch(e){if(!logContextV756(context))return;if([400,403,413].includes(e.status))try{logStoreV756({...logPurchaseDraftV756,pending:null});}catch{}logStatusV756(e.message+(logPurchaseDraftV756.pending?' Use Conferir confirmação / tentar novamente. A identificação foi preservada para não duplicar.':' O rascunho foi preservado.'));}
 finally{if(logContextV756(context)){logPurchaseBusyV756=false;logRenderV756();}}
}
function logHistoryRenderV756(){
 logElV756('lpHistoryV756').innerHTML=logPurchaseRowsV756.map(row=>'<details class="lp-receipt-v756"><summary>'+esc(row.date.split('-').reverse().join('/'))+' · '+esc(row.supplier)+' · '+finMoneyV722(row.totalCents)+(row.status==='cancelled'?' · Cancelada':'')+'</summary><p>'+row.totalQuantity+' tora(s) · '+num4(row.totalVolume)+' m³</p>'+row.lines.map(line=>'<p>'+esc(line.especie)+' · '+line.quantidade+' tora(s) · Ø '+line.diametro+' cm · '+line.comprimento+' m · '+num4(line.volume)+' m³ · '+finMoneyV722(line.unitCents)+'/m³</p>').join('')+'<p>Toras: '+finMoneyV722(row.goodsCents)+' · Gastos acrescentados: '+finMoneyV722(row.addedCents)+' · Total: '+finMoneyV722(row.totalCents)+'</p>'+(row.reference?'<p>Documento: '+esc(row.reference)+'</p>':'')+(row.status==='active'?'<button type="button" class="btn btn-danger" data-lp-cancel="'+esc(row.id)+'">Cancelar compra e financeiro</button>':'')+'</details>').join('')||'<p class="note">Nenhuma compra de toras neste período.</p>';
}
async function logHistoryLoadV756(){
 if(logPurchaseBusyV756||!logOwnerV756())return;
 const context={company:logPurchaseCompanyV756,root:logPurchaseRootV756};
 logPurchaseBusyV756=true;logRenderV756();logStatusV756('Consultando compras de toras…');
 try{const result=await logRequestV756(null,null,{from:logElV756('lpFromV756').value,to:logElV756('lpToV756').value});if(!logContextV756(context))return;if(result.empresaId!==logPurchaseCompanyV756)throw Error('A empresa mudou.');logPurchaseCanWriteV756=result.canWrite;logPurchaseRowsV756=result.receipts;logHistoryRenderV756();logStatusV756('Histórico atualizado.'+(result.canWrite?'':' Acesso somente para consulta.'));}catch(e){if(logContextV756(context))logStatusV756(e.message);}finally{if(logContextV756(context)){logPurchaseBusyV756=false;logRenderV756();}}
}
async function logCancelV756(id){
 if(logPurchaseBusyV756||!logOwnerV756()||!logPurchaseCanWriteV756)return;const row=logPurchaseRowsV756.find(r=>r.id===id);if(!row||row.status!=='active'||!confirm('Cancelar esta compra de '+finMoneyV722(row.totalCents)+' e seu registro financeiro? O histórico será preservado.'))return;
 const context={company:logPurchaseCompanyV756,root:logPurchaseRootV756};
 logPurchaseBusyV756=true;logRenderV756();logStatusV756('Cancelando compra e financeiro…');
 try{const result=await logRequestV756('cancel',{companyId:logPurchaseCompanyV756,id:row.id,revision:row.revision});if(!logContextV756(context))return;logPurchaseRowsV756=logPurchaseRowsV756.map(r=>r.id===id?result.receipt:r);financeLoadedRangeV722=null;logHistoryRenderV756();logStatusV756('Compra cancelada no histórico e no financeiro.');}catch(e){if(logContextV756(context))logStatusV756(e.message+' Atualize o histórico antes de tentar novamente.');}finally{if(logContextV756(context)){logPurchaseBusyV756=false;logRenderV756();}}
}
function openLogPurchaseV756(){if(!logOwnerV756())return;document.getElementById('btnCubagemToras')?.click();document.getElementById('lpShowV756')?.click();}
function mountLogPurchaseV756({dialog,doc}){
 if(logPurchaseCompanyV756&&(!logOwnerV756()||logPurchaseCompanyV756!==empresaV456)){
  doc.getElementById('torasPurchasesV756')?.remove();doc.getElementById('lpNavV756')?.remove();dialog.querySelector('.toras-layout').hidden=false;
  logPurchaseRootV756=null;logPurchaseDraftV756=null;logPurchaseRowsV756=[];logPurchaseCompanyV756=null;logPurchaseBusyV756=false;logPurchaseCanWriteV756=true;
 }
 if(!logOwnerV756()||doc.getElementById('torasPurchasesV756'))return;
 logPurchaseCompanyV756=empresaV456;
 const nav=doc.createElement('div');nav.id='lpNavV756';nav.className='lp-nav-v756 no-print';nav.innerHTML='<button type="button" class="btn btn-secondary" id="lpCubageV756" aria-pressed="true">Cubagem / mão de obra</button><button type="button" class="btn btn-secondary" id="lpShowV756" aria-pressed="false">Compras de toras</button>';dialog.querySelector('.toras-cabecalho').after(nav);
 const root=doc.createElement('section');root.id='torasPurchasesV756';root.className='no-print';root.hidden=true;root.innerHTML=`<h3>Compra de toras</h3><div id="lpDraftV756"><div class="grid3"><label>Fornecedor<input id="lpSupplierV756" maxlength="120"></label><label>Data da compra<input type="date" id="lpDateV756"></label><label>Nota / documento (opcional)<input id="lpReferenceV756" maxlength="120"></label></div><form id="lpFormV756"><div class="grid3"><label>Espécie<input id="lpSpeciesV756" maxlength="100" required></label><label>Diâmetro (cm)<input type="number" step="any" min="0.01" id="lpDiameterV756" required></label><label>Comprimento (m)<input type="number" step="any" min="0.01" id="lpLengthV756" required></label><label>Quantidade de toras<input type="number" step="1" min="1" id="lpQuantityV756" value="1" required></label><label>Preço de compra por m³ (R$)<input inputmode="decimal" id="lpUnitV756" required></label></div><button type="submit" class="btn btn-primary" id="lpAddV756">Adicionar toras à compra</button></form><p class="note">Cubagem pelo diâmetro da ponta fina, sem desconto de casca. Espécie, medida e preço iguais são agrupados.</p><div class="grid3"><label>Frete da compra (R$)<input inputmode="decimal" id="lpFreightV756" placeholder="0,00"></label><label>Outros gastos da compra (R$)<input inputmode="decimal" id="lpOtherV756" placeholder="0,00"></label></div><label class="lp-check-v756"><input type="checkbox" id="lpFreightIncludedV756"> Frete já incluído no preço por m³</label><label class="lp-check-v756"><input type="checkbox" id="lpOtherIncludedV756"> Outros gastos já incluídos no preço por m³</label>${purchasePaymentFieldsV757('lpPay')}<div id="lpLinesV756"></div><p id="lpTotalV756"></p></div><div class="row-actions"><button type="button" class="btn btn-primary" id="lpConfirmV756">Confirmar compra e financeiro</button><button type="button" class="btn btn-secondary" id="lpNewV756">Nova compra</button></div><p id="lpStatusV756" role="status"></p><h3>Histórico de compras de toras</h3><div class="grid3"><label>De<input type="date" id="lpFromV756"></label><label>Até<input type="date" id="lpToV756"></label><button type="button" class="btn btn-secondary" id="lpHistoryLoadV756">Consultar compras</button></div><div id="lpHistoryV756"></div>`;
 dialog.append(root);logPurchaseRootV756=root;
 try{const saved=JSON.parse(window.__v456Local.getItem(logKeyV756())||'null');logPurchaseDraftV756=saved&&saved.id&&Array.isArray(saved.lines)?saved:logFreshV756();}catch{logPurchaseDraftV756=logFreshV756();}
 const select=purchase=>{if(!logOwnerV756())return;dialog.querySelector('.toras-layout').hidden=purchase;root.hidden=!purchase;nav.querySelector('#lpShowV756').setAttribute('aria-pressed',String(purchase));nav.querySelector('#lpCubageV756').setAttribute('aria-pressed',String(!purchase));if(purchase&&!root.dataset.loaded){root.dataset.loaded='1';logHistoryLoadV756();}};
 nav.querySelector('#lpShowV756').onclick=()=>select(true);nav.querySelector('#lpCubageV756').onclick=()=>select(false);
 logElV756('lpFormV756').onsubmit=logAddV756;
 for(const id of ['lpSupplierV756','lpDateV756','lpReferenceV756','lpFreightV756','lpOtherV756','lpFreightIncludedV756','lpOtherIncludedV756','lpPayModeV757','lpPayDueV757','lpPayAmountV757','lpPayDateV757'])logElV756(id)?.addEventListener('change',()=>{if(logPurchaseBusyV756||logPurchaseDraftV756.pending||logPurchaseDraftV756.confirmed)return;try{purchasePaymentVisibilityV757('lpPay');logStoreV756(logReadV756());logRenderV756();}catch(e){logStatusV756(e.message);}});
 logElV756('lpLinesV756').addEventListener('click',logRemoveV756);
 logElV756('lpConfirmV756').onclick=logConfirmV756;
 logElV756('lpNewV756').onclick=()=>{if(logPurchaseBusyV756||logPurchaseDraftV756.pending)return;if(logPurchaseDraftV756.lines.length&&!logPurchaseDraftV756.confirmed&&!confirm('Descartar a lista ainda não confirmada?'))return;try{logStoreV756(logFreshV756());logFillV756();logStatusV756('Nova compra de toras.');}catch(e){logStatusV756(e.message);}};
 logElV756('lpHistoryLoadV756').onclick=logHistoryLoadV756;
 logElV756('lpHistoryV756').addEventListener('click',event=>{const button=event.target.closest('[data-lp-cancel]');if(button)logCancelV756(button.dataset.lpCancel);});
 const today=logFreshV756().date;logElV756('lpFromV756').value=today.slice(0,8)+'01';logElV756('lpToV756').value=today;logFillV756();if(logPurchaseDraftV756.pending)logStatusV756('Há uma confirmação pendente. Use Conferir confirmação / tentar novamente.');
}
