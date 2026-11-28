  async function executarBaixaConferidaCargaV390(grupoId,itens,{ajustes=[]}={}){itens=[...itens].sort((a,b)=>Number(isLinearTotalV744(a))-Number(isLinearTotalV744(b)));
    const chaveGrupo=String(grupoId);
    if(baixasEmCurso.size)return alert('A baixa deste carregamento já está em andamento. Aguarde.');
    baixasEmCurso.add(chaveGrupo);
    const agora=Date.now(),quem=nomeUsuarioCargaV388();
    // LOAD_ERROR_PHASE_V2
    let baixaRegistradaLocal=false,etapaBaixa='preparação';
    iniciarMutacaoCargaV396();
    try{
      let itensProcessados=0;
      for(const original of itens){
        etapaBaixa='gravação do item '+String(original.id||'sem identificador');
        const concluido={...original,cargaStatus:'concluido',cargaBaixadaEm:agora,cargaConferidaPor:quem,cargaConferidaPorUid:employeeLoadActor().uid,atualizadoEm:agora};
        await salvarCargaComBaixaV387(concluido,concluido.estoqueOrigem||'estoque1','Carga');
        if(++itensProcessados%8===0)await new Promise(resolve=>setTimeout(resolve,0));
        if(concluido.producaoPendenteV388){
          producaoCalcPendente={...concluido.producaoPendenteV388};
          confirmarUsoProducaoAposLancamento('carga');
        }
      }
      if(ajustes.length)await registrarAjustesConferenciaV390(ajustes,grupoId,quem);
      const unicos=new Map();
      (Array.isArray(carregamentos)?carregamentos:[]).forEach(x=>unicos.set(String(x.id),x));
      carregamentos=[...unicos.values()].map(x=>String(x.grupoCargaId||'')===String(grupoId)&&x.cargaFluxoV388===true?{...x,cargaStatus:'concluido',cargaBaixadaEm:x.cargaBaixadaEm||agora,cargaConferidaPor:x.cargaConferidaPor||quem,atualizadoEm:Math.max(Number(x.atualizadoEm||0),agora)}:x);
      lancamentos=lancamentos.filter(x=>String(x.grupoCargaId||'')!==String(grupoId));
      etapaBaixa='gravação final no aparelho';
      save();
      baixaRegistradaLocal=true;etapaBaixa='sincronização';

      // V396: confirma no servidor apenas os campos de conclusão. O merge evita
      // regravar campos antigos/legados e elimina o caso em que a carga some e volta.
      if(conexaoOnline() && Array.isArray(itens) && itens.length){
        const batchStatus=writeBatch(db);
        itens.forEach(x=>{
          if(!x?.id)return;
          batchStatus.set(doc(db,COL.cargas,String(x.id)),{
            cargaStatus:'concluido',
            cargaBaixadaEm:agora,
            cargaConferidaPor:quem,
            atualizadoEm:agora
          },{merge:true});
        });
        await batchStatus.commit();
        await waitForPendingWrites(db);
      }
      await sincronizarOfflineOps();

      etapaBaixa='atualização da tela';
      try{renderPlanilhasM3Especies()}catch(e){}
      try{renderEstoqueV387()}catch(e){}
      try{renderHistoricoPlanilhasEstoque()}catch(e){}
      try{renderLancamentosV387()}catch(e){}
      atualizarFluxoCargaV388();
      try{renderCarregamentosV392()}catch(e){}
      fecharModalAjusteRapidoV390();
      alert(ajustes.length?'Ajuste rápido realizado e estoque baixado.':'Carregamento conferido e estoque baixado.');
    }catch(e){
      console.error('V396 baixa carga',e);
      const detalheBaixa=(String(e?.name||'Erro')+': '+String(e?.message||e)).slice(0,400);
      try{window.__v456Local.setItem('sm_load_last_failure_v2',JSON.stringify({at:Date.now(),group:String(grupoId),stage:etapaBaixa,error:detalheBaixa,locallyCommitted:baixaRegistradaLocal}));}catch{}
      if(baixaRegistradaLocal){alert('Baixa registrada neste aparelho. A sincronização ou atualização da tela não terminou. Não dê baixa novamente.\n\nEtapa: '+etapaBaixa+'\nMotivo: '+detalheBaixa);return;}
      // Remove qualquer entrada virtual que ainda tenha sobrado após uma falha inesperada.
      const ids=new Set(ajustes.map(a=>String(a.entrada.id)));
      estoque1Lancamentos=estoque1Lancamentos.filter(x=>!ids.has(String(x.id)));
      estoque2Lancamentos=estoque2Lancamentos.filter(x=>!ids.has(String(x.id)));
      if(!window.__smLoadRecoveryNeedsReload)save();
      const msg=String(e?.message||e||'');
      if(msg.startsWith('ESTOQUE_INSUFICIENTE|')){
        const p=msg.split('|');
        return alert(`Saldo alterado durante a conferência. Disponível: ${p[1]} pç. Solicitado: ${p[2]} pç.`);
      }
      alert('A baixa foi interrompida. Não ajuste nem dê baixa novamente nesta carga.\n\nEtapa: '+etapaBaixa+'\nMotivo: '+detalheBaixa+'\n\nPreserve os dados do navegador e envie esta mensagem ao suporte.');
    }finally{
      baixasEmCurso.delete(chaveGrupo);
      finalizarMutacaoCargaV396();
    }
  }

