import {readFileSync} from 'node:fs';
export function applyPacketBatchV777(app){
 if(app.includes('// PACKET_BATCH_V777'))return app;
 const replace=(from,to)=>{if(!app.includes(from)||app.indexOf(from)!==app.lastIndexOf(from))throw Error('Packet batch anchor changed: '+from.slice(0,70));app=app.replace(from,()=>to);};
 const begin=app.indexOf('async function adicionarPacotesDigitados(){'),end=app.indexOf("entradaPacotes.addEventListener('keydown'",begin);
 if(begin<0||end<0)throw Error('Packet batch entry point missing');
 app=app.slice(0,begin)+'// PACKET_BATCH_V777\n'+readFileSync(new URL('../ui/packet-batch.js',import.meta.url),'utf8')+app.slice(end);
 replace('function calcPreview(){calcPreviewBaseV710();', 'function calcPreview(){if(lotePacotesEmCurso)return;calcPreviewBaseV710();');
 replace('  function atualizarFluxoCargaV388(){','  function atualizarFluxoCargaV388(){\n    if(lotePacotesEmCurso)return;');
 replace('function pcAtualizarPlanilhaDirecionada(){','function pcAtualizarPlanilhaDirecionada(){\n  if(lotePacotesEmCurso)return;');
 replace('function persistirBlocoPacotes(){\n persistindoBlocoPacotes=true;',"async function persistirBlocoPacotes(){\n if(destinoSelecionado()==='orcamento')repriceBudgetV710(true);else if(destinoSelecionado()==='carga')repriceLoadsV710(true);\n persistindoBlocoPacotes=true;");
 replace(' }finally{persistindoBlocoPacotes=false;}\n}\nfunction save(chaves){',' }finally{persistindoBlocoPacotes=false;}\n await window.__v456Local.flush?.();\n}\nfunction save(chaves){');
 return app;
}
