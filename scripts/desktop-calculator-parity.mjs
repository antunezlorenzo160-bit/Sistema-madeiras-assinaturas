export function applyDesktopCalculatorParity(app){
 if(app.includes('/* desktop-calculator-parity-v1 */'))return app;
 const replace=(from,to)=>{if(!app.includes(from))throw new Error('Desktop parity anchor missing: '+from.slice(0,90));app=app.replace(from,to)};
 const helper=`/* desktop-calculator-parity-v1 */
function pcPlanilhaLinearHtml(arr,titulo,orc=false,semValor=false){
 const itens=(arr||[]).filter(x=>(x.tipoMedida||x.tipoCadastro||'m3')==='linear'),grupos=agruparItensMedida(itens);
 if(!grupos.length)return '<div class="pc-preview-sheet"><div class="pc-preview-sheet-title">'+esc(titulo)+'</div><div class="pc-preview-empty">Nenhum item em metro linear neste destino.</div></div>';
 const linhas=grupos.map(x=>{
  const ids=(x._ids||[]).join(','),cmdp=x.compensarPerda===true;
  const ajuste=cmdp&&Number(x.acrescimoComprimento)>0?'Cobrado: '+numCompOrc(x.comprimentoCobrado)+' m':'—';
  const botao=orc?'<div class="no-print">'+botaoOpcaoOrc(ids,'compensarPerda',cmdp,'CMDP')+'</div>':'';
  return '<tr><td>'+esc(x.madeira||'')+'<br><small>'+esc(x.produto||'')+'</small></td><td>'+Number(x.quantidade||0)+'</td><td>'+numCompOrc(x.comprimento)+' m</td><td>'+num2(x.volume)+' m</td>'+(orc||!semValor?'<td>'+ajuste+botao+'</td><td>'+esc(servicosLinearTexto(x)||'—')+'</td>':'')+(semValor?'':'<td>'+moeda(x.valor)+'</td>')+'</tr>';
 }).join('');
 const total=itens.reduce((s,x)=>s+Number(x.volume||0),0),valor=itens.reduce((s,x)=>s+Number(x.valor||0),0);
 return '<div class="pc-preview-sheet"><div class="pc-preview-sheet-title">'+esc(titulo)+'</div><div class="pc-preview-table-wrap"><table class="pc-preview-table"><thead><tr><th>Produto</th><th>Peças</th><th>Comprimento real</th><th>Metros reais</th>'+(orc||!semValor?'<th>CMDP</th><th>Serviços</th>':'')+(semValor?'':'<th>Valor</th>')+'</tr></thead><tbody>'+linhas+'</tbody></table></div><div class="pc-preview-total"><div><small>Metros reais</small><strong>'+num2(total)+' m</strong></div>'+(semValor?'':'<div><small>Valor total</small><strong>'+moeda(valor)+'</strong></div>')+'</div></div>';
}
`;
 replace('function pcPlanilhaHtml(arr,titulo,semValor=false,mostrarReservaV356=false,tipoForcado=null){',helper+`function pcPlanilhaHtml(arr,titulo,semValor=false,mostrarReservaV356=false,tipoForcado=null){
 if(tipoForcado==='linear'||(!tipoForcado&&modoMedida==='linear'))return pcPlanilhaLinearHtml(arr,titulo,false,semValor);`);
 replace('function pcPlanilhaOrcamentoHtml(arr,titulo){',`function pcPlanilhaOrcamentoHtml(arr,titulo){
 if(modoMedida==='linear')return pcPlanilhaLinearHtml(arr,titulo,true,false);`);
 replace(`  if(d==='orcamento'){
    rotulo='Orçamento';`, `  if(d==='orcamento'&&modoMedida==='linear'){
    const regra=regraLinearSelecionadaV381(),madeiraId=String(document.getElementById('calcMadeira')?.value||''),comp=Number(document.getElementById('comprimento')?.value||0);
    const corresponde=x=>(x.tipoMedida||'m3')==='linear'&&String(x.madeiraId)===madeiraId&&String(x.produto||'')===String(regra?.tipo||'')&&Math.abs(Number(x.comprimento||0)-comp)<.005;
    const e1=estoque1Lancamentos.filter(corresponde),e2=estoque2Lancamentos.filter(corresponde),estoque=e1.length?e1:e2;
    badge.textContent='Orçamento';if(sub)sub.textContent='Metro linear: comprimento real, CMDP e serviços do produto.';
    box.innerHTML=pcPlanilhaLinearHtml(orcamento,'Orçamento atual — metro linear',true,false)+pcPlanilhaLinearHtml(estoque,e1.length?'Estoque 1 — medida selecionada':'Estoque 2 — medida selecionada',false,true);
    return;
  }
  if(d==='orcamento'){
    rotulo='Orçamento';`);
 replace(`const cargaM2=cargaAtual.filter(x=>(x.tipoMedida||x.tipoCadastro||'m3')==='m2');`,`const cargaM2=cargaAtual.filter(x=>(x.tipoMedida||x.tipoCadastro||'m3')==='m2');
    const cargaLinear=cargaAtual.filter(x=>(x.tipoMedida||x.tipoCadastro||'m3')==='linear');`);
 replace(`(!cargaM3.length&&!cargaM2.length)?`, `cargaLinear.length?pcPlanilhaLinearHtml(cargaLinear,tituloCarga+' — metro linear',false,false):'',
      (!cargaM3.length&&!cargaM2.length&&!cargaLinear.length)?`);
 replace(`cargaM3.length?pcPlanilhaHtml(cargaM3,tituloCarga+' — m³',true):`, `cargaM3.length?pcPlanilhaHtml(cargaM3,tituloCarga+' — m³',true,false,'m3'):`);
 // Reuse local rendering; no new database listeners or polling.
 replace(`document.getElementById('modoM3')?.addEventListener('click',`, `['btnModoLinearV291','tipoLinear','calcMadeira'].forEach(id=>document.getElementById(id)?.addEventListener(id==='btnModoLinearV291'?'click':'change',()=>setTimeout(pcAtualizarPlanilhaDirecionada,30)));
document.getElementById('modoM3')?.addEventListener('click',`);
 return app;
}
