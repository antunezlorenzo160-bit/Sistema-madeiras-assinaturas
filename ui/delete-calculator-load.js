let apagandoCargaV781=false;
async function apagarCargaAtualV388(){
    exigirEscritaPlano();
    if(apagandoCargaV781||lotePacotesEmCurso||window.__smPacketPersistencePendingV778)return alert('Aguarde ou salve o lançamento pendente antes de apagar a carga.');
    apagandoCargaV781=true;
    const controls=[...(document.querySelectorAll?.('#calculadora input,#calculadora select,#calculadora button')||[])].map(el=>({el,disabled:el.disabled}));
    const button=document.getElementById('btnLimparLancamentos'),label=button?.textContent;
    const priorOps=new Map(opsBlocoPacotes);let batching=false,changed=false;
    try{
      const visiveis=lancamentos.filter(x=>x?.destino==='carga'||x?.cargaFluxoV388===true);
      let itens=itensCargaAtualV388();
      if(!itens.length){
        const grupos=[...new Set(visiveis.filter(x=>x?.cargaFluxoV388===true&&window.statusEfetivoCargaV589(x)==='montagem').map(x=>String(x.grupoCargaId||'')).filter(Boolean))];
        if(grupos.length>1)return alert('Há mais de um carregamento no resumo. Abra o desejado em Carregamentos → Continuar carregamento antes de apagar.');
        if(grupos.length===1)itens=itensGrupoCargaV388(grupos[0],'montagem');
      }
      if(!itens.length){
        if(!visiveis.length)return alert('Não há carregamento no resumo para apagar.');
        if(!confirm('Limpar o carregamento do resumo da calculadora?\n\nOs carregamentos salvos e as baixas de estoque serão preservados.'))return;
        await ocultarDoResumo(visiveis.map(x=>x.id));
      }else{
        if(!confirm('Apagar este carregamento em montagem?\n\nOs carregamentos fechados e o estoque serão preservados.'))return;
        for(const {el}of controls)el.disabled=true;
        if(button)button.textContent='Apagando…';
        batching=true;lotePacotesEmCurso=true;window.__smPacketBatchActiveV779=true;
        // Same per-record checks; the existing batch buffer avoids rewriting
        // the entire durable queue once for every package.
        itens.forEach(x=>enfileirarOffline(COL.cargas,x.id,null,'delete'));
        const ids=new Set(itens.map(x=>String(x.id)));
        changed=true;
        carregamentos=carregamentos.filter(x=>!ids.has(String(x.id)));
        lancamentos=lancamentos.filter(x=>!ids.has(String(x.id)));
      }
      sessaoCargaAtual=crypto.randomUUID();
      window.__v456Local.setItem('sessao_carga_atual_v1',sessaoCargaAtual);
      contadorPacotes=0;sessaoPacotes=crypto.randomUUID();salvarContador();
      const nome=document.getElementById('nomeOrigemDestino');if(nome)nome.value='';
      if(batching)await persistirBlocoPacotes();else{save();await window.__v456Local.flush?.();}
      if(batching){lotePacotesEmCurso=false;window.__smPacketBatchActiveV779=false;batching=false;}
      sincronizarOfflineOps().catch(()=>{});
      renderLancamentosV387();atualizarFluxoCargaV388();
      try{atualizarPainelPacotes()}catch(e){}
      try{calcPreview()}catch(e){}
      try{pcAtualizarPlanilhaDirecionada()}catch(e){}
    }catch(error){
      if(!changed){opsBlocoPacotes.clear();for(const [key,value]of priorOps)opsBlocoPacotes.set(key,value);throw error;}
      packetPersistenceFailureV778();
      alert('A exclusão ainda não foi confirmada no aparelho. Preserve esta página e use Tentar salvar sem lançar novamente. '+String(error?.message||error));
    }finally{
      if(batching){lotePacotesEmCurso=false;window.__smPacketBatchActiveV779=false;}
      apagandoCargaV781=false;
      for(const {el,disabled}of controls)el.disabled=disabled;
      if(button){button.textContent=label;button.disabled=window.__smPacketPersistencePendingV778===true;}
    }
  }

  async function apagarSomenteResumoCarga(){
    exigirEscritaPlano();
    if(typeof lotePacotesEmCurso!=='undefined'&&lotePacotesEmCurso)return alert('Aguarde o término dos lançamentos antes de limpar o resumo.');
    if(lancamentos.length){
      if(!confirm('Apagar somente o resumo da calculadora?\n\nOs registros de estoque, orçamento e carregamentos salvos serão preservados.'))return;
      const anteriores=lancamentos;
      lancamentos=[];
      try{save([STORAGE.lancamentos]);}catch(error){lancamentos=anteriores;throw error;}
      contadorPacotes=0;sessaoPacotes=crypto.randomUUID();salvarContador();
    }
    // Redraw even when only stale rows remain in the DOM.
    renderLancamentosV387();
    try{atualizarPainelPacotes()}catch(e){}
    try{calcPreview()}catch(e){}
    try{pcAtualizarPlanilhaDirecionada()}catch(e){}
    atualizarFluxoCargaV388();
  }

  function atualizarBotaoApagarResumoCarga(){
    let button=document.getElementById('btnApagarSomenteResumoCarga');
    const anchor=document.getElementById('btnLimparLancamentos');
    if(!button&&anchor){
      button=document.createElement('button');
      button.id='btnApagarSomenteResumoCarga';button.type='button';
      button.className='btn btn-danger';button.textContent='Apagar resumo';
      button.style.gridColumn='1 / -1';
      button.addEventListener('click',apagarSomenteResumoCarga);
      anchor.insertAdjacentElement('afterend',button);
    }
    if(button)button.hidden=destinoSelecionado()!=='carga';
  }
