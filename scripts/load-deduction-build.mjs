import {readFileSync} from 'node:fs';
export function applyLoadDeductionSafety(html){
 const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;
 if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada.');
 let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let app=JSON.parse(html.slice(start,end));
 if(app.includes('// LOAD_DEDUCTION_JOURNAL_V1'))return html;
 const replace=(before,after)=>{if(!app.includes(before)||app.indexOf(before)!==app.lastIndexOf(before))throw Error('Trecho de baixa mudou: '+before.slice(0,90));app=app.replace(before,()=>after);};
 const helper=readFileSync(new URL('../public/load-deduction-journal.mjs',import.meta.url),'utf8').replaceAll('export ','');
 replace("window.__v456Local=scoped(l);window.__v456Session=scoped(s);",`window.__v456Local=scoped(l);window.__v456Session=scoped(s);
 // LOAD_DEDUCTION_JOURNAL_V1
 ${helper}
 window.__smLoadDeductionJournal=createLoadDeductionJournal(window.__v456Local);
 window.__smLoadDeductionJournal.recover();
 window.__smMergeLoadDeductionQueue=mergeLoadDeductionQueue;`);
 replace("async function salvarCargaComBaixa(item,estoqueOrigem,finalidadeSaida='Carga'){",`async function salvarCargaComBaixa(item,estoqueOrigem,finalidadeSaida='Carga'){
  if(!conexaoOnline()&&window.__v456Local.durable!==true)throw Error('Este navegador não confirmou o armazenamento offline. Conecte à internet antes de baixar o estoque.');
  if(finalidadeSaida==='Carga'&&carregamentos.some(x=>String(x.id)===String(item.id)&&x.cargaBaixadaEm))return;
  if(window.__smLoadRecoveryNeedsReload)throw Error('Reabra o sistema para recuperar a baixa interrompida.');
  if(window.__smLoadDeductionJournal.recover()){window.__smLoadRecoveryNeedsReload=true;throw Error('Reabra o sistema para carregar a baixa recuperada.');}`);
 replace('function save(chaves){',"function save(chaves){\n if(window.__smLoadRecoveryNeedsReload)throw Error('Reabra o sistema para recuperar a baixa interrompida.');");
 replace("function enfileirarOffline(nome,id,obj,modo='set'){","function enfileirarOffline(nome,id,obj,modo='set'){\n if(window.__smLoadRecoveryNeedsReload)throw Error('Reabra o sistema para recuperar a baixa interrompida.');");
 const before=`  if(ehCarga){
    opsSync.push({nome:COL.cargas,id:item.id,obj:saidaSalva,modo:'set'});
    carregamentos.push({...saidaSalva});
  }

  estoque1Lancamentos=novos1;`;
 replace(before,`  if(ehCarga){
    opsSync.push({nome:COL.cargas,id:item.id,obj:saidaSalva,modo:'set'});
    for(const op of opsSync){employeeCheckLoadWrite(doc(db,op.nome,op.id),op.obj,op.modo);employeeAssertWrite(doc(db,op.nome,op.id));}
    exigirEscritaPlano();
    const novasCargas=carregamentos.filter(x=>String(x.id)!==String(item.id)).concat({...saidaSalva});
    const novosLancamentos=lancamentos.filter(x=>String(x.id)!==String(item.id)).concat({...saidaSalva});
    const novosMovimentos=[...movimentosNovos,...movimentos];
    const fila=window.__smMergeLoadDeductionQueue(offlineOps(),opsSync,Date.now(),()=>crypto.randomUUID());
    try{window.__smLoadDeductionJournal.commit([
      ['estoque1_lancamentos_v1',JSON.stringify(novos1)],['estoque2_lancamentos_v1',JSON.stringify(novos2)],
      ['carregamentos_lancamentos_v1',JSON.stringify(novasCargas)],[STORAGE.lancamentos,JSON.stringify(novosLancamentos)],
      [STORAGE.movimentos,JSON.stringify(novosMovimentos)],[OFFLINE_OPS_KEY,JSON.stringify(fila)]
    ]);}catch(error){window.__smLoadRecoveryNeedsReload=true;throw error;}
    estoque1Lancamentos=novos1;estoque2Lancamentos=novos2;carregamentos=novasCargas;lancamentos=novosLancamentos;movimentos=novosMovimentos;
    try{atualizarPendenciasCadastroV457();window.__smSyncSummaryTabsV606?.();}catch{}
    sincronizarOfflineOps().catch(()=>{});
    return;
  }

  estoque1Lancamentos=novos1;`);
 replace('  function itensGrupoCargaV388(grupoId,status=\'\'){\n    return (Array.isArray(carregamentos)?carregamentos:[]).filter(x=>',`  function itensGrupoCargaV388(grupoId,status=''){
    const unique=new Map();
    for(const row of (Array.isArray(carregamentos)?carregamentos:[])){
      if(!row?.id)continue;
      const key=String(row.id),previous=unique.get(key);
      if(!previous||!previous.cargaBaixadaEm)unique.set(key,row);
    }
    return [...unique.values()].filter(x=>`);
 replace('  async function executarBaixaConferidaCargaV390(grupoId,itens,{ajustes=[]}={}){',`  const baixasEmCurso=new Set();
  async function executarBaixaConferidaCargaV390(grupoId,itens,{ajustes=[]}={}){
    const chaveGrupo=String(grupoId);
    if(baixasEmCurso.has(chaveGrupo))return alert('A baixa deste carregamento já está em andamento. Aguarde.');
    baixasEmCurso.add(chaveGrupo);`);
 replace('      for(const original of itens){','      let itensProcessados=0;\n      for(const original of itens){');
 replace("        await salvarCargaComBaixaV387(concluido,concluido.estoqueOrigem||'estoque1','Carga');","        await salvarCargaComBaixaV387(concluido,concluido.estoqueOrigem||'estoque1','Carga');\n        if(++itensProcessados%8===0)await new Promise(resolve=>setTimeout(resolve,0));");
 replace('      save();\n      const msg=String(e?.message', '      if(!window.__smLoadRecoveryNeedsReload)save();\n      const msg=String(e?.message');
 replace("      alert('A baixa foi feita localmente, mas não foi possível confirmar o status do carregamento no servidor. Verifique a conexão e tente novamente.');", "      alert('A baixa foi interrompida. Preserve os dados deste navegador. Reabra o sistema para recuperar os registros antes de continuar; não ajuste novamente o estoque nem repita a baixa sem conferir os itens já concluídos.');");
 replace('      finalizarMutacaoCargaV396();\n    }\n  }\n\n  async function ajusteRapidoEDarBaixaCargaV390', '      baixasEmCurso.delete(chaveGrupo);\n      finalizarMutacaoCargaV396();\n    }\n  }\n\n  async function ajusteRapidoEDarBaixaCargaV390');
 return html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end);
}
