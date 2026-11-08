// Purchase values are private financial data; public stock rows only carry physical references.
const purchaseUuidV728=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function purchaseVolumeUnits(value){const n=Number(value),units=Math.round(n*1e9);if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(units))throw Error('Volume de compra inválido.');return units;}
export function stockCostKey(item){
 const kind=item.tipoMedida||item.tipoCadastro||'m3';if(!['m3','granel'].includes(kind)||!item.madeiraId)return null;
 const num=k=>Number(item[k]||0).toFixed(6),green=item.estadoMadeira==='verde'||item.origemMadeira==='verde'||item.origemMovimentacao==='Mad. verde';
 return JSON.stringify([item.madeiraId,kind,green?'verde':'seca',...(kind==='granel'?[]:['espessura','largura','comprimento'].map(num))]);
}
export function normalizeStockPurchase(input){
 const allowed=['companyId','id','date','supplier','reference','stock','freightCents','otherCents','freightIncluded','otherIncluded','lines'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k))||typeof input.companyId!=='string'||!/^[-\w]{1,120}$/.test(input.companyId)||!purchaseUuidV728.test(input.id||'')||!['estoque1','estoque2'].includes(input.stock))throw Error('Dados do descarregamento inválidos.');
 const date=String(input.date||''),d=new Date(date+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date)throw Error('Informe uma data válida.');
 const text=(value,max)=>{if(typeof value!=='string'||value.length>max||/[\u0000-\u001f]/.test(value))throw Error('Confira fornecedor e documento da compra.');return value.trim();};
 const supplier=text(input.supplier,120),reference=text(input.reference,180);if(!supplier)throw Error('Informe o fornecedor da compra.');
 const money=n=>{if(!Number.isSafeInteger(n)||n<0||n>100000000000)throw Error('Informe valores de compra válidos.');return n;};
 const freightCents=money(input.freightCents),otherCents=money(input.otherCents);
 if(typeof input.freightIncluded!=='boolean'||typeof input.otherIncluded!=='boolean'||!Array.isArray(input.lines)||input.lines.length<1||input.lines.length>200)throw Error('Adicione de 1 a 200 itens ao descarregamento.');
 const ids=new Set();let goodsCents=0;
 const lines=input.lines.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(k=>!['id','madeiraId','tipoMedida','largura','espessura','comprimento','quantidade','volume','estadoMadeira','secagemDias','unitCents'].includes(k))||!purchaseUuidV728.test(item.id||'')||ids.has(item.id)||typeof item.madeiraId!=='string'||!/^[-\w]{1,180}$/.test(item.madeiraId)||!['m3','granel'].includes(item.tipoMedida)||!['seca','verde'].includes(item.estadoMadeira))throw Error('Item do descarregamento inválido.');
  const secagemDias=item.secagemDias??0;if(!Number.isSafeInteger(secagemDias)||secagemDias<0||secagemDias>3650||item.estadoMadeira!=='verde'&&secagemDias!==0)throw Error('Prazo de secagem inválido.');
  ids.add(item.id);const unitCents=money(item.unitCents);if(!unitCents)throw Error('Informe o preço de compra por m³.');
  const physical={};for(const k of ['largura','espessura','comprimento','quantidade','volume']){const n=item[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1000000)throw Error('Medidas de compra inválidas.');physical[k]=n;}
  const expected=item.tipoMedida==='granel'?physical.volume:physical.largura/100*physical.espessura/100*physical.comprimento*physical.quantidade;
  if(!(expected>0)||item.tipoMedida==='m3'&&(!Number.isSafeInteger(physical.quantidade)||!physical.quantidade||!physical.largura||!physical.espessura||!physical.comprimento)||item.tipoMedida==='granel'&&(physical.largura!==0||physical.espessura!==0||physical.comprimento!==0||physical.quantidade!==physical.volume||item.estadoMadeira==='verde')||Math.abs(physical.volume-expected)>1e-8)throw Error('O volume não corresponde às medidas da compra.');
  const units=purchaseVolumeUnits(expected),amountCents=Number((BigInt(units)*BigInt(unitCents)+500000000n)/1000000000n);if(!amountCents)throw Error('O valor de cada item precisa ser de pelo menos um centavo.');goodsCents+=amountCents;
  return {id:item.id,madeiraId:item.madeiraId,tipoMedida:item.tipoMedida,...physical,volume:units/1e9,quantidade:item.tipoMedida==='granel'?units/1e9:physical.quantidade,estadoMadeira:item.estadoMadeira,secagemDias,unitCents,amountCents};
 });
 const addedCents=(input.freightIncluded?0:freightCents)+(input.otherIncluded?0:otherCents),totalCents=goodsCents+addedCents;if(!Number.isSafeInteger(totalCents)||totalCents>100000000000)throw Error('Valor do descarregamento acima do limite.');
 // Cumulative allocation assigns every cent exactly once, including the last line.
 let accumulated=0,allocated=0;for(const line of lines){accumulated+=line.amountCents;const target=Number((BigInt(addedCents)*BigInt(accumulated)+BigInt(Math.floor(goodsCents/2)))/BigInt(goodsCents));line.acquisitionCents=line.amountCents+target-allocated;allocated=target;}
 return {companyId:input.companyId,id:input.id,date,supplier,reference,stock:input.stock,freightCents,otherCents,freightIncluded:input.freightIncluded,otherIncluded:input.otherIncluded,lines,goodsCents,addedCents,totalCents};
}
