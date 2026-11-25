import {readFileSync} from 'node:fs';
export function applyRomaneioStabilityV834(app){
 if(app.includes('// ROMANEIO_STABILITY_V834'))return app;
 const a=app.indexOf('  function congelarPesoLegadoV420(gid){'),b=app.indexOf('  // V422',a);if(a<0||b<a)throw Error('Romaneio stability: export functions changed');
 app=app.slice(0,a)+'// ROMANEIO_STABILITY_V834\n'+readFileSync(new URL('../ui/romaneio-stability.js',import.meta.url),'utf8')+'\n'+app.slice(b);
 const start=app.indexOf('function renderCarregamentosV392(){'),end=app.indexOf('  function alternarPlanilhaCargaV392(',start);if(start<0||end<start)throw Error('Romaneio stability: renderer changed');
 let body=app.slice(start,end).replace('function renderCarregamentosV392(){', `function renderCarregamentosV392(){\n    if(window.__smPrintingV556)return;\n    if(diferirRenderizacaoV595('renderCarregamentosV392','#carregamentos',renderCarregamentosV392))return;\n    const previewV834=captureRomaneioV834();`);
 body=body.replace('    restaurarEdicoesPendentesV422(rascunhoV422);','    restaurarEdicoesPendentesV422(rascunhoV422);\n    restoreRomaneioV834(previewV834);');app=app.slice(0,start)+body+app.slice(end);
 const poll="    if(document.hidden||orcSubaba!=='carregamentos'||lotePacotesEmCurso)return;\n    const sig=assinaturaCargasV414();";
 if(!app.includes(poll))throw Error('Romaneio stability: polling changed');
 return app.replace(poll,"    if(document.hidden||window.__smPrintingV556||orcSubaba!=='carregamentos'||lotePacotesEmCurso||currentRomaneioV834())return;\n    const sig=assinaturaCargasV414();");
}
