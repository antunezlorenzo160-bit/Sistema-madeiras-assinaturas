import {applyRomaneioStabilityV834} from './romaneio-stability-build.mjs';
import {readFileSync} from 'node:fs';
export function applyLoadDeductionBatchV833(app){
 if(app.includes('// LOAD_DEDUCTION_BATCH_V833'))return app;
 const a=app.indexOf("async function salvarCargaComBaixa(item,estoqueOrigem,finalidadeSaida='Carga'){"),b=app.indexOf('\nfunction mesmaBitolaTransferencia(',a);
 if(a<0||b<a)throw Error('Batch deduction: source missing');
 let planner=app.slice(a,b).replace("async function salvarCargaComBaixa(item,estoqueOrigem,finalidadeSaida='Carga'){", "async function planLoadLineV833(state,item,estoqueOrigem,finalidadeSaida='Carga'){");
 const recovery="  if(await window.__smLoadDeductionJournal.recover()){window.__smLoadRecoveryNeedsReload=true;throw Error('Reabra o sistema para carregar a baixa recuperada.');}";
 if(!planner.includes(recovery))throw Error('Batch deduction: recovery boundary changed');planner=planner.replace(recovery,'');
 for(const [name,field]of Object.entries({estoque1Lancamentos:'stock1',estoque2Lancamentos:'stock2',carregamentos:'loads',lancamentos:'summary',movimentos:'moves'}))planner=planner.replace(new RegExp('(?:(?<![.\\w])|(?<=\\.\\.\\.))'+name+'\\b','g'),'state.'+field);
 planner=planner.replace("&&x.cargaBaixadaEm))return;", "&&x.cargaBaixadaEm))return {state,operations:[]};");
 const queue=planner.indexOf('    const fila=window.__smMergeLoadDeductionQueue(');if(queue<0)throw Error('Batch deduction: queue boundary changed');
 planner=planner.slice(0,queue)+`    return {state:{stock1:novos1,stock2:novos2,loads:novasCargas,summary:novosLancamentos,moves:novosMovimentos},operations:opsSync};
  }
  throw Error('O planejamento em lote é exclusivo de carregamentos.');
}
`;
 const start=app.indexOf('  async function executarBaixaConferidaCargaV390('),end=app.indexOf('  async function ajusteRapidoEDarBaixaCargaV390(',start);
 let executor=app.slice(start,end);const blockStart=executor.indexOf('      let itensProcessados=0;'),blockEnd=executor.indexOf("      baixaRegistradaLocal=true;etapaBaixa='sincronização';",blockStart);
 if(start<0||end<start||blockStart<0||blockEnd<0)throw Error('Batch deduction: executor boundary changed');
 executor=executor.slice(0,blockStart)+`      if(!ajustes.length&&itens.length>1&&itens.every(row=>!row.producaoPendenteV388)){
        etapaBaixa='gravação da carga no aparelho';
        await commitLoadBatchV833(grupoId,itens,agora,quem);
      }else{
`+executor.slice(blockStart,blockEnd)+`      }
`+executor.slice(blockEnd);
 const repaint=`      try{renderPlanilhasM3Especies()}catch(e){}
      try{renderEstoqueV387()}catch(e){}
      try{renderHistoricoPlanilhasEstoque()}catch(e){}
      try{renderLancamentosV387()}catch(e){}
      atualizarFluxoCargaV388();
      try{renderCarregamentosV392()}catch(e){}`;
 if(!executor.includes(repaint))throw Error('Batch deduction: completion repaint changed');
 executor=executor.replace(repaint,`      try{atualizarTelasAposLancamento('carga')}catch(e){}
      atualizarFluxoCargaV388();
      try{if(!diferirRenderizacaoV595('renderCarregamentosV392','#carregamentos',renderCarregamentosV392))renderCarregamentosV392();}catch(e){}`);
 return applyRomaneioStabilityV834(app.slice(0,start)+'// LOAD_DEDUCTION_BATCH_V833\n'+planner+readFileSync(new URL('../ui/load-deduction-batch.js',import.meta.url),'utf8')+'\n'+executor+app.slice(end));
}
