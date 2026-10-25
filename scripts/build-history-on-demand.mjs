import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function buildHistoryOnDemand(input=new URL('../public/index.html',import.meta.url)){
  const file=input instanceof URL?input:pathToFileURL(resolve(input));
  let html=readFileSync(file,'utf8');
  const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;
  if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada.');
  let end=start+1;
  for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
  let app=JSON.parse(html.slice(start,end));
  if(!app.includes('// HISTORY_LAZY_V701')){
    if(!app.includes('// READ_OPTIMIZATION_V700'))throw Error('Execute a revisão de leituras antes do histórico sob demanda.');
    function replaceOnce(before,after){
      if(!app.includes(before)||app.indexOf(before)!==app.lastIndexOf(before))throw Error('Trecho do histórico mudou: '+before.slice(0,75));
      app=app.replace(before,()=>after);
    }
    replaceOnce("['cargas',COL.cargas],['movimentos',COL.movimentos],['orcamento',COL.orcamento]", "['cargas',COL.cargas],['orcamento',COL.orcamento]");
    const gate='if(dadosEscutadosV428.size<colecoesEscutadasV428.length+1)return;';
    if(app.split(gate).length!==3)throw Error('Barreiras de sincronização não encontradas.');
    app=app.replaceAll(gate,"if(!colecoesEscutadasV428.every(([chave])=>dadosEscutadosV428.has(chave))||!dadosEscutadosV428.has('teste'))return;");
    replaceOnce('let servidorMovimentos=docsParaArray(snapMovimentos);','let servidorMovimentos=snapMovimentos?docsParaArray(snapMovimentos):movimentos;');
    const startObserver=app.indexOf('function abrirObservadoresV428(){');
    const a=app.indexOf('    const cancelar=onSnapshot(collection(db,nome)',startObserver);
    const b=app.indexOf('    cancelamentosV428.push(cancelar);',a)+'    cancelamentosV428.push(cancelar);'.length;
    if(a<startObserver||b<a)throw Error('Acompanhamento de coleção não encontrado.');
    let registration=app.slice(a,b);
    registration=registration.replace('dadosEscutadosV428.set(chave,snap);',"dadosEscutadosV428.set(chave,snap);\n      if(chave==='movimentos')avisoHistoricoV701('Histórico confirmado pelo servidor.');");
    registration=registration.replace("console.error('V428 observador '+nome,err);", "console.error('V428 observador '+nome,err);\n      if(chave==='movimentos')avisoHistoricoV701('Não foi possível atualizar o histórico. Dados salvos neste aparelho foram preservados.');");
    const helpers=`// HISTORY_LAZY_V701
let movimentosSolicitadosV701=false,movimentosSessaoV701=-1;
function avisoHistoricoV701(texto){
 const painel=document.getElementById('estoqueHistoricoPainel');if(!painel)return;
 let aviso=document.getElementById('historicoSyncV701');
 if(!aviso){aviso=document.createElement('p');aviso.id='historicoSyncV701';aviso.className='note';aviso.setAttribute('role','status');painel.prepend(aviso);}
 aviso.textContent=texto;
}
function registrarColecaoV701(chave,nome,sessao){
${registration}
}
function abrirHistoricoMovimentosV701(){
 movimentosSolicitadosV701=true;
 if(!conexaoOnline()){avisoHistoricoV701('Sem internet. Exibindo o histórico salvo neste aparelho.');return;}
 if(observadoresBloqueadosV429){avisoHistoricoV701('Histórico aguardando a liberação do Firebase. Dados locais preservados.');return;}
 if(document.hidden||!cancelamentosV428.length||movimentosSessaoV701===sessaoSyncV428)return;
 movimentosSessaoV701=sessaoSyncV428;
 avisoHistoricoV701('Carregando histórico do servidor…');
 registrarColecaoV701('movimentos',COL.movimentos,sessaoSyncV428);
}
window.addEventListener('online',()=>{if(movimentosSolicitadosV701)abrirHistoricoMovimentosV701();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&movimentosSolicitadosV701)abrirHistoricoMovimentosV701();});
`;
    app=app.slice(0,a)+'    registrarColecaoV701(chave,nome,sessao);'+app.slice(b);
    app=app.replace('function abrirObservadoresV428(){',helpers+'function abrirObservadoresV428(){');
    replaceOnce('  cancelamentosV428.push(cancelarTeste);\n}', '  cancelamentosV428.push(cancelarTeste);\n  if(movimentosSolicitadosV701)abrirHistoricoMovimentosV701();\n}');
    replaceOnce("function abrirSubabaEstoque(nome='principal'){\n  const principal=nome!=='historico';", "function abrirSubabaEstoque(nome='principal'){\n  const principal=nome!=='historico';\n  if(!principal)abrirHistoricoMovimentosV701();");
  }
  html=html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end);
  writeFileSync(file,html);
  console.log('Histórico de movimentações carregado somente ao abrir a tela de histórico.');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)buildHistoryOnDemand(process.argv[2]);
