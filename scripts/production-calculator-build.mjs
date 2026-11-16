export function applyProductionCalculator(app){
 const begin=app.indexOf('function prepararMaterialProducaoNaCalculadora('),end=app.indexOf('window.prepararMaterialProducaoNaCalculadora=',begin);
 if(begin<0||end<0)throw Error('Production calculator preparation not found');
 let fn=app.slice(begin,end);
 if(!fn.includes('// PRODUCTION_CALCULATOR_USE_V1')){
 const old="let opt=[...sel.options].find(op=>String(op.value)===String(mid));";
 if(!fn.includes(old))throw Error('Production species selection anchor not found');
 fn=fn.replace(old,"// PRODUCTION_CALCULATOR_USE_V1\n  const options=[...sel.options].filter(op=>String(op.value||'').trim()&&!op.disabled);\n  let opt=mid?options.find(op=>String(op.value)===String(mid)):null;");
 fn=fn.replace("opt=[...sel.options].find(op=>{","opt=options.find(op=>{");
 fn=fn.replace("  requestAnimationFrame(()=>{try{$('largura').focus({preventScroll:true});}catch(e){}});", "  const split=document.getElementById('pcSplitWorkspace');if(split)split.classList.remove('prod-dir-fullscreen');const full=document.getElementById('pcAbrirDestinoCompleto');if(full)full.textContent='Abrir tela completa';\n  requestAnimationFrame(()=>{try{$('largura').focus({preventScroll:true});$('largura').scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e){}});");
 }
 // Preparing calculator fields is not a physical deduction.
 fn=fn.replace("  // PRODUCTION_CALCULATOR_SINGLE_USE_V2\n  window.__v456Session.setItem(chaveUsoProducaoCalc(pedidoId,itemIndex,linhaIndex),'1');\n  try{pcAtualizarPlanilhaDirecionada();}catch{}\n",'');
 app=app.slice(0,begin)+fn+app.slice(end);
 if(app.includes('// PRODUCTION_DEDUCTION_STATES_V774'))return app;
 const stateBegin=app.indexOf('function linhaProducaoCalcJaUsada('),stateEnd=app.indexOf('let producaoCalcPendente=',stateBegin);
 if(stateBegin<0||stateEnd<0)throw Error('Production deduction state not found');
 const states=`// PRODUCTION_DEDUCTION_STATES_V774
function estadoLinhaProducaoV774(pedidoId,itemIndex,linhaIndex){
 const order=(Array.isArray(orcamentosGuardados)?orcamentosGuardados:[]).find(o=>String(o?.id)===String(pedidoId));
 if(order&&baixaLinhaRegistradaV362(order,itemIndex,linhaIndex))return 'baixado';
 const rows=(Array.isArray(carregamentos)?carregamentos:[]).filter(row=>{
  const meta=row?.producaoPendenteV388;
  return meta&&String(meta.pedidoId)===String(pedidoId)&&Number(meta.itemIndex)===Number(itemIndex)&&Number(meta.linhaIndex)===Number(linhaIndex)&&!row.cargaArquivadaInconsistenteEm&&row.cargaStatus!=='cancelado'&&row.cargaStatus!=='cancelled';
 });
 if(rows.some(row=>row.cargaBaixadaEm||row.cargaStatus==='concluido'))return 'baixado';
 return rows.length?'na_carga':'pendente';
}
function linhaProducaoCalcJaUsada(pedidoId,itemIndex,linhaIndex){return estadoLinhaProducaoV774(pedidoId,itemIndex,linhaIndex)!=='pendente';}
`;
 app=app.slice(0,stateBegin)+states+app.slice(stateEnd);
 const renderBegin=app.indexOf('function producaoDirecionadaHtml('),renderEnd=app.indexOf('function direcionarPedidoProducaoPC(',renderBegin);
 let render=app.slice(renderBegin,renderEnd);
 const button='disabled>✓</button>';
 if(render.split(button).length!==3)throw Error('Production state buttons changed');
 render=render.replace(button,"disabled>${originais.every(idx=>estadoLinhaProducaoV774(o.id,idx,0)==='baixado')?'Baixado':'Na carga'}</button>");
 render=render.replace(button,"disabled>${estadoLinhaProducaoV774(o.id,n,k)==='baixado'?'Baixado':'Na carga'}</button>");
 render=render.replace('    ${observacaoProducaoHtml(o,false)}','    <p class="note">Usar preenche a calculadora. Lançar peça monta a carga. A saída aparece em Movimentações após fechar a carga e confirmar sua conferência e baixa.</p>\n    ${observacaoProducaoHtml(o,false)}');
 return app.slice(0,renderBegin)+render+app.slice(renderEnd);
}
