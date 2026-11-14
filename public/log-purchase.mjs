import {normalizePurchasePaymentV757} from './purchase-payments.mjs';
import {volumeToras,chaveEspecieToras} from './toras.mjs';
const logPurchaseUuidV756=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function groupLogPurchaseLinesV756(lines){
 const result=new Map(),ids=new Set();
 for(const row of lines){
  if(ids.has(row.id))throw Error('Tora repetida na lista.');ids.add(row.id);
  volumeToras(row.diametro,row.comprimento,row.quantidade);
  const key=JSON.stringify([chaveEspecieToras(row.especie),row.diametro,row.comprimento,row.unitCents]),saved=result.get(key);
  if(saved){saved.quantidade+=row.quantidade;volumeToras(saved.diametro,saved.comprimento,saved.quantidade);}else result.set(key,{...row});
 }
 return [...result.values()];
}
export function normalizeLogPurchaseV756(input){
 const fields=['companyId','id','date','supplier','reference','freightCents','otherCents','freightIncluded','otherIncluded','lines','payment'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!fields.includes(k))||typeof input.companyId!=='string'||!/^[-\w]{1,120}$/.test(input.companyId)||!logPurchaseUuidV756.test(input.id||''))throw Error('Dados da compra de toras inválidos.');
 const date=String(input.date||''),parsed=new Date(date+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw Error('Informe uma data válida.');
 const text=(value,max,required=false)=>{if(typeof value!=='string'||value.length>max||/[\u0000-\u001f]/.test(value)||required&&!value.trim())throw Error('Confira fornecedor, espécie e documento.');return value.trim();};
 const supplier=text(input.supplier,120,true),reference=text(input.reference,120);
 const money=value=>{if(!Number.isSafeInteger(value)||value<0||value>100000000000)throw Error('Valor da compra de toras inválido.');return value;};
 const freightCents=money(input.freightCents),otherCents=money(input.otherCents);
 if(typeof input.freightIncluded!=='boolean'||typeof input.otherIncluded!=='boolean'||!Array.isArray(input.lines)||!input.lines.length||input.lines.length>200)throw Error('Adicione de 1 a 200 medidas agrupadas de toras.');
 const ids=new Set();let goodsCents=0,totalVolumeUnits=0,totalQuantity=0;
 const lines=input.lines.map(row=>{
  if(!row||typeof row!=='object'||Object.keys(row).some(k=>!['id','especie','diametro','comprimento','quantidade','unitCents'].includes(k))||!logPurchaseUuidV756.test(row.id||'')||ids.has(row.id))throw Error('Medida de tora inválida.');ids.add(row.id);
  const especie=text(row.especie,100,true);if(row.diametro>1000||row.comprimento>100||row.quantidade>1000000)throw Error('Medida de tora acima do limite.');
  const volume=volumeToras(row.diametro,row.comprimento,row.quantidade).total,volumeUnits=Math.round(volume*1e9);if(volume>1000000||!Number.isSafeInteger(volumeUnits)||volumeUnits<=0)throw Error('Volume de toras fora do limite.');
  const unitCents=money(row.unitCents);if(!unitCents)throw Error('Informe o preço de compra das toras por m³.');
  const amountCents=Number((BigInt(volumeUnits)*BigInt(unitCents)+500000000n)/1000000000n);if(amountCents<1)throw Error('O valor de cada medida precisa ser de pelo menos um centavo.');
  goodsCents+=amountCents;totalVolumeUnits+=volumeUnits;totalQuantity+=row.quantidade;
  return {id:row.id,especie,diametro:row.diametro,comprimento:row.comprimento,quantidade:row.quantidade,unitCents,volume:volumeUnits/1e9,amountCents};
 });
 const addedCents=(input.freightIncluded?0:freightCents)+(input.otherIncluded?0:otherCents),totalCents=goodsCents+addedCents;
 if(!Number.isSafeInteger(totalCents)||totalCents>100000000000||!Number.isSafeInteger(totalVolumeUnits)||!Number.isSafeInteger(totalQuantity))throw Error('Total da compra acima do limite.');
 let accumulated=0,allocated=0;for(const row of lines){accumulated+=row.amountCents;const target=Number((BigInt(addedCents)*BigInt(accumulated)+BigInt(Math.floor(goodsCents/2)))/BigInt(goodsCents));row.acquisitionCents=row.amountCents+target-allocated;allocated=target;}
 return {companyId:input.companyId,id:input.id,date,supplier,reference,freightCents,otherCents,freightIncluded:input.freightIncluded,otherIncluded:input.otherIncluded,lines,goodsCents,addedCents,totalCents,totalVolume:totalVolumeUnits/1e9,totalQuantity,...(input.payment!==undefined?{payment:normalizePurchasePaymentV757(input.payment,totalCents,date)}:{})};
}
