export function applyProductionCalculator(app){
 const begin=app.indexOf('function prepararMaterialProducaoNaCalculadora('),end=app.indexOf('window.prepararMaterialProducaoNaCalculadora=',begin);
 if(begin<0||end<0)throw Error('Production calculator preparation not found');
 let fn=app.slice(begin,end);
 if(fn.includes('// PRODUCTION_CALCULATOR_USE_V1'))return app;
 const old="let opt=[...sel.options].find(op=>String(op.value)===String(mid));";
 if(!fn.includes(old))throw Error('Production species selection anchor not found');
 fn=fn.replace(old,"// PRODUCTION_CALCULATOR_USE_V1\n  const options=[...sel.options].filter(op=>String(op.value||'').trim()&&!op.disabled);\n  let opt=mid?options.find(op=>String(op.value)===String(mid)):null;");
 fn=fn.replace("opt=[...sel.options].find(op=>{","opt=options.find(op=>{");
 fn=fn.replace("  requestAnimationFrame(()=>{try{$('largura').focus({preventScroll:true});}catch(e){}});", "  const split=document.getElementById('pcSplitWorkspace');if(split)split.classList.remove('prod-dir-fullscreen');const full=document.getElementById('pcAbrirDestinoCompleto');if(full)full.textContent='Abrir tela completa';\n  requestAnimationFrame(()=>{try{$('largura').focus({preventScroll:true});$('largura').scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e){}});");
 return app.slice(0,begin)+fn+app.slice(end);
}
