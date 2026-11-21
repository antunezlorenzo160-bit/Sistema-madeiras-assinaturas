// Initial liabilities do not create stock, purchases in the period or cash outflows.
let initialDebtBusyV811=false,initialDebtCompanyV811=null,initialDebtPendingV811=null;
const initialDebtKeyV811=()=> 'initial_debt_v811:'+empresaV456;
function initialDebtStoreV811(value){if(value&&value.companyId!==empresaV456)throw Error('A empresa mudou.');const raw=JSON.stringify(value);window.__v456Local.setItem(initialDebtKeyV811(),raw);if(window.__v456Local.getItem(initialDebtKeyV811())!==raw)throw Error('Não foi possível preservar a tentativa.');initialDebtPendingV811=value;}
function initialDebtLockV811(){const root=cashElV759('initialDebtV811');if(!root)return;for(const input of root.querySelectorAll('input'))input.disabled=initialDebtBusyV811||!!initialDebtPendingV811;cashElV759('initialDebtSaveV811').disabled=initialDebtBusyV811;cashElV759('initialDebtSaveV811').textContent=initialDebtPendingV811?'Conferir tentativa / tentar novamente':'Registrar dívida anterior';}
async function initialDebtSaveV811(event){
 event?.preventDefault();if(initialDebtBusyV811||!finOwnerV722())return;const status=cashElV759('initialDebtStatusV811'),company=empresaV456;
 try{
  if(!navigator.onLine)throw Error('Conecte-se à internet. Os campos foram preservados.');if(window.__v456Local.durable===false)throw Error('Permita o armazenamento para preservar a tentativa.');
  if(!initialDebtPendingV811){const get=suffix=>cashElV759('initialDebt'+suffix+'V811').value,payload=normalizeInitialDebtV811({companyId:company,id:crypto.randomUUID(),date:get('Date'),supplier:get('Supplier'),reference:get('Reference'),amountCents:purchasePaymentCentsV758(get('Amount')),dueDate:get('Due')});initialDebtStoreV811(payload);}
  if(initialDebtPendingV811.companyId!==company)throw Error('A empresa mudou. Reabra o caixa.');
 }catch(e){status.textContent=e.message;return;}
 initialDebtBusyV811=true;initialDebtLockV811();status.textContent='Registrando a dívida anterior…';
 try{const result=await financeRequestV722(initialDebtPendingV811,null,'company-initial-debt');if(company!==empresaV456||!finOwnerV722())return;initialDebtStoreV811(null);cashElV759('initialDebtFormV811').reset();cashElV759('initialDebtDateV811').value=cashDayV759();status.textContent=result.entry.status==='cancelled'?'Esta dívida já havia sido cancelada e não foi reativada.':'Dívida anterior registrada: '+finMoneyV722(result.entry.amountCents)+'. Sem nova compra, estoque ou saída de caixa. Confira em Contas a pagar.';financeLoadedRangeV722=null;}
 catch(e){if(company!==empresaV456||!finOwnerV722())return;if([400,404,413].includes(e.status))try{initialDebtStoreV811(null);}catch{}status.textContent=e.message+(initialDebtPendingV811?' Use Conferir tentativa / tentar novamente. A identificação foi preservada para não duplicar.':' Os campos foram preservados.');}
 finally{initialDebtBusyV811=false;if(company===empresaV456&&finOwnerV722())initialDebtLockV811();}
}
function mountInitialDebtV811(){
 const root=cashElV759('initialDebtV811');if(!root||!finOwnerV722())return;
 if(initialDebtCompanyV811!==empresaV456){initialDebtCompanyV811=empresaV456;initialDebtPendingV811=null;cashElV759('initialDebtFormV811').reset();cashElV759('initialDebtStatusV811').textContent='';cashElV759('initialDebtDateV811').value=cashDayV759();try{initialDebtPendingV811=JSON.parse(window.__v456Local.getItem(initialDebtKeyV811())||'null');}catch{}if(initialDebtPendingV811){for(const [suffix,key] of [['Supplier','supplier'],['Date','date'],['Due','dueDate'],['Reference','reference']])cashElV759('initialDebt'+suffix+'V811').value=initialDebtPendingV811[key]||'';cashElV759('initialDebtAmountV811').value=(initialDebtPendingV811.amountCents/100).toFixed(2).replace('.',',');}if(initialDebtPendingV811)cashElV759('initialDebtStatusV811').textContent='Há uma tentativa pendente neste aparelho. Confira antes de registrar outra dívida.';}
 cashElV759('initialDebtFormV811').onsubmit=initialDebtSaveV811;initialDebtLockV811();
}
