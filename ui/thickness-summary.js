function totaisEspessuraResumo(grupos){
  const porEspessura=new Map(),porBloco=new Map();
  for(const x of grupos){
    const espessura=Number(x.espessura),volume=Number(x.volume);
    if((x.tipoMedida||'m3')!=='m3'||!(espessura>0)||!Number.isFinite(espessura)||!Number.isFinite(volume))continue;
    const especie=String(x.madeira||'').trim();
    const chave=JSON.stringify([especie,espessura.toFixed(6)]);
    let total=porEspessura.get(chave);
    if(!total){total={especie,espessura,volume:0,ultimoBloco:''};porEspessura.set(chave,total);}
    total.volume+=volume;total.ultimoBloco=chaveBlocoResumoV598(x);
    porBloco.set(total.ultimoBloco,total);
  }
  return porBloco;
}
function linhaTotalEspessuraResumo(totais,bloco,colunas){
  const total=totais.get(bloco);
  if(!total||total.ultimoBloco!==bloco)return '';
  return `<tr class="resumo-total-espessura"><td colspan="${colunas}" style="white-space:normal;overflow-wrap:anywhere;text-align:left;font-weight:700;padding:12px 8px;border-top:2px solid #dab251;background:#203b30;color:#fff">${esc(total.especie)} — Volume total por espessura (${numCm(total.espessura)} cm): ${num4(total.volume)} m³</td></tr>`;
}
