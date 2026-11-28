function resumoBlocoEditavel(rows,destino){
  if(!rows.length||!['orcamento','carga'].includes(destino))return false;
  return rows.every(row=>(row.tipoMedida||'m3')==='m3'&&!row.vendaFechadaM3&&!isLastroM3V825(row)&&
    Number(row.largura)>0&&Number(row.quantidade)>0&&
    (destino==='orcamento'||row.grupoCargaId===sessaoCargaAtual&&row.cargaStatus==='montagem'&&!row.cargaBaixadaEm));
}

function resumoBlocoBotao(chave,rowsByBlock,destino){
  if(!resumoBlocoEditavel(rowsByBlock.get(chave)||[],destino))return '';
  return ' <button type="button" class="btn btn-secondary no-print" data-editar-bloco-resumo="'+esc(chave)+'">Editar medidas</button>';
}

function resumoBlocoNumero(value){
  const text=String(value).trim().replace(',','.');
  const number=Number(text);
  if(!/^\d+(?:\.\d{1,4})?$/.test(text)||!Number.isFinite(number)||number<=0)
    throw Error('Informe medidas maiores que zero, com até quatro casas decimais.');
  return number;
}

function resumoBlocoMedidas(row,espessura,comprimento,budget,atualizadoEm){
  const wood=madeiras.find(item=>String(item.id)===String(row.madeiraId));
  const bitolas=wood?normalizarBitolasCadastroV347(wood.bitolas||[]):[];
  const tipos=m3TypeChoicesV829(bitolas,espessura,wood?.tiposGeraisM3);
  const tipo=row.tipoBitolaV829||(tipos.length===1?tipos[0]:'');
  if(tipos.length&&!tipos.some(value=>value.toLocaleLowerCase('pt-BR')===String(tipo||'').toLocaleLowerCase('pt-BR')))
    throw Error('A nova espessura tem tipos cadastrados diferentes. Confira o tipo da madeira antes de corrigir o bloco.');
  const medida={...row,espessura,comprimento,atualizadoEm,...(tipo?{tipoBitolaV829:tipo,produto:tipo}:{})};
  const volumeReal=volume(row.largura,espessura,comprimento,row.quantidade);
  if(!Number.isFinite(volumeReal)||volumeReal<=0)throw Error('O volume da nova medida é inválido.');
  const rates=catalogPricePair(medida,wood?{...wood,bitolas}:null);
  if(!rates.locked){
    const rate=row.priceTierV1==='atacado'&&rates.wholesale>0?rates.wholesale:rates.retail;
    medida.preco=rate;
    if(row.autoPriceV1)medida.autoPriceV1={...row.autoPriceV1,...rates};
  }
  if(budget)return aplicarCobrancaOrcamento(medida);
  const next={...medida,volume:volumeReal,valor:volumeReal*Number(medida.preco||0)};
  return row.servicePricingV727===true?priceLoadServices(next):next;
}

