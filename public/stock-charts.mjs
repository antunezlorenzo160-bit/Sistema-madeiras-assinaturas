// Read-only chart data. Current inventory comes from remaining stock rows, never from history.
const chartKindsV720=new Set(['m3','m2','linear','granel']);
export function stockChartKind(item){return item.tipoMedida||item.tipoCadastro||'m3';}
export function stockChartName(item){
 const species=String(item.especie||'').trim(),product=String(item.produto||'').trim();
 if(species&&product)return [species,product,String(item.qualidade||'').trim()].filter(Boolean).join(' — ');
 return String(item.madeira||species||product||'Sem identificação').trim()||'Sem identificação';
}
export function stockChartDate(value){
 if(typeof value!=='string')return null;
 let match=value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/),year,month,day;
 if(match)[,year,month,day]=match;
 else{match=value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:$|[ ,])/);if(!match)return null;[,day,month,year]=match;}
 const result=new Date(Date.UTC(Number(year),Number(month)-1,Number(day)));
 if(result.getUTCFullYear()!==Number(year)||result.getUTCMonth()+1!==Number(month)||result.getUTCDate()!==Number(day))return null;
 return [year,String(month).padStart(2,'0'),String(day).padStart(2,'0')].join('-');
}
export function stockChartMovementDay(item){
 // A malformed recorded date is reported, not replaced by its later edit/sync date.
 if(item.data)return stockChartDate(item.data);
 const stamp=Number(item.atualizadoEm);if(!Number.isFinite(stamp)||stamp<=0)return null;
 const d=new Date(stamp);if(!Number.isFinite(d.getTime()))return null;
 return stockChartDate(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'));
}
export function stockChartPeriods(from,to,group='day'){
 if(stockChartDate(from)!==from||stockChartDate(to)!==to||from>to)throw Error('Confira as datas: o início precisa ser anterior ou igual ao fim.');
 if(!['day','month'].includes(group))throw Error('Agrupamento inválido.');
 const start=new Date(from+'T00:00:00Z'),end=new Date(to+'T00:00:00Z');
 const days=Math.round((end-start)/86400000)+1;
 if(group==='day'&&days>93)throw Error('Para ver por dia, selecione até 93 dias ou escolha o agrupamento por mês.');
 if(group==='month')start.setUTCDate(1);
 const keys=[];
 while(start<=end){
  keys.push(start.toISOString().slice(0,group==='month'?7:10));
  if(keys.length>120)throw Error('Selecione um período de até 10 anos.');
  if(group==='month')start.setUTCMonth(start.getUTCMonth()+1);else start.setUTCDate(start.getUTCDate()+1);
 }
 return keys;
}
export function aggregateChartMovements(items,{stock='estoque1',kind='m3',species='',from,to,group='day'}={}){
 if(!chartKindsV720.has(kind)||!['estoque1','estoque2'].includes(stock))throw Error('Selecione estoque e unidade válidos.');
 const periods=stockChartPeriods(from,to,group).map(key=>({key,in:0,out:0,transferIn:0,transferOut:0,otherCount:0}));
 const byKey=new Map(periods.map(row=>[row.key,row])),totals={in:0,out:0,transferIn:0,transferOut:0,otherCount:0},excluded={undated:0,invalidVolume:0};
 const stockName=stock==='estoque1'?'Estoque 1':'Estoque 2';
 for(const item of items){
  if(String(item.origem||'').trim()!==stockName||stockChartKind(item)!==kind||(species&&stockChartName(item)!==species))continue;
  const day=stockChartMovementDay(item);if(!day){excluded.undated++;continue;}if(day<from||day>to)continue;
  const row=byKey.get(day.slice(0,group==='month'?7:10));
  if(!['entrada','saida'].includes(item.tipo)){row.otherCount++;totals.otherCount++;continue;}
  const amount=Number(item.volume);if(item.volume===null||item.volume===''||!Number.isFinite(amount)){excluded.invalidVolume++;continue;}
  const key=item.transferencia?(item.tipo==='entrada'?'transferIn':'transferOut'):(item.tipo==='entrada'?'in':'out');
  // Historical exits may carry a negative sign; chart direction is taken from tipo.
  row[key]+=Math.abs(amount);totals[key]+=Math.abs(amount);
 }
 return {periods,totals,excluded};
}
export function aggregateChartInventory(items,{kind='m3',species=''}={}){
 const groups=new Map();let invalidVolume=0;
 for(const item of items){
  if(stockChartKind(item)!==kind||(species&&stockChartName(item)!==species))continue;
  const volume=Number(item.volume);if(item.volume===null||item.volume===''||!Number.isFinite(volume)){invalidVolume++;continue;}
  const name=stockChartName(item);if(!groups.has(name))groups.set(name,{name,ready:0,green:0,total:0});
  const row=groups.get(name),green=kind==='m3'&&item.estadoMadeira==='verde';row[green?'green':'ready']+=volume;row.total+=volume;
 }
 const rows=[...groups.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'pt-BR'));
 const totals=rows.reduce((sum,row)=>({ready:sum.ready+row.ready,green:sum.green+row.green,total:sum.total+row.total}),{ready:0,green:0,total:0});
 return {rows,totals,invalidVolume};
}
