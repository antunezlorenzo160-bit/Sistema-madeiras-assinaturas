// A total in metres is not a physical piece length or a known piece count.
export function isLinearTotalV744(item){return (item?.tipoMedida||item?.tipoCadastro)==='linear'&&item.linearTotalV744===true;}
export function linearEntryV744(length,quantity){
 const metres=Number(String(length??'').trim().replace(',','.')),raw=String(quantity??'').trim(),pieces=raw===''?null:Number(raw);
 if(!Number.isFinite(metres)||metres<=0||metres>1e9)throw Error('Informe um comprimento ou uma metragem total positiva.');
 if(pieces!==null&&(!Number.isSafeInteger(pieces)||pieces<1))throw Error('Informe uma quantidade inteira positiva ou deixe vazia para lançar a metragem total.');
 const volume=metres*(pieces??1);if(!Number.isFinite(volume)||volume>1e9)throw Error('Metragem acima do limite.');
 return pieces===null?{linearTotalV744:true,quantidade:0,comprimento:0,volume,volumeReal:volume}:{quantidade:pieces,comprimento:metres,volume,volumeReal:volume};
}
export function linearPieceTextV744(item){return isLastroM3V825(item)?lastroLabelV826(item):isLinearTotalV744(item)?'—':item.quantidade;}
export function linearUnitsV744(item){return Number(isMeasuredTotalV825(item)?item.volume:item.quantidade)||0;}
export function linearMatchV744(stock,request){
 if(isLastroM3V825(stock)||isLastroM3V825(request)){if(!isLastroM3V825(stock)||!isLastroM3V825(request))return false;return String(stock.madeiraId)===String(request.madeiraId)&&['espessura','largura','comprimento'].every(k=>Math.abs(Number(stock[k])-Number(request[k]))<1e-8);}
 if(!isLinearTotalV744(stock)&&!isLinearTotalV744(request))return null;
 if(!isLinearTotalV744(request)||(stock.tipoMedida||stock.tipoCadastro)!=='linear')return false;
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
 const wood=stock.madeiraId&&request.madeiraId&&String(stock.madeiraId)===String(request.madeiraId)||norm(stock.madeira)&&norm(stock.madeira)===norm(request.madeira);
 return Boolean(wood&&norm(stock.produto||stock.tipoLinear)===norm(request.produto||request.tipoLinear));
}
export function linearRemainderV744(previous,next){
 if(isLastroM3V825(previous))return {...next,lastroM3V825:true,quantidade:0,volumeReal:Number(next.volume||0)};
 if((previous.tipoMedida||previous.tipoCadastro)!=='linear')return next;
 const quantity=Number(next.quantidade||0),nearest=Math.round(quantity);
 if(isLinearTotalV744(previous)||Math.abs(quantity-nearest)>1e-8)return {...next,linearTotalV744:true,quantidade:0,comprimento:0,comprimentoCobrado:0,volumeReal:Number(next.volume||0)};
 return {...next,quantidade:nearest,volumeReal:Number(next.volume||0)};
}
export function linearConferenceV744(items,sourceFor,match,isGreen){
 const virtual=new Map(),missing=[];
 for(const item of [...items].sort((a,b)=>Number(isMeasuredTotalV825(a))-Number(isMeasuredTotalV825(b)))){
  const source=sourceFor(item);if(!virtual.has(source.arr))virtual.set(source.arr,source.arr.map(x=>({...x})));
  const rows=virtual.get(source.arr),requested=Math.max(0,linearUnitsV744(item));let remaining=requested,available=0;
  for(let n=0;n<rows.length;n++){
   const row=rows[n];if(!match(row,item)||(source.verde?!isGreen(row):isGreen(row)))continue;
   const amount=Math.max(0,Number(isMeasuredTotalV825(item)?row.volume:row.quantidade)||0);available+=amount;if(remaining<=0||amount<=0)continue;
   const used=Math.min(remaining,amount),factor=(amount-used)/amount;
   rows[n]=linearRemainderV744(row,{...row,quantidade:Number(row.quantidade||0)*factor,volume:Number(row.volume||0)*factor,valor:Number(row.valor||0)*factor});remaining-=used;
  }
  if(remaining>1e-8)missing.push({ref:item,disponivel:available,solicitado:requested,faltam:remaining,estoque:source.nome,fonte:source});
 }
 return missing;
}

// A measured lastro retains dimensions, but has no known piece count.
export function isLastroM3V825(item){return (item?.tipoMedida||item?.tipoCadastro)==='m3'&&item.lastroM3V825===true;}
export function isMeasuredTotalV825(item){return isLinearTotalV744(item)||isLastroM3V825(item);}
export function lastroEntryV825(width,thickness,length){const [l,e,c]=[width,thickness,length].map(v=>Number(String(v??'').replace(',','.')));if(![l,e,c].every(v=>Number.isFinite(v)&&v>0&&v<=1e6))throw Error('Informe espessura, largura medida e comprimento do lastro.');const v=l/100*e/100*c;if(!Number.isFinite(v)||v<=0||v>1e9)throw Error('Volume de lastro inválido.');return {lastroM3V825:true,quantidade:0,largura:l,espessura:e,comprimento:c,volume:v,volumeReal:v,compensarPerda:false};}

export function isLastroInputV826(value){return /^(lastros?|lstr)\.?$/i.test(String(value??'').trim());}
export function lastroLabelV826(item){return String(Number(item.lastrosV826||item._itens||item._ids?.length||1))+' Lstr';}
