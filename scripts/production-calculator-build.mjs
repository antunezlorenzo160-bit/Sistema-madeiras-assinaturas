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
 if(!fn.includes('// PRODUCTION_CALCULATOR_SINGLE_USE_V2')){
  const target="  const split=document.getElementById('pcSplitWorkspace');";
  if(!fn.includes(target))throw Error('Production single-use anchor missing');
  fn=fn.replace(target,"  // PRODUCTION_CALCULATOR_SINGLE_USE_V2\n  window.__v456Session.setItem(chaveUsoProducaoCalc(pedidoId,itemIndex,linhaIndex),'1');\n  try{pcAtualizarPlanilhaDirecionada();}catch{}\n"+target);
 }
 return app.slice(0,begin)+fn+app.slice(end);
}
