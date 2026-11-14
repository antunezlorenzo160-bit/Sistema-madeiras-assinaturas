// Purchase values are private financial data; public stock rows only carry physical references.
const purchaseUuidV728=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function purchaseVolumeUnits(value){const n=Number(value),units=Math.round(n*1e9);if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(units))throw Error('Volume de compra inválido.');return units;}
export function stockCostKey(item){
 const kind=item.tipoMedida||item.tipoCadastro||'m3';if(!['m3','granel','m2','linear'].includes(kind)||!item.madeiraId)return null;
 if(kind==='linear'){const product=String(item.produto||'').trim();return product?JSON.stringify([item.madeiraId,kind,'seca',product]):null;}
 if(kind==='m2')return JSON.stringify([item.madeiraId,kind,'seca',Number(item.largura||0).toFixed(6),Number(item.comprimento||0).toFixed(6)]);
 const num=k=>Number(item[k]||0).toFixed(6),green=item.estadoMadeira==='verde'||item.origemMadeira==='verde'||item.origemMovimentacao==='Mad. verde';
 return JSON.stringify([item.madeiraId,kind,green?'verde':'seca',...(kind==='granel'?[]:['espessura','largura','comprimento'].map(num))]);
}
export function purchasePhysicalQuantityV755(item){
 const kind=item.tipoMedida||item.tipoCadastro||'m3';
 if(kind==='m3')return Number(item.largura)/100*Number(item.espessura)/100*Number(item.comprimento)*Number(item.quantidade);
 if(kind==='m2')return Number(item.largura)/100*Number(item.comprimento)*Number(item.quantidade);
 if(kind==='linear')return Number(item.comprimento)>0?Number(item.comprimento)*Number(item.quantidade):Number(item.volumeReal??item.volume);
 if(kind==='granel')return Number(item.volume);
 throw Error('Unidade de compra inválida.');
}
export function purchasePacketCountV755(item){
 if(item.purchasePacketsV755!==undefined)return item.quantidade===item.purchasePacketsV755*item.purchasePiecesPerPacketV755?item.purchasePacketsV755:0;
 return item.contadoComoPacote===true?1:0;
}
// Group only unconfirmed draft lines with identical physical and purchase conditions.
export function groupStockPurchaseLinesV754(lines){
 const groups=new Map(),ids=new Set();
 for(const line of lines){
  if(ids.has(line.id))throw Error('Item repetido na lista da compra.');ids.add(line.id);
  const key=JSON.stringify([line.madeiraId,line.tipoMedida,line.estadoMadeira,line.secagemDias??0,line.unitCents,line.largura,line.espessura,line.comprimento,line.produto||'',line.codigoProduto||'',line.linearTotalV744===true,line.purchasePiecesPerPacketV755||0]);
  const current=groups.get(key);
  if(!current){groups.set(key,{...line});continue;}
  current.quantidade+=line.quantidade;
  current.volume=['m3','m2'].includes(current.tipoMedida)||current.tipoMedida==='linear'&&current.comprimento>0?purchasePhysicalQuantityV755(current):(purchaseVolumeUnits(current.volume)+purchaseVolumeUnits(line.volume))/1e9;
  if(current.purchasePacketsV755)current.purchasePacketsV755+=line.purchasePacketsV755;
  if(current.tipoMedida==='granel')current.quantidade=current.volume;
 }
 return [...groups.values()];
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
  if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(k=>!['id','madeiraId','tipoMedida','largura','espessura','comprimento','quantidade','volume','estadoMadeira','secagemDias','unitCents','produto','codigoProduto','linearTotalV744','purchasePacketsV755','purchasePiecesPerPacketV755'].includes(k))||!purchaseUuidV728.test(item.id||'')||ids.has(item.id)||typeof item.madeiraId!=='string'||!/^[-\w]{1,180}$/.test(item.madeiraId)||!['m3','granel','m2','linear'].includes(item.tipoMedida)||!['seca','verde'].includes(item.estadoMadeira))throw Error('Item do descarregamento inválido.');
  const secagemDias=item.secagemDias??0;if(!Number.isSafeInteger(secagemDias)||secagemDias<0||secagemDias>3650||item.estadoMadeira!=='verde'&&secagemDias!==0)throw Error('Prazo de secagem inválido.');
  ids.add(item.id);const unitCents=money(item.unitCents);if(!unitCents)throw Error('Informe o preço de compra por unidade.');
  const physical={};for(const k of ['largura','espessura','comprimento','quantidade','volume']){const n=item[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1000000)throw Error('Medidas de compra inválidas.');physical[k]=n;}
  const kind=item.tipoMedida;
  const extra={};
  if(item.linearTotalV744!==undefined&&item.linearTotalV744!==true)throw Error('Indicador de metragem total inválido.');
  if(kind==='linear'){
   if(typeof item.produto!=='string'||!item.produto.trim()||item.produto.length>120||/[\u0000-\u001f]/.test(item.produto))throw Error('Informe o tipo de produto em metros lineares.');
   if(item.codigoProduto!==undefined&&(typeof item.codigoProduto!=='string'||item.codigoProduto.length>120||/[\u0000-\u001f]/.test(item.codigoProduto)))throw Error('Código do produto inválido.');
   extra.produto=item.produto.trim();extra.codigoProduto=item.codigoProduto||'';
   if(item.linearTotalV744===true)extra.linearTotalV744=true;
  }else if(item.produto!==undefined||item.codigoProduto!==undefined||item.linearTotalV744!==undefined)throw Error('Dados lineares em outra unidade.');
  if(item.purchasePacketsV755!==undefined||item.purchasePiecesPerPacketV755!==undefined){
   if(kind!=='m2'||!Number.isSafeInteger(item.purchasePacketsV755)||item.purchasePacketsV755<1||!Number.isSafeInteger(item.purchasePiecesPerPacketV755)||item.purchasePiecesPerPacketV755<1||item.purchasePacketsV755*item.purchasePiecesPerPacketV755!==physical.quantidade)throw Error('Confira as peças e os pacotes da compra.');
   extra.purchasePacketsV755=item.purchasePacketsV755;extra.purchasePiecesPerPacketV755=item.purchasePiecesPerPacketV755;
  }
  if(kind!=='m3'&&(item.estadoMadeira!=='seca'||secagemDias!==0))throw Error('Madeira verde por compra é informada em m³.');
  if(kind==='m2'&&(!physical.largura||!physical.comprimento||!Number.isSafeInteger(physical.quantidade)||!physical.quantidade))throw Error('Confira largura, comprimento e peças da compra em m².');
  if(kind==='linear'&&(physical.largura!==0||physical.espessura!==0||(item.linearTotalV744===true?(physical.comprimento!==0||physical.quantidade!==0):(!physical.comprimento||!Number.isSafeInteger(physical.quantidade)||!physical.quantidade))))throw Error('Confira a metragem ou as peças da compra linear.');
  const expected=purchasePhysicalQuantityV755({...physical,tipoMedida:kind});
  if(!(expected>0)||item.tipoMedida==='m3'&&(!Number.isSafeInteger(physical.quantidade)||!physical.quantidade||!physical.largura||!physical.espessura||!physical.comprimento)||item.tipoMedida==='granel'&&(physical.largura!==0||physical.espessura!==0||physical.comprimento!==0||physical.quantidade!==physical.volume||item.estadoMadeira==='verde')||Math.abs(physical.volume-expected)>1e-8)throw Error('O volume não corresponde às medidas da compra.');
  const units=purchaseVolumeUnits(expected),amountCents=Number((BigInt(units)*BigInt(unitCents)+500000000n)/1000000000n);if(!amountCents)throw Error('O valor de cada item precisa ser de pelo menos um centavo.');goodsCents+=amountCents;
  return {id:item.id,madeiraId:item.madeiraId,tipoMedida:item.tipoMedida,...physical,volume:units/1e9,quantidade:item.tipoMedida==='granel'?units/1e9:physical.quantidade,estadoMadeira:item.estadoMadeira,secagemDias,unitCents,amountCents,...extra};
 });
 const addedCents=(input.freightIncluded?0:freightCents)+(input.otherIncluded?0:otherCents),totalCents=goodsCents+addedCents;if(!Number.isSafeInteger(totalCents)||totalCents>100000000000)throw Error('Valor do descarregamento acima do limite.');
 // Cumulative allocation assigns every cent exactly once, including the last line.
 let accumulated=0,allocated=0;for(const line of lines){accumulated+=line.amountCents;const target=Number((BigInt(addedCents)*BigInt(accumulated)+BigInt(Math.floor(goodsCents/2)))/BigInt(goodsCents));line.acquisitionCents=line.amountCents+target-allocated;allocated=target;}
 return {companyId:input.companyId,id:input.id,date,supplier,reference,stock:input.stock,freightCents,otherCents,freightIncluded:input.freightIncluded,otherIncluded:input.otherIncluded,lines,goodsCents,addedCents,totalCents};
}