function abrirEditorBlocoResumo(chave){
  if(document.querySelector('.resumo-bloco-editor'))return;
  const destino=destinoSelecionado(),budget=destino==='orcamento';
  const rows=()=>fonteResumoAtual().filter(row=>chaveBlocoResumoV598(row)===chave);
  const initial=rows();
  if(!resumoBlocoEditavel(initial,destino))return;
  const signature=JSON.stringify(initial);
  const dialog=document.createElement('dialog');
  dialog.className='resumo-bloco-editor';
  dialog.style.cssText='width:min(420px,90vw);padding:16px;background:#162c23;color:#fff;border:1px solid #658477;border-radius:10px';
  dialog.setAttribute('aria-label','Editar medidas do bloco');
  dialog.innerHTML=`<form>
    <h3>Editar medidas do bloco</h3><p>${esc(initial[0].madeira)} · ${initial.length} lançamento(s)</p>
    <label>Espessura (cm)<input name="espessura" type="text" inputmode="decimal" required></label>
    <label>Comprimento (m)<input name="comprimento" type="text" inputmode="decimal" required></label>
    <p role="status"></p>
    <button type="button" class="btn btn-secondary">Cancelar</button>
    <button type="submit" class="btn btn-primary">Aplicar ao bloco</button>
  </form>`;
  document.body.append(dialog);
  const form=dialog.querySelector('form'),status=form.querySelector('[role="status"]');
  const cancel=form.querySelector('[type="button"]'),submit=form.querySelector('[type="submit"]');
  form.elements.espessura.value=String(initial[0].espessura).replace('.',',');
  form.elements.comprimento.value=String(initial[0].comprimento).replace('.',',');
  cancel.onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.addEventListener('cancel',event=>{if(submit.disabled)event.preventDefault();});
  dialog.showModal();
  form.onsubmit=async event=>{
    event.preventDefault();
    if(submit.disabled)return;
    submit.disabled=cancel.disabled=true;
    let mutating=false;
    try{
      const espessura=resumoBlocoNumero(form.elements.espessura.value);
      const comprimento=resumoBlocoNumero(form.elements.comprimento.value);
      if(espessura===Number(initial[0].espessura)&&comprimento===Number(initial[0].comprimento)){dialog.close();return;}
      exigirEscritaPlano();
      if(!budget)employeeRequireLoadDraftWrite();
      const journal=window.__smLoadDeductionJournal;
      if(lotePacotesEmCurso||window.__smLoadRecoveryNeedsReload||journal.busy)throw Error('Aguarde a gravação em andamento.');
      iniciarMutacaoCargaV396();
      mutating=true;
      if(await journal.recover()){
        window.__smLoadRecoveryNeedsReload=true;
        throw Error('Reabra o sistema para carregar a gravação recuperada.');
      }
      const current=rows();
      if(destinoSelecionado()!==destino||JSON.stringify(current)!==signature||!resumoBlocoEditavel(current,destino))
        throw Error('Os lançamentos mudaram. Feche e abra o bloco novamente.');
      exigirEscritaPlano();
      const source=budget?orcamento:carregamentos,byId=new Map(source.map(row=>[String(row.id),row]));
      const changed=new Map();
      const now=Date.now(),collection=budget?COL.orcamento:COL.cargas;
      for(const row of current){
        const original=byId.get(String(row.id));
        if(!original||chaveBlocoResumoV598(original)!==chave||!resumoBlocoEditavel([original],destino))
          throw Error('O lançamento original mudou. Feche e abra o bloco novamente.');
        const next=resumoBlocoMedidas(original,espessura,comprimento,budget,now);
        changed.set(String(next.id),next);
        const ref=doc(db,collection,next.id);
        if(!budget)employeeCheckLoadWrite(ref,next,'set');
        employeeAssertWrite(ref);
      }
      const replace=row=>changed.get(String(row.id))||row;
      const next=source.map(replace),summary=budget?null:lancamentos.map(replace);
      const operations=[...changed.values()].map(row=>({nome:collection,id:row.id,obj:row,modo:'set'}));
      const queue=window.__smMergeLoadDeductionQueue(offlineOps(),operations,now,()=>crypto.randomUUID());
      const entries=[[budget?STORAGE.orcamento:'carregamentos_lancamentos_v1',JSON.stringify(next)],[OFFLINE_OPS_KEY,JSON.stringify(queue)]];
      if(summary)entries.push([STORAGE.lancamentos,JSON.stringify(summary)]);
      status.textContent='Salvando alterações…';
      try{
        await journal.commit(entries);
        if(budget)orcamento=next;
        else{carregamentos=next;lancamentos=summary;}
        await window.__v456Local.flush?.();
      }catch(error){window.__smLoadRecoveryNeedsReload=true;throw error;}
      dialog.close();
      atualizarTelasAposLancamento(destino);
      sincronizarOfflineOps().catch(error=>marcarSyncErro(error,'Correção salva no aparelho; envio pendente'));
    }catch(error){status.textContent=error.message;}
    finally{
      if(mutating)finalizarMutacaoCargaV396();
      submit.disabled=cancel.disabled=false;
    }
  };
}

document.getElementById('tbLancamentos')?.addEventListener('click',event=>{
  const button=event.target.closest('[data-editar-bloco-resumo]');
  if(button)abrirEditorBlocoResumo(button.dataset.editarBlocoResumo);
});
