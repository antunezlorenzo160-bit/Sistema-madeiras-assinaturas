import {volumeToras,chaveEspecieToras} from './toras.mjs';
import {paymentDateV757,normalizePurchasePaymentV757} from './purchase-payments.mjs';
export const logLabourUuidV804=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export function logLabourIdsV804(ids){
 if(!Array.isArray(ids)||!ids.length||ids.length>200||ids.some(id=>typeof id!=='string'||!/^[-\w]{1,120}$/.test(id))||new Set(ids).size!==ids.length)throw Error('Selecione de 1 a 200 lançamentos diferentes da cubagem.');
 return ids.slice().sort();
}
export function normalizeLogLabourRowsV804(rows){
 logLabourIdsV804(rows?.map(row=>row?.id));const groups=new Map();
 const lines=rows.slice().sort((a,b)=>a.id.localeCompare(b.id)).map(row=>{
  if(row.ativo===false||typeof row.especie!=='string'||row.especie.length>100||/[\u0000-\u001f]/.test(row.especie)||typeof row.precoMaoObra!=='number'||!Number.isFinite(row.precoMaoObra)||row.precoMaoObra<=0||!Number.isSafeInteger(Math.round(row.precoMaoObra*100))||Math.abs(row.precoMaoObra*100-Math.round(row.precoMaoObra*100))>0.000001)throw Error('Confira as toras e o preço de mão de obra salvo em cada lançamento.');
  const formula=row.formula||'cilindrica';volumeToras(row.diametro,row.comprimento,row.quantidade,formula);
  const line={id:row.id,especie:row.especie.trim(),diametro:row.diametro,comprimento:row.comprimento,quantidade:row.quantidade,precoMaoObra:row.precoMaoObra,formula};
  const key=JSON.stringify([chaveEspecieToras(line.especie),line.diametro,line.comprimento,line.precoMaoObra,line.formula]);
  const old=groups.get(key);if(old)old.quantidade+=line.quantidade;else groups.set(key,{...line});return line;
 }).sort((a,b)=>a.id.localeCompare(b.id));
 let totalCents=0,totalVolume=0,totalQuantity=0;
 for(const group of groups.values()){const volume=volumeToras(group.diametro,group.comprimento,group.quantidade,group.formula).total;totalVolume+=volume;totalQuantity+=group.quantidade;totalCents+=Math.round((volume*group.precoMaoObra+Number.EPSILON)*100);}
 if(!Number.isSafeInteger(totalCents)||totalCents<=0||totalCents>100000000000||!Number.isSafeInteger(totalQuantity)||!Number.isFinite(totalVolume))throw Error('Valor ou quantidade da mão de obra fora do limite.');
 return {lines,totalCents,totalQuantity,totalVolume};
}
export function normalizeLogLabourV804(input){
 const fields=['companyId','id','client','date','description','reference','lines','payment'];
 if(!input||Object.keys(input).some(k=>!fields.includes(k))||typeof input.companyId!=='string'||!/^[-\w]{1,120}$/.test(input.companyId)||!logLabourUuidV804(input.id)||!paymentDateV757(input.date))throw Error('Confira a identificação e a data do serviço.');
 const text=(value,max,required=false)=>{if(typeof value!=='string'||value.length>max||/[\u0000-\u001f]/.test(value)||required&&!value.trim())throw Error('Confira cliente, descrição e referência do serviço.');return value.trim();};
 const client=text(input.client,120,true),description=text(input.description,180,true),reference=text(input.reference,120),totals=normalizeLogLabourRowsV804(input.lines);
 let payment;try{payment=normalizePurchasePaymentV757(input.payment,totals.totalCents,input.date);}catch(error){throw Error(error.message.replaceAll('compra','serviço').replaceAll('pagamento','recebimento').replaceAll('Pagamento','Recebimento'));}
 return {companyId:input.companyId,id:input.id.toLowerCase(),client,date:input.date,description,reference,...totals,payment};
}
export function logLabourPaidV804(receipt){const paid=(receipt.payments||[]).reduce((sum,p)=>sum+p.amountCents,0);if(!Number.isSafeInteger(paid)||paid<0||paid>receipt.totalCents)throw Error('Recebimentos inconsistentes. Atualize o serviço.');return paid;}
