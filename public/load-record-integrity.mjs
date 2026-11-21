// A physical load row must contain some physical information. Prices and timestamps
// alone never establish a stock item. This check does not infer or change stock.
export function incompleteLoadRowV791(row){
 return !row||typeof row!=='object'||!['quantidade','volume','volumeReal','volumeGranel','volumeFechado','comprimento','largura','espessura'].some(key=>Number.isFinite(Number(row[key]))&&Number(row[key])>0);
}
export function assertLoadRecordWriteV791(previous,next,mode='set'){
 if(mode==='delete')return;
 const candidate=mode==='merge'||mode==='update'?{...previous,...next}:next;
 if(incompleteLoadRowV791(candidate))throw Error('Registro de carga sem quantidade, volume ou medidas. A gravação foi bloqueada para não criar um carregamento vazio.');
}
export function loadRecordDiagnosticV791(rows){
 const fields=['id','grupoCargaId','tipoMedida','tipoCadastro','madeiraId','madeira','especie','produto','quantidade','volume','volumeReal','volumeGranel','volumeFechado','comprimento','largura','espessura','cargaStatus','cargaFluxoV388','cargaFechadaEm','cargaBaixadaEm','atualizadoEm','ocultoResumo','excluido','cargaArquivadaInconsistenteEm'];
 return {version:791,records:rows.map(row=>({incomplete:incompleteLoadRowV791(row),fieldNames:Object.keys(row).sort(),data:Object.fromEntries(fields.filter(key=>Object.hasOwn(row,key)).map(key=>[key,row[key]]))}))};
}

// Same grouping key as the load list, usable outside its private renderer scope.
export function loadRowsForGroupV793(rows,gid){
 const target=String(gid||'');
 return (Array.isArray(rows)?rows:[]).filter((row,index)=>row&&typeof row==='object'&&String(row.grupoCargaId||('legado-'+String(row.id||index)))===target);
}
