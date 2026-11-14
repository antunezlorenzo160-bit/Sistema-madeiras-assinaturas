// STOCK_CHARTS_V720 — presentation only, using the existing stock/history subscriptions.
let stockChartsQueuedV720=false,stockChartsSyncV720='',stockChartsSelectionV720='';
const stockChartFieldV720=id=>document.getElementById(id);
function stockChartsAllowedV720(){return parent.__smEmployeeCan?.('stock')===true;}
function stockChartFormatV720(value,kind,unit=true){
 const symbol=kind==='m2'?'m²':kind==='linear'?'m':'m³',digits=['m3','granel'].includes(kind)?4:2;
 return Number(value).toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits})+(unit?' '+symbol:'');
}
function stockChartLabelV720(key){return key.length===7?key.slice(5)+'/'+key.slice(0,4):key.split('-').reverse().join('/');}
function queueStockChartsV720(message){
 if(typeof message==='string')stockChartsSyncV720=message;
 const panel=stockChartFieldV720('stockChartsV720');if(!panel?.open||panel.hidden||stockChartsQueuedV720||document.getElementById('relatorios')&&!document.getElementById('relatorios').classList.contains('active'))return;
 stockChartsQueuedV720=true;queueMicrotask(()=>{stockChartsQueuedV720=false;renderStockChartsV720();});
}
function movementChartMarkupV720(rows,kind,availableWidth){
 const maximum=Math.max(0,...rows.flatMap(r=>[r.in,r.out]));
 if(!maximum)return '<p class="empty">Nenhuma entrada ou saída neste período e nos filtros selecionados.</p>';
 const compact=Number(availableWidth)>0&&Number(availableWidth)<=640;
 const width=compact?Math.max(240,Math.floor(availableWidth)-2):Math.max(640,rows.length*24+70),height=compact?210:246,left=compact?52:65,right=compact?8:15,top=15,bottom=compact?35:45,plotH=height-top-bottom,step=(width-left-right)/rows.length;
 const scale=10**Math.floor(Math.log10(maximum)),ceiling=Math.ceil(maximum/scale)*scale;
 const axis=Array.from({length:5},(_,i)=>{const value=ceiling*i/4,y=top+plotH-value/ceiling*plotH;return '<line x1="'+left+'" x2="'+(width-right)+'" y1="'+y+'" y2="'+y+'" class="sc-grid-line"/><text x="'+(left-7)+'" y="'+(y+4)+'" text-anchor="end">'+esc(Number(value.toFixed(4)).toLocaleString('pt-BR'))+'</text>';}).join('');
 const bars=rows.map((r,i)=>{
  const x=left+i*step+step*.16,bw=step*.3,selected=r.key===stockChartsSelectionV720;
  const label=stockChartLabelV720(r.key),description=label+': entradas '+stockChartFormatV720(r.in,kind)+', saídas '+stockChartFormatV720(r.out,kind);
  const rect=(value,offset,cls)=>{const h=value>0?Math.max(1,value/ceiling*plotH):0;return '<rect class="'+cls+'" x="'+(x+offset)+'" y="'+(top+plotH-h)+'" width="'+bw+'" height="'+h+'" rx="2"/>';};
  return '<g role="button" tabindex="0" data-chart-period="'+r.key+'" aria-label="'+esc(description)+'" class="sc-period'+(selected?' sc-selected':'')+'"><title>'+esc(description)+'</title><rect class="sc-hit" x="'+(left+i*step)+'" y="'+top+'" width="'+step+'" height="'+plotH+'"/>'+rect(r.in,0,'sc-in')+rect(r.out,bw+Math.min(2,step*.08),'sc-out')+((i%Math.max(1,Math.ceil(rows.length/(compact?4:25)))===0)?'<text x="'+(left+(i+.5)*step)+'" y="'+(height-24)+'" text-anchor="middle">'+esc(r.key.length===7?label:label.slice(0,5))+'</text>':'')+'</g>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" style="min-width:'+width+'px" role="group" aria-label="Entradas e saídas em '+(kind==='m2'?'metros quadrados':kind==='linear'?'metros lineares':'metros cúbicos')+'">'+axis+bars+'</svg>';
}
function renderStockChartsV720(){
 const panel=stockChartFieldV720('stockChartsV720');if(!panel)return;
 if(!stockChartsAllowedV720()){panel.hidden=true;return;}if(!panel.open||panel.hidden)return;
 const stock=stockChartFieldV720('scStockV720').value,kind=stockChartFieldV720('scKindV720').value;
 const inventory=stock==='estoque1'?estoque1Lancamentos:estoque2Lancamentos;
 const names=[...new Set([...inventory,...movimentos.filter(i=>String(i.origem||'').trim()===(stock==='estoque1'?'Estoque 1':'Estoque 2'))].filter(i=>stockChartKind(i)===kind).map(stockChartName))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 const select=stockChartFieldV720('scSpeciesV720'),selected=select.value,signature=JSON.stringify(names);
 if(select.dataset.options!==signature){select.innerHTML='<option value="">Todas as espécies / produtos</option>'+names.map(name=>'<option value="'+esc(name)+'">'+esc(name)+'</option>').join('');select.value=names.includes(selected)?selected:'';select.dataset.options=signature;}
 const options={stock,kind,species:select.value,from:stockChartFieldV720('scFromV720').value,to:stockChartFieldV720('scToV720').value,group:stockChartFieldV720('scGroupV720').value};
 const error=stockChartFieldV720('scErrorV720'),results=stockChartFieldV720('scResultsV720');let history,current;
 try{history=aggregateChartMovements(movimentos,options);current=aggregateChartInventory(inventory,options);error.hidden=true;results.hidden=false;}catch(e){error.textContent=e.message;error.hidden=false;results.hidden=true;return;}
 const fmt=n=>stockChartFormatV720(n,kind),totals=history.totals;
 stockChartFieldV720('scSyncV720').textContent=!navigator.onLine?'Sem internet: mostrando os dados salvos neste aparelho.':stockChartsSyncV720.includes('confirmado pelo servidor')?'Dados atualizados.':stockChartsSyncV720.includes('Carregando')?'Atualizando movimentações…':stockChartsSyncV720.includes('Não foi possível')||stockChartsSyncV720.includes('aguardando')?'Não foi possível atualizar as movimentações. Exibindo os dados disponíveis.':'Exibindo os dados disponíveis no sistema.';
 stockChartFieldV720('scStatsV720').innerHTML=[['Entradas no período',totals.in,'sc-in-text'],['Saídas no período',totals.out,'sc-out-text'],[kind==='m3'&&current.totals.green!==0?'Estoque atual (seca + verde)':'Estoque atual',current.totals.total,'']].map(([label,value,cls])=>'<div><small>'+label+'</small><strong class="'+cls+'">'+fmt(value)+'</strong></div>').join('');
 const notes=['Transferências, ajustes e secagem não entram nas barras de entradas e saídas.'];
 if(totals.transferIn||totals.transferOut)notes.push('Transferências no período: '+fmt(totals.transferIn)+' recebidos e '+fmt(totals.transferOut)+' enviados.');
 if(totals.otherCount)notes.push(totals.otherCount+' registro(s) de ajustes, secagem ou outros movimentos.');
 if(history.excluded.undated)notes.push(history.excluded.undated+' registro(s) sem data válida não aparecem no gráfico.');
 if(history.excluded.invalidVolume||current.invalidVolume)notes.push('Há registros sem quantidade válida; confira as planilhas.');
 stockChartFieldV720('scMovementNoteV720').textContent=notes.join(' ');
 const chartHost=stockChartFieldV720('scMovementV720'),scrollLeft=chartHost.scrollLeft;
 chartHost.innerHTML=movementChartMarkupV720(history.periods,kind,chartHost.clientWidth);chartHost.scrollLeft=scrollLeft;
 const transfer=totals.transferIn||totals.transferOut;
 stockChartFieldV720('scMovementTableV720').innerHTML='<table><thead><tr><th>Período</th><th>Entradas</th><th>Saídas</th>'+(transfer?'<th>Transf. recebidas</th><th>Transf. enviadas</th>':'')+'</tr></thead><tbody>'+history.periods.map(row=>'<tr data-sc-row="'+row.key+'" class="'+(row.key===stockChartsSelectionV720?'sc-selected':'')+'"><td><button type="button" class="sc-period-button" data-chart-period="'+row.key+'">'+stockChartLabelV720(row.key)+'</button></td><td>'+fmt(row.in)+'</td><td>'+fmt(row.out)+'</td>'+(transfer?'<td>'+fmt(row.transferIn)+'</td><td>'+fmt(row.transferOut)+'</td>':'')+'</tr>').join('')+'</tbody><tfoot><tr><th>Total</th><td>'+fmt(totals.in)+'</td><td>'+fmt(totals.out)+'</td>'+(transfer?'<td>'+fmt(totals.transferIn)+'</td><td>'+fmt(totals.transferOut)+'</td>':'')+'</tr></tfoot></table>';
 const chosen=history.periods.find(r=>r.key===stockChartsSelectionV720);
 stockChartFieldV720('scSelectedV720').textContent=chosen?stockChartLabelV720(chosen.key)+' — Entradas: '+fmt(chosen.in)+' · Saídas: '+fmt(chosen.out):'Toque em um período do gráfico para conferir os números.';
 stockChartFieldV720('scStockLegendV720').innerHTML=kind==='m3'?'<span><i class="sc-in"></i> Madeira seca</span><span><i class="sc-out"></i> Madeira verde</span>':'<span><i class="sc-in"></i> Saldo atual</span>';
 const maxStock=Math.max(0,...current.rows.map(row=>Math.abs(row.ready)+Math.abs(row.green)));
 stockChartFieldV720('scInventoryV720').innerHTML=current.rows.length?current.rows.map(row=>{
  const title=row.name+': '+fmt(row.total)+(kind==='m3'?' — Seca: '+fmt(row.ready)+'; verde: '+fmt(row.green):'');
  return '<div class="sc-stock-row" title="'+esc(title)+'"><div class="sc-stock-label"><span>'+esc(row.name)+'</span><strong>'+fmt(row.total)+'</strong></div><div class="sc-track" role="img" aria-label="'+esc(title)+'"><span class="sc-in'+(row.ready<0?' sc-negative':'')+'" style="width:'+(maxStock?Math.abs(row.ready)/maxStock*100:0)+'%"></span><span class="sc-out'+(row.green<0?' sc-negative':'')+'" style="width:'+(maxStock?Math.abs(row.green)/maxStock*100:0)+'%"></span></div></div>';
 }).join(''):'<p class="empty">Nenhum saldo registrado nos filtros selecionados.</p>';
 stockChartFieldV720('scInventoryTableV720').innerHTML='<table><thead><tr><th>Espécie / produto</th>'+(kind==='m3'?'<th>Seca</th><th>Verde</th>':'')+'<th>Saldo atual</th></tr></thead><tbody>'+current.rows.map(row=>'<tr><td>'+esc(row.name)+'</td>'+(kind==='m3'?'<td>'+fmt(row.ready)+'</td><td>'+fmt(row.green)+'</td>':'')+'<td>'+fmt(row.total)+'</td></tr>').join('')+'</tbody><tfoot><tr><th>Total</th>'+(kind==='m3'?'<td>'+fmt(current.totals.ready)+'</td><td>'+fmt(current.totals.green)+'</td>':'')+'<td>'+fmt(current.totals.total)+'</td></tr></tfoot></table>'+(current.rows.some(row=>row.ready<0||row.green<0)?'<p class="sc-error">Há saldo negativo nos registros. Confira as planilhas; as barras em vermelho mostram esses valores.</p>':'');
}
function mountStockChartsV720(){
 const panel=stockChartFieldV720('stockChartsV720');if(!panel)return;
 if(!stockChartsAllowedV720()){panel.hidden=true;return;}
 const localDay=date=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
 const end=new Date(),start=new Date(end);start.setDate(start.getDate()-29);
 stockChartFieldV720('scFromV720').value=localDay(start);stockChartFieldV720('scToV720').value=localDay(end);
 panel.addEventListener('toggle',()=>{
  if(!panel.open||panel.hidden||document.getElementById('relatorios')&&!document.getElementById('relatorios').classList.contains('active'))return;
  if(!panel.dataset.initialized){const isHistory=stockChartFieldV720('estoqueHistoricoPainel')?.classList.contains('ativo');stockChartFieldV720('scStockV720').value=isHistory?historicoEstoqueAtivo:estoquePlanilhaAtivo;stockChartFieldV720('scKindV720').value=isHistory?historicoTipo:estoqueTipo;panel.dataset.initialized='1';}
  if(stockChartsAllowedV720())abrirHistoricoMovimentosV701();queueStockChartsV720();
 });
 for(const id of ['scStockV720','scKindV720','scSpeciesV720','scFromV720','scToV720','scGroupV720'])stockChartFieldV720(id).addEventListener('change',()=>{stockChartsSelectionV720='';queueStockChartsV720();});
 stockChartFieldV720('scRefreshV720').onclick=()=>{if(stockChartsAllowedV720())abrirHistoricoMovimentosV701();queueStockChartsV720();};
 const selectPeriod=target=>{const button=target.closest('[data-chart-period]');if(!button)return;stockChartsSelectionV720=button.dataset.chartPeriod;stockChartFieldV720('scMovementDetailsV720').open=true;renderStockChartsV720();};
 panel.addEventListener('click',event=>selectPeriod(event.target));
 panel.addEventListener('keydown',event=>{if(event.target.matches('g[data-chart-period]')&&['Enter',' '].includes(event.key)){event.preventDefault();selectPeriod(event.target);panel.querySelector('g[data-chart-period="'+stockChartsSelectionV720+'"]')?.focus({preventScroll:true});}});
 window.addEventListener('online',()=>queueStockChartsV720());window.addEventListener('offline',()=>queueStockChartsV720());
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>queueStockChartsV720(),100);});
}
setTimeout(mountStockChartsV720,0);
