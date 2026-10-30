async function apagarCargaAtualV388(){
    // Resolve the draft shown in this tab, including a restored/cross-tab summary.
    exigirEscritaPlano();
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
      const ids=new Set(itens.map(x=>String(x.id)));
      // Queue first so a failed permission/persistence check leaves the draft intact.
      itens.forEach(x=>enfileirarOffline(COL.cargas,x.id,null,'delete'));
      carregamentos=carregamentos.filter(x=>!ids.has(String(x.id)));
      lancamentos=lancamentos.filter(x=>!ids.has(String(x.id)));
    }
    sessaoCargaAtual=crypto.randomUUID();
    window.__v456Local.setItem('sessao_carga_atual_v1',sessaoCargaAtual);
    contadorPacotes=0;sessaoPacotes=crypto.randomUUID();salvarContador();
    const nome=document.getElementById('nomeOrigemDestino');if(nome)nome.value='';
    save();sincronizarOfflineOps().catch(()=>{});
    renderLancamentosV387();
    atualizarFluxoCargaV388();
    try{atualizarPainelPacotes()}catch(e){}
    try{calcPreview()}catch(e){}
    try{pcAtualizarPlanilhaDirecionada()}catch(e){}
  }

  async function apagarSomenteResumoCarga(){
    exigirEscritaPlano();
    // The calculator summary includes entries from every destination and unit.
    const ids=lancamentos.map(x=>x.id);
    if(!ids.length)return alert('Não há itens no resumo para apagar.');
    if(!confirm('Apagar somente o resumo da calculadora?\n\nOs registros de estoque, orçamento e carregamentos salvos serão preservados.'))return;
    await ocultarDoResumo(ids);
    contadorPacotes=0;sessaoPacotes=crypto.randomUUID();salvarContador();
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
