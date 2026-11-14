// A total in metres is not a physical piece length or a known piece count.
export function isLinearTotalV744(item){return (item?.tipoMedida||item?.tipoCadastro)==='linear'&&item.linearTotalV744===true;}
export function linearEntryV744(length,quantity){
 const metres=Number(String(length??'').trim().replace(',','.')),raw=String(quantity??'').trim(),pieces=raw===''?null:Number(raw);
 if(!Number.isFinite(metres)||metres<=0||metres>1e9)throw Error('Informe um comprimento ou uma metragem total positiva.');
 if(pieces!==null&&(!Number.isSafeInteger(pieces)||pieces<1))throw Error('Informe uma quantidade inteira positiva ou deixe vazia para lançar a metragem total.');
 const volume=metres*(pieces??1);if(!Number.isFinite(volume)||volume>1e9)throw Error('Metragem acima do limite.');
 return pieces===null?{linearTotalV744:true,quantidade:0,comprimento:0,volume,volumeReal:volume}:{quantidade:pieces,comprimento:metres,volume,volumeReal:volume};
}
export function linearPieceTextV744(item){return isLinearTotalV744(item)?'—':item.quantidade;}
export function linearUnitsV744(item){return Number(isLinearTotalV744(item)?item.volume:item.quantidade)||0;}
export function linearMatchV744(stock,request){
 if(!isLinearTotalV744(stock)&&!isLinearTotalV744(request))return null;
 if(!isLinearTotalV744(request)||(stock.tipoMedida||stock.tipoCadastro)!=='linear')return false;
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
 const wood=stock.madeiraId&&request.madeiraId&&String(stock.madeiraId)===String(request.madeiraId)||norm(stock.madeira)&&norm(stock.madeira)===norm(request.madeira);
 return Boolean(wood&&norm(stock.produto||stock.tipoLinear)===norm(request.produto||request.tipoLinear));
}
export function linearRemainderV744(previous,next){
 if((previous.tipoMedida||previous.tipoCadastro)!=='linear')return next;
 const quantity=Number(next.quantidade||0),nearest=Math.round(quantity);
 if(isLinearTotalV744(previous)||Math.abs(quantity-nearest)>1e-8)return {...next,linearTotalV744:true,quantidade:0,comprimento:0,comprimentoCobrado:0,volumeReal:Number(next.volume||0)};
 return {...next,quantidade:nearest,volumeReal:Number(next.volume||0)};
}
export function linearConferenceV744(items,sourceFor,match,isGreen){
 const virtual=new Map(),missing=[];
 for(const item of [...items].sort((a,b)=>Number(isLinearTotalV744(a))-Number(isLinearTotalV744(b)))){
  const source=sourceFor(item);if(!virtual.has(source.arr))virtual.set(source.arr,source.arr.map(x=>({...x})));
  const rows=virtual.get(source.arr),requested=Math.max(0,linearUnitsV744(item));let remaining=requested,available=0;
  for(let n=0;n<rows.length;n++){
   const row=rows[n];if(!match(row,item)||(source.verde?!isGreen(row):isGreen(row)))continue;
   const amount=Math.max(0,Number(isLinearTotalV744(item)?row.volume:row.quantidade)||0);available+=amount;if(remaining<=0||amount<=0)continue;
   const used=Math.min(remaining,amount),factor=(amount-used)/amount;
   rows[n]=linearRemainderV744(row,{...row,quantidade:Number(row.quantidade||0)*factor,volume:Number(row.volume||0)*factor,valor:Number(row.valor||0)*factor});remaining-=used;
  }
  if(remaining>1e-8)missing.push({ref:item,disponivel:available,solicitado:requested,faltam:remaining,estoque:source.nome,fonte:source});
 }
 return missing;
}
