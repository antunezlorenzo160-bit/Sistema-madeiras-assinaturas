function productionCheckHtml(order){
 const status=order.conferenciaMaterialProducao||productionCheckSummary(order);
 const label=status.conferido?'✓ Conferido':status.parcial?'Conferência parcial':'Aguardando conferência do material';
 return '<div class="prod-conferencia-status" role="status" style="margin:8px 0;font-weight:700;color:'+(status.conferido?'#8fe0a9':'#f0cc7a')+'">'+label+'</div>';
}
function registrarConferenciaMaterialAposLancamento(meta,item){
 if(!meta||!['carga','plaina'].includes(item.destino))return;
 const index=orcamentosGuardados.findIndex(order=>String(order.id)===String(meta.pedidoId));if(index<0)throw Error('Pedido da conferência não localizado.');
 const order=orcamentosGuardados[index],items=pedidoProducaoDados(order).itens,source=items[meta.itemIndex];if(!source)throw Error('Material da conferência não localizado.');
 const key=productionMaterialKey(source,meta.itemIndex),materials={...(order.materiaisUsadosProducao||{})},records={...(materials.__conferenciasV1||{})};
 records[key+'|linha:'+meta.linhaIndex]={itemKey:key,linhaIndex:meta.linhaIndex,totalLinhas:meta.totalLinhasConferencia||1,material:String(materials[key]||''),lancadoEm:Date.now(),lancamentoId:item.id,conferidoPor:employeeLoadActor().name,conferidoPorUid:boundV456.uid};
 materials.__conferenciasV1=records;
 const patch={materiaisUsadosProducao:materials,atualizadoEm:Date.now()};
 enfileirarOffline(COL.orcamentosGuardados,order.id,patch,'merge');
 orcamentosGuardados[index]={...order,...patch};window.__v456Local.setItem(STORAGE.orcamentosGuardados,JSON.stringify(orcamentosGuardados));sincronizarOfflineOps().catch(()=>{});
}
