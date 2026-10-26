import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function buildBudgetQueue(input=new URL('../public/index.html',import.meta.url)){
 const file=input instanceof URL?input:pathToFileURL(resolve(input));let html=readFileSync(file,'utf8');
 const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;
 if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada.');
 let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let app=JSON.parse(html.slice(start,end));
 if(!app.includes('// BUDGET_QUEUE_V705')){
  function replace(before,after){if(!app.includes(before)||app.indexOf(before)!==app.lastIndexOf(before))throw Error('Trecho da fila mudou: '+before.slice(0,80));app=app.replace(before,()=>after);}
  const duplicate=`      Promise.resolve(gravarDoc(COL.orcamento,oi.id,oi)).catch(err=>{
        console.error('Orçamento pendente de sincronização',err);
        try{enfileirarOffline(COL.orcamento,oi.id,{...oi,atualizadoEm:Date.now()})}catch(e){}
      });`;
  replace(duplicate,`      // The durable queue is the single writer and clears its acknowledged revision.
      sincronizarOfflineOps().catch(err=>console.warn('Orçamento aguardando sincronização.',err));`);
  const helper=readFileSync(new URL('../ui/budget-queue.js',import.meta.url),'utf8');
  replace('let offlineSyncPromiseV396=null;',`// BUDGET_QUEUE_V705\n${helper}\nlet offlineSyncPromiseV396=null;`);
  replace("          if(op.modo==='delete')await deleteDoc(doc(db,op.nome,op.id));\n          else await setDoc", "          if(op.modo==='delete')await deleteDoc(doc(db,op.nome,op.id));\n          else if(op.nome===COL.orcamento)await enviarOperacaoOrcamentoV705(op);\n          else await setDoc");
  replace('      salvarOfflineOps(restantes);\n      if(confirmouCadastroV457', '      salvarOfflineOps(restantes);\n      if(houveSucesso&&lote.some(op=>op.nome===COL.orcamento))agendarAplicacaoV428();\n      if(confirmouCadastroV457');
 }
 writeFileSync(file,html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end));
 console.log('Orçamento usa fila única e confirmação transacional contra reenvio de itens excluídos.');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)buildBudgetQueue(process.argv[2]);
