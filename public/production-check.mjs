export function productionMaterialKey(item,index){return String(item.id||item.uid||item.key||`${item.especie||item.madeira||''}|${item.espessura||''}|${item.largura||''}|${item.comprimento||item.comp||''}|${item.quantidade||item.qtd||item.pecas||''}|${index}`);}
export function productionCheckSummary(order){
 const items=Array.isArray(order.itens)?order.itens:Array.isArray(order.linhas)?order.linhas:Array.isArray(order.pecas)?order.pecas:Array.isArray(order.resumo)?order.resumo:[];
 const materials=order.materiaisUsadosProducao||{},records=materials.__conferenciasV1||{};
 const states=items.map((item,index)=>{
  const key=productionMaterialKey(item,index),material=String(materials[key]||'');
  const matches=Object.values(records).filter(entry=>entry&&entry.itemKey===key&&entry.material===material&&entry.lancadoEm>0);
  const expected=Math.max(1,...matches.map(entry=>Number(entry.totalLinhas)||1));
  const lines=new Set(matches.map(entry=>entry.linhaIndex));
  return {index,conferidas:lines.size,esperadas:expected,conferido:lines.size>=expected};
 });
 const completed=states.filter(state=>state.conferido).length;
 return {conferido:states.length>0&&completed===states.length,parcial:states.some(state=>state.conferidas>0),itens:states};
}
