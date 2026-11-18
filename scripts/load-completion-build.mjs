import {readFileSync} from 'node:fs';
export function applyLoadCompletionV792(app){
 if(app.includes('// LOAD_COMPLETION_V792'))return app;
 const start=app.indexOf('      // V396: confirma no servidor apenas os campos de conclusão.'),end=app.indexOf("      etapaBaixa='atualização da tela';",start);
 if(start<0||end<0)throw Error('Confirmação da baixa mudou.');
 app=app.slice(0,start)+`      // LOAD_COMPLETION_V792 — full rows are already in the durable queue.
      // A status-only upsert could recreate a deleted row or precede its physical data.
      // Do not wait on the network to acknowledge the completed local deduction.
      sincronizarOfflineOps().catch(error=>marcarSyncErro(error,'Baixa salva no aparelho; envio não confirmado'));

`+app.slice(end);
 const anchor="      save();\n      baixaRegistradaLocal=true;etapaBaixa='sincronização';";
 if(!app.includes(anchor))throw Error('Persistência final da baixa mudou.');
 app=app.replace(anchor,"      save();\n      await window.__v456Local.flush?.();\n      baixaRegistradaLocal=true;etapaBaixa='sincronização';");
 const alert="alert(ajustes.length?'Ajuste rápido realizado e estoque baixado.':'Carregamento conferido e estoque baixado.');";
 if(!app.includes(alert))throw Error('Aviso da baixa mudou.');
 return app.replace(alert,'alert(loadCompletionMessageV792(ajustes.length>0,offlineOps().length>0));');
}
export function applyOfflineSyncStateV792(app){
 if(app.includes('// OFFLINE_SYNC_STATE_V792'))return app;
 const replace=(a,b)=>{if(!app.includes(a)||app.indexOf(a)!==app.lastIndexOf(a))throw Error('Estado de sincronização mudou: '+a.slice(0,70));app=app.replace(a,()=>b);};
 const pure=readFileSync(new URL('../public/offline-sync-state.mjs',import.meta.url),'utf8').replaceAll('export ','')+'\n'+readFileSync(new URL('../ui/load-sync-check.js',import.meta.url),'utf8');
 replace('function atualizarStatusSync(estado,msg){',`// OFFLINE_SYNC_STATE_V792\n${pure}\nlet erroEnvioOfflineV792=null;\nfunction atualizarStatusSync(estado,msg){
  if(estado==='ok'&&window.__smRecordStorageFailureV779){estado='erro';msg='Gravação no aparelho não confirmada; preserve esta página';}
  if(estado==='ok'){
   const state=offlineQueueStateV792(offlineOps(),erroEnvioOfflineV792);
   if(state.pending){estado=state.error?'erro':'aguarda';msg=state.pending+' alteração(ões) salva(s) neste aparelho • envio '+(state.error?'não confirmado: '+state.error:'pendente de confirmação');}
  }`);
 replace("}catch(e){if(op.nome===COL.madeiras)erroCadastroSyncV457=String(e?.code||e?.message||e).slice(0,100);}","}catch(e){erroEnvioOfflineV792={key:op.chave,revision:String(op.revisao||op.criadoEm||0),code:String(e?.code||e?.name||'falha no envio').slice(0,80)};atualizarStatusSync('erro','Envio não confirmado: '+erroEnvioOfflineV792.code);if(op.nome===COL.madeiras)erroCadastroSyncV457=String(e?.code||e?.message||e).slice(0,100);}");
 replace('  })().finally(()=>{offlineSyncPromiseV396=null});',"  })().finally(()=>{offlineSyncPromiseV396=null;atualizarStatusSync('ok','Envios confirmados');});");
 const copyButton='<button type="button" class="btn btn-secondary" onclick="copiarCargaV392(\'${pid}\')">Copiar texto</button>';
 replace(copyButton,copyButton+'<button type="button" class="btn btn-secondary" data-load-sync-v792="${esc(gid)}" onclick="conferirEnvioCargaV792(this.dataset.loadSyncV792)">Conferir envio</button>');
 return app;
}
