export function movementDirection(item){if(item.transferencia)return 'transferencia';if(item.tipo==='entrada')return 'entrada';if(item.tipo==='saida')return 'saida';return 'ajuste';}
export function movementUnit(item){const t=item.tipoCadastro||item.tipoMedida||'m3';return t==='m2'?'m2':t==='linear'?'linear':'m3';}
export function groupMovementDays(items,options={}){
 const groups=new Map();
 for(const item of items){
  const direction=movementDirection(item);if(options.kind&&options.kind!=='todas'&&direction!==options.kind)continue;
  const name=String(item.madeira||item.produto||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(options.search&&!name.includes(String(options.search).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()))continue;
  const day=options.dayOf(item);
  if(options.from&&day<options.from||options.to&&day>options.to)continue;
  if(!groups.has(day))groups.set(day,{day,entrada:[],saida:[],transferencia:[],ajuste:[],totals:{entrada:{m3:0,m2:0,linear:0},saida:{m3:0,m2:0,linear:0}}});
  const g=groups.get(day);g[direction].push(item);
  if(direction==='entrada'||direction==='saida')g.totals[direction][movementUnit(item)]+=Math.abs(Number(item.volume||0));
 }
 return [...groups.values()].sort((a,b)=>b.day.localeCompare(a.day));
}
