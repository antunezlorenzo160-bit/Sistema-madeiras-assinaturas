function organizarBlocosResumoV598(grupos){
  // Keep each species/thickness together even when entries alternate between lots.
  // Preserve the order in which species, thicknesses and lengths first appeared.
  const especies=new Map();
  for(const grupo of grupos){
    const tipo=grupo.tipoMedida||'m3';
    const especie=tipo==='granel'?nomeGranelV385(grupo):String(grupo.madeira||'').trim();
    if(!especies.has(especie))especies.set(especie,new Map());
    const espessura=tipo==='m3'?Number(grupo.espessura||0).toFixed(6):null;
    const chaveEspessura=JSON.stringify([tipo,espessura]);
    const particoes=especies.get(especie);
    if(!particoes.has(chaveEspessura))particoes.set(chaveEspessura,new Map());
    const blocos=particoes.get(chaveEspessura),chave=chaveBlocoResumoV598(grupo);
    if(!blocos.has(chave))blocos.set(chave,[]);
    blocos.get(chave).push(grupo);
  }
  return [...especies.values()].flatMap(particoes=>[...particoes.values()].flatMap(blocos=>[...blocos.values()].flat()));
}
