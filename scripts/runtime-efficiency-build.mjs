export function applyRuntimeEfficiencyV782(app){
 if(app.includes('// RUNTIME_EFFICIENCY_V782'))return app;
 const replace=(from,to)=>{if(!app.includes(from)||app.indexOf(from)!==app.lastIndexOf(from))throw Error('Runtime audit anchor changed: '+from.slice(0,80));app=app.replace(from,()=>to);};
 replace('  let assinaturaV392=assinaturaCargasV414();\n  setInterval(()=>{\n    const sig=assinaturaCargasV414();',"  // RUNTIME_EFFICIENCY_V782\n  let assinaturaV392='';\n  setInterval(()=>{\n    if(document.hidden||orcSubaba!=='carregamentos'||lotePacotesEmCurso)return;\n    const sig=assinaturaCargasV414();");
 replace('  setTimeout(renderCarregamentosV392,150);',"  setTimeout(()=>{if(!document.hidden&&orcSubaba==='carregamentos')renderCarregamentosV392();},150);");
 replace("let pcPreviewAssinatura='';\nsetInterval(()=>{\n  if(window.innerWidth<1100)return;", "let pcPreviewAssinatura='';\nsetInterval(()=>{\n  if(document.hidden||lotePacotesEmCurso||!document.getElementById('calculadora')?.classList.contains('active'))return;\n  if(window.innerWidth<1100)return;");
 return app;
}
