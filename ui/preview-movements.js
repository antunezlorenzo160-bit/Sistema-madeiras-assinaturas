let movementFiltersV710={kind:'todas',from:'',to:'',search:''};
function movementDateV710(item){
 const dh=separarDataHoraBR(item.data,item.atualizadoEm);const m=String(dh.data).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?m[3]+'-'+m[2]+'-'+m[1]:'0000-00-00';
}
function renderMovementDaysV710(){
 const host=document.getElementById('historicoPlanilhasEstoque');if(!host)return;
 const stock=historicoEstoqueAtivo==='estoque1'?'Estoque 1':'Estoque 2';
 let controls=document.getElementById('movementFiltersV710');
 if(!controls){controls=document.createElement('div');controls.id='movementFiltersV710';controls.className='card no-print';controls.innerHTML='<h3>Filtrar movimentações</h3><div class="grid"><label>Movimento<select id="movementKindV710"><option value="todas">Todas</option><option value="entrada">Entradas</option><option value="saida">Saídas</option><option value="transferencia">Transferências</option><option value="ajuste">Ajustes e outros registros</option></select></label><label>De<input id="movementFromV710" type="date"></label><label>Até<input id="movementToV710" type="date"></label><label>Espécie ou produto<input id="movementSearchV710" type="search"></label></div>';host.before(controls);
 for(const [key,id] of [['kind','movementKindV710'],['from','movementFromV710'],['to','movementToV710'],['search','movementSearchV710']])document.getElementById(id).addEventListener('input',e=>{movementFiltersV710[key]=e.target.value;renderMovementDaysV710();});
 }
 const title=document.getElementById('tituloHistoricoEstoque');if(title)title.textContent='Movimentações por data — '+stock;
 const note=document.getElementById('notaHistoricoEstoque');if(note)note.textContent='Entradas e saídas com totais separados por dia. Transferências e ajustes ficam identificados à parte; não representam compras ou vendas.';
 let rows=movimentos.filter(x=>String(x.origem||'').trim()===stock&&(x.tipoCadastro||'m3')===historicoTipo);
 const days=groupMovementDays(rows,{...movementFiltersV710,dayOf:movementDateV710});
 const value=(n,u)=>u==='m2'?num2(n)+' m²':u==='linear'?num2(n)+' m':num4(n)+' m³';
 const totals=map=>Object.entries(map).filter(([,n])=>n>0).map(([u,n])=>value(n,u)).join(' · ')||'0';
 host.innerHTML=days.map(g=>{
  const day=g.day==='0000-00-00'?'Data não informada':g.day.split('-').reverse().join('/');
  const sections=[['entrada','Entradas'],['saida','Saídas'],['transferencia','Transferências'],['ajuste','Ajustes e outros registros']].filter(([k])=>g[k].length).map(([k,label])=>{
   const trs=g[k].slice().sort(ordenarHistoricoMaisRecente).map(x=>{
    const dh=separarDataHoraBR(x.data,x.atualizadoEm);const transfer=!!x.transferencia;
    const origem=transfer?(x.transferenciaDe||x.origem||'—'):x.tipo==='saida'?(x.origem||stock):(x.fornecedorOrigem||'—');
    const destino=transfer?(x.transferenciaPara||'—'):x.tipo==='saida'?(x.compradorDestino||x.destinoMovimentacao||x.finalidadeSaida||'—'):stock;
    const unit=movementUnit(x),med=(x.tipoCadastro==='granel')?'A granel':unit==='linear'?String(x.produto||'Produto'):unit==='m2'?numCm(x.largura||0)+' cm':numCm(x.largura||0)+' × '+numCm(x.espessura||0)+' cm';
    return '<tr><td>'+esc(dh.hora)+'</td><td>'+esc(x.madeira||x.produto||'—')+'</td><td>'+esc(origem)+'</td><td>'+esc(destino)+'</td><td>'+esc(String(x.quantidade??'—'))+'</td><td>'+esc(med)+'</td><td>'+esc(x.comprimento?numCompOrc(x.comprimento)+' m':'—')+'</td><td>'+esc(value(Number(x.volume||0),unit))+'</td></tr>';
   }).join('');
   return '<h4>'+label+'</h4><div class="table-wrap"><table><thead><tr><th>Hora</th><th>Espécie / produto</th><th>Origem</th><th>Destino</th><th>Peças</th><th>Medidas</th><th>Comp.</th><th>Volume / área</th></tr></thead><tbody>'+trs+'</tbody></table></div>';
  }).join('');
  return '<article class="planilha-especie movement-day-v710"><h3>'+esc(day)+' · '+stock+'</h3><div class="export-actions no-print"><button class="btn btn-secondary" type="button" onclick="copiarBloco(this.closest(\'.movement-day-v710\'))">Copiar dia</button><button class="btn btn-primary" type="button" onclick="gerarPdfBloco(this.closest(\'.movement-day-v710\'),\'Movimentações\')">Gerar PDF</button></div><div class="stats"><div class="stat"><small>Entradas do dia</small><strong>'+totals(g.totals.entrada)+'</strong></div><div class="stat"><small>Saídas do dia</small><strong>'+totals(g.totals.saida)+'</strong></div></div>'+sections+'</article>';
 }).join('')||'<p class="empty">Nenhuma movimentação encontrada nos filtros selecionados.</p>';
}
function mountMovementModeV710(){
 const panel=document.getElementById('estoqueHistoricoPainel');if(!panel)return;
 const sync=()=>document.body.classList.toggle('movement-view-v710',panel.classList.contains('ativo'));
 new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['class']});sync();
}
setTimeout(mountMovementModeV710,0);
