function normalizarRegistroOrcamentoV703(ref,dados,opcoes){
  const path=String(ref?.path||'').split('/');
  if(path.length!==6||path[0]!=='empresas'||path[1]!==empresaV456||path[2]!=='dados'||path[3]!=='sm2_orcamento_itens'||path[4]!=='registros')return dados;
  // A patch must never resurrect an excluded item by defaulting its flag.
  // Normalize full records and explicit flag changes; preserve other merges.
  const explicit=Object.prototype.hasOwnProperty.call(dados||{},'excluido');
  if((opcoes?.merge||opcoes?.mergeFields)&&!explicit)return dados;
  return {...dados,excluido:dados?.excluido===true};
}
