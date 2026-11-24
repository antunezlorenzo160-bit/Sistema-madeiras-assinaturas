import {applyLoadDeductionBatchV833} from './load-deduction-batch-build.mjs';
export function applyLoadDeductionEfficiencyV796(app){
 if(app.includes('// LOAD_DEDUCTION_EFFICIENCY_V796'))return app;
 const start=app.indexOf("async function salvarCargaComBaixa(item,estoqueOrigem,finalidadeSaida='Carga'){"),end=app.indexOf('\nfunction mesmaBitolaTransferencia(',start);
 if(start<0||end<0)throw Error('Baixa de carga mudou.');
 let body=app.slice(start,end);
 const replace=(a,b)=>{if(!body.includes(a)||body.indexOf(a)!==body.lastIndexOf(a))throw Error('Otimização da baixa mudou: '+a.slice(0,80));body=body.replace(a,()=>b);};
 replace("  const ehCarga=finalidadeSaida==='Carga';",`  // LOAD_DEDUCTION_EFFICIENCY_V796
  // Matching depends on identity/dimensions, never on the changing quantity or balance.
  // Keep original row objects for unchanged stock; replacements below are new objects.
  const matchesV796=new WeakMap();
  const mesmaBitolaV796=reg=>{if(!matchesV796.has(reg))matchesV796.set(reg,mesmaBitolaCarga(reg,item));return matchesV796.get(reg);};
  const ehCarga=finalidadeSaida==='Carga';`);
 replace('if(!mesmaBitolaCarga(reg,item))continue;','if(!mesmaBitolaV796(reg))continue;');
 replace('.filter(x=>mesmaBitolaCarga(x,item) &&', '.filter(x=>mesmaBitolaV796(x) &&');
 replace('const novos1=estoque1Lancamentos.map(x=>({...x}));','const novos1=estoque1Lancamentos.slice();');
 replace('const novos2=estoque2Lancamentos.map(x=>({...x}));','const novos2=estoque2Lancamentos.slice();');
 replace("    try{atualizarPendenciasCadastroV457();window.__smSyncSummaryTabsV606?.();}catch{}\n    sincronizarOfflineOps().catch(()=>{});", "    if(typeof cargaMutationDepthV396==='undefined'||cargaMutationDepthV396===0){\n      try{atualizarPendenciasCadastroV457();window.__smSyncSummaryTabsV606?.();}catch{}\n      sincronizarOfflineOps().catch(()=>{});\n    }");
 app=app.slice(0,start)+body+app.slice(end);
 const anchor="      save();\n      await window.__v456Local.flush?.();\n      baixaRegistradaLocal=true;";
 if(!app.includes(anchor)||app.indexOf(anchor)!==app.lastIndexOf(anchor))throw Error('Persistência final da baixa mudou.');
 return applyLoadDeductionBatchV833(app.replace(anchor,"      save([STORAGE.lancamentos,STORAGE.movimentos,'carregamentos_lancamentos_v1']);\n      await window.__v456Local.flush?.();\n      baixaRegistradaLocal=true;"));
}
