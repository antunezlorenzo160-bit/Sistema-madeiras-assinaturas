// Read-only display totals; item records and prices are never changed.
export function sheetItemTotals(items,includeValue=false){
 const groups=new Map();const number=v=>Number.isFinite(Number(v))?Number(v):0;
 for(const i of items){
  const kind=i.tipoMedida||'m3',unit=kind==='m2'?'m²':kind==='linear'?'m':'m³';
  const wood=String(i.madeira||i.especie||i.produto||'Madeira'),product=String(i.produto||''),thickness=kind==='m3'?number(i.espessura):null;
  const key=JSON.stringify([wood,product,thickness,kind]);
  if(!groups.has(key))groups.set(key,{wood,product,thickness,kind,unit,quantity:0,volume:0,face:0,linear:0,weight:0,faceMissing:0,linearMissing:0,weightMissing:0,value:0,count:0});
  const g=groups.get(key),q=number(i.quantidade),v=number(i.volume),length=number(i.comprimento),width=number(i.largura);g.count++;g.volume+=v;if(kind!=='granel')g.quantity+=q;
  if(kind==='m2')g.face+=v;else if(kind==='m3'&&width>0&&length>0&&q>0)g.face+=width/100*length*q;else g.faceMissing++;
  if(kind==='linear')g.linear+=v;else if(kind!=='granel'&&length>0&&q>0)g.linear+=length*q;else g.linearMissing++;
  const density=number(i.pesoReferenciaV420?.kgM3);if(['m3','granel'].includes(kind)&&density>0&&v>=0)g.weight+=density*v;else g.weightMissing++;
  if(includeValue)g.value+=number(i.valorMaterial??i.valor)+(kind==='m3'?number(i.valorEndireitamento)+number(i.valorAplainamento):0);
 }
 return [...groups.values()].map(g=>{
  const fmt=(n,d)=>n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const title=[g.wood,g.product&&!g.wood.toLowerCase().includes(g.product.toLowerCase())?g.product:'',g.thickness>0?'Esp. '+g.thickness.toLocaleString('pt-BR',{maximumFractionDigits:3})+' cm':''].filter(Boolean).join(' — ');
  const parts=[g.kind==='granel'?'A granel':fmt(g.quantity,0)+' pç',fmt(g.volume,g.unit==='m³'?4:2)+' '+g.unit];
  if(g.faceMissing<g.count)parts.push('Área de face: '+fmt(g.face,4)+' m²'+(g.faceMissing?' (parcial)':''));
  if(g.linearMissing<g.count)parts.push('Metros lineares: '+fmt(g.linear,2)+' m'+(g.linearMissing?' (parcial)':''));
  parts.push(g.weightMissing===g.count?'Peso: não informado':'Peso: '+fmt(g.weight,1)+' kg'+(g.weightMissing?' (parcial)':''));
  if(includeValue)parts.push('Valor: R$ '+fmt(g.value,2));
  return {...g,title,text:title+': '+parts.join(' · ')};
 });
}
