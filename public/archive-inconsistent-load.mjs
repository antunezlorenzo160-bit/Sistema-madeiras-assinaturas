export function planInconsistentLoadArchive(loads,summary,group,actor,at){
 if(typeof group!=='string'||!group||typeof actor!=='string'||!actor||!Number.isSafeInteger(at)||at<=0)throw Error('Carregamento ou responsável inválido.');
 const selected=loads.filter(x=>String(x.grupoCargaId||'')===group);
 if(!selected.length)throw Error('Carregamento não encontrado. Atualize a lista.');
 if(selected.some(x=>!x.id))throw Error('Há um item sem identificador. Preserve os dados e solicite suporte.');
 if(selected.every(x=>x.cargaArquivadaInconsistenteEm))return {loads,summary,operations:[],count:0,alreadyArchived:true};
 const ids=new Set(selected.map(x=>String(x.id)));
 const metadata={cargaArquivadaInconsistenteEm:at,cargaArquivadaPorUid:actor,cargaArquivadaMotivo:'Teste com conferência/baixa inconsistente. O arquivamento não regulariza o estoque.'};
 return {
  loads:loads.map(x=>String(x.grupoCargaId||'')===group?{...x,...metadata,atualizadoEm:at}:x),
  summary:summary.filter(x=>!ids.has(String(x.id))),
  operations:[...ids].map(id=>({id,obj:{...metadata,atualizadoEm:at},modo:'merge'})),
  count:ids.size
 };
}
