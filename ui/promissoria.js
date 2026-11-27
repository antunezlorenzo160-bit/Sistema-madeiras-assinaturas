function promissoriaButton(gid){
  return '<button type="button" class="btn btn-secondary" data-promissoria-load="'+esc(gid)+'">Promissória</button>';
}

// Derive a display reference that stays the same across devices and exports.
function promissoriaNumeroPedido(gid){
  let hash=14695981039346656037n;
  for(const char of String(gid)){
    hash=BigInt.asUintN(64,(hash^BigInt(char.codePointAt(0)))*1099511628211n);
  }
  return String(10000n+hash%90000n);
}

function promissoriaSnapshot(gid, commercial, bundle){
  const itens=itensGrupoCargaV400(gid);
  if(!itens.length||statusGrupoV392(itens).chave==='montagem')throw Error('Feche o carregamento antes de emitir a promissória.');
  const cliente=dadosClienteV407(itens), empresa=lerEmpresaDocumentoV421();
  if(!orderCustomerIdentifiedV768(cliente.nome)||!empresa.nome?.trim())throw Error('Confira o nome do cliente e da empresa no cadastro.');
  const grupos=commercial?gruposProdutosCopiaV400(itens):null;
  if(grupos?.some(group=>group.percentual===null))throw Error('Salve os percentuais de todos os produtos na cópia comercial.');
  const copia=commercial?dadosCopiaComercialV400(gid,itens,grupos):null;
  const calc=calcularFinanceiroV403(copia?.valorComercial??valorTotalOriginalCargaV402(itens),obterAjusteV403(itens,commercial?'copia':'original'));
  if(!calc.valido)throw Error('Confira os ajustes financeiros do documento escolhido.');
  const orders=bundle?.orders||[];
  const anexos=commercial&&orders.length?orders.map(order=>projectOrderCopyV771(order,orderDocCopyPhysicalV771(gid),orderDocCopyMapV771(gid))):orders;
  const totalPedidos=anexos.reduce((sum,order)=>sum+order.totalCents,0);
  const total=Math.round(calc.total*100)+totalPedidos;
  if(!Number.isSafeInteger(total)||total<=0)throw Error('O valor total da promissória precisa ser maior que zero.');
  const produtos=[...gruposMedidasCargaV599(copia?.linhas??itens,false).values()].map(grupo=>{
    const tipo=String(grupo.itens[0].tipoMedida||grupo.itens[0].tipoCadastro||'m3').toLowerCase();
    const volume=tipo==='m3'||tipo==='granel'
      ?grupo.itens.reduce((sum,item)=>sum+numeroFisicoV418(item.volume),0)
      :null;
    const valor=grupo.itens.reduce((sum,item)=>sum+(commercial?item._valorComercial:valorOriginalLinhaV399(item)),0);
    return {titulo:grupo.titulo,volume,centavos:Math.round(valor*100)};
  });
  const transporte=dadosTransporteV414(itens);
  return {cliente,empresa,produtos,calc,totalPedidos,total,transporte:[transporte.transportadora,transporte.motorista,transporte.placa].filter(Boolean).join(' · ')};
}

function promissoriaLinkPanel(dialog, gid, prepare, onRecord){
  const panel=dialog.querySelector('[data-share-panel]');
  const create=panel.querySelector('[data-create-link]'), copy=panel.querySelector('[data-copy-link]');
  const view=dialog.querySelector('[data-view-signed]'), status=panel.querySelector('[role="status"]');
  const link=panel.querySelector('input'), whatsapp=panel.querySelector('a');
  const selector=dialog.querySelector('[data-parcela-select]');
  const paymentForm=dialog.querySelector('[data-payment-form]');
  const paymentStatus=dialog.querySelector('[data-payment-status]');
  const paymentDate=paymentForm.elements.date;
  const confirmPayment=paymentForm.querySelector('button');
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
  paymentDate.value=paymentDate.max=today;
  let paying=false;
  const showPayment=record=>{
    const payment=record?.payment;
    paymentForm.hidden=!record||!!payment;
    paymentStatus.textContent=payment?(payment.voided?'Recebimento anulado':'Pago em '+vencimentoDaPromissoria(payment.date))+' · '+valorPromissoria(payment.amountCents):'';
    if(record)paymentForm.querySelector('strong').textContent=valorPromissoria(record.parcela?.centavos??record.document.snapshot.total);
  };
  let saved=null,busy=false;
  const company=empresaV456;
  const load=async(action,payload={})=>{
    if(busy||paying||company!==empresaV456||!finOwnerV722())return;
    busy=true;
    for(const button of [create,copy,view,panel.querySelector('[data-refresh-link]')])button.disabled=true;
    selector.disabled=true;
    confirmPayment.disabled=true;
    status.textContent='Consultando assinatura…';
    try{
      const result=await financeRequestV722({action,loadId:gid,...(saved?.document.parcelas?{parcela:Number(selector.value)}:{}),...payload},null,'assinatura-promissoria');
      if(!dialog.open||company!==empresaV456)return;
      saved=result.document?result:null;
      showPayment(saved);
      await onRecord(saved);
      if(saved?.signedAt&&!saved.document.parcelas)return result;
      link.value='';
      whatsapp.removeAttribute('href');
      if(saved){
        const url=new URL('/assinar-promissoria/',document.baseURI);
        url.hash=saved.token+(saved.parcela?'/'+saved.parcela.numero:'');
        link.value=url.href;
        whatsapp.href='https://wa.me/?text='+encodeURIComponent('Olá! Confira e assine a promissória do pedido nº '+saved.document.numeroPedido+(saved.parcela?' (parcela '+saved.parcela.numero+'/'+saved.document.parcelas.length+')':'')+': '+url.href);
      }
      const expired=saved&&Date.now()>=saved.expiresAt;
      const vencimento=saved?vencimentoDaPromissoria(saved.parcela?.vencimento??saved.document.vencimento):'';
      status.textContent=saved?.signedAt?'Parcela assinada.':expired?'Link expirado. Renove para enviar novamente.':saved?'Aguardando assinatura para '+valorPromissoria(saved.parcela?.centavos??saved.document.snapshot.total)+' com vencimento em '+vencimento+'.':'Gere o link depois de conferir o valor e o vencimento.';
      return result;
    }catch(error){
      if(saved?.parcela)selector.value=String(saved.parcela.numero);
      status.textContent=error.message;
      dialog.querySelector('[data-record-status]').textContent=error.message;
    }
    finally{
      busy=false;
      const active=saved&&Date.now()<saved.expiresAt;
      const shareable=active&&!!link.value&&!saved?.signedAt;
      link.parentElement.hidden=!shareable;
      copy.hidden=!shareable;
      whatsapp.hidden=!shareable;
      view.hidden=!saved?.signedAt&&!saved?.document.parcelas;
      selector.disabled=false;
      confirmPayment.disabled=false;
      create.hidden=!!active||!!saved?.signedAt;
      create.textContent=saved?'Renovar link':'Gerar link de assinatura';
      for(const button of [create,copy,view,panel.querySelector('[data-refresh-link]')])button.disabled=false;
    }
  };
  paymentForm.onsubmit=async event=>{
    event.preventDefault();
    if(!saved||saved.payment||busy||paying||company!==empresaV456||!finOwnerV722())return;
    const amount=saved.parcela?.centavos??saved.document.snapshot.total;
    if(!window.confirm('Confirma o recebimento de '+valorPromissoria(amount)+' em '+vencimentoDaPromissoria(paymentDate.value)+'? Prossiga somente se este valor ainda não foi lançado no caixa.'))return;
    paying=true;
    selector.disabled=confirmPayment.disabled=true;
    paymentStatus.textContent='Registrando recebimento…';
    try{
      const result=await financeRequestV722({action:'confirm-payment',loadId:gid,date:paymentDate.value,
        acknowledged:true,...(saved.parcela?{parcela:saved.parcela.numero}:{})},null,'assinatura-promissoria');
      if(!dialog.open||company!==empresaV456)return;
      saved.payment=result.payment;
      showPayment(saved);
    }catch(error){paymentStatus.textContent=error.message;}
    finally{paying=false;selector.disabled=confirmPayment.disabled=false;}
  };
  panel.addEventListener('toggle',()=>{if(panel.open)load('owner-read');});
  panel.querySelector('[data-refresh-link]').onclick=()=>load('owner-read');
  create.onclick=()=>{
    if(saved?.signedAt)return;
    const payload=saved?{}:prepare();
    if(payload)load('create',payload);
  };
  copy.onclick=async()=>{
    try{await navigator.clipboard.writeText(link.value);status.textContent='Link copiado.';}
    catch{link.focus();link.select();status.textContent='Copie o link selecionado.';}
  };
  return ()=>load('owner-read');
}

function promissoriaParcelas(form,selector){
  const toggle=form.elements.parcelado, rows=form.querySelector('[data-parcela-rows]');
  const add=form.querySelector('[data-parcela-add]');
  const append=()=>{
    const row=document.createElement('fieldset');
    row.innerHTML='<legend></legend><label>Percentual (%) <input type="text" inputmode="decimal" maxlength="6" data-percentual></label><label>Vencimento <input type="date" data-vencimento></label><button type="button" class="btn btn-secondary">Remover parcela</button>';
    row.querySelector('button').onclick=()=>{row.remove();update();};
    rows.append(row);
  };
  const update=()=>{
    const enabled=toggle.checked;
    rows.parentElement.hidden=!enabled;
    form.elements.vencimento.disabled=enabled;
    form.elements.vencimento.closest('label').hidden=enabled;
    const children=[...rows.children];
    children.forEach((row,index)=>{
      row.disabled=!enabled;
      row.querySelector('legend').textContent='Parcela '+(index+1);
      row.querySelector('button').hidden=children.length<=2;
    });
    add.disabled=children.length>=12;
    const selected=selector.value;
    selector.replaceChildren(...children.map((_,i)=>new Option('Parcela '+(i+1)+'/'+children.length,String(i+1))));
    selector.value=selected&&Number(selected)<=children.length?selected:'1';
    selector.closest('label').hidden=!enabled;
    form.dispatchEvent(new Event('input',{bubbles:true}));
  };
  append();append();
  toggle.onchange=update;
  add.onclick=()=>{if(rows.children.length<12){append();update();}};
  update();
  return total=>{
    if(!toggle.checked)return null;
    const input=[...rows.children].map(row=>({percentual:row.querySelector('[data-percentual]').value,vencimento:row.querySelector('[data-vencimento]').value}));
    rows.querySelectorAll('output').forEach(output=>{output.textContent='';});
    const centavos=calcularParcelasPromissoria(input.map(row=>row.percentual),total);
    input.forEach((row,i)=>{
      let output=rows.children[i].querySelector('output');
      if(!output){output=document.createElement('output');rows.children[i].append(output);}
      output.textContent=valorPromissoria(centavos[i]);
    });
    if(input.some(row=>!row.vencimento))throw new Error('Informe o vencimento de cada parcela.');
    const index=Number(selector.value)-1;
    return {input,selected:{...input[index],centavos:centavos[index],numero:index+1,quantidade:input.length}};
  };
}

async function promissoriaOpen(gid){
  if(!finOwnerV722()||document.querySelector('.promissoria-dialog'))return;
  const company=empresaV456;
  const numeroPedido=promissoriaNumeroPedido(gid);
  const emissao=new Date().toLocaleDateString('pt-BR');
  const dialog=document.createElement('dialog');
  dialog.className='promissoria-dialog';
  dialog.style.cssText='width:min(800px,94vw);max-height:90vh;overflow:auto;background:white;color:#16231b;padding:16px;border:1px solid #355845;border-radius:8px';
  dialog.setAttribute('aria-label','Promissória');
  dialog.innerHTML=`<style>${promissoriaCss}
    .promissoria-dialog label{display:grid;gap:5px;margin:0 0 12px;color:#16231b;font-size:14px;font-weight:650}
    .promissoria-dialog label:has(input[type=checkbox]){display:flex;align-items:center}
    .promissoria-dialog input[type=checkbox]{width:auto}
    .promissoria-dialog fieldset{margin:0 0 10px;border:1px solid #788b7e;border-radius:6px}
    .promissoria-dialog [hidden]{display:none!important}
    .promissoria-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
    </style><h3>Promissória</h3>
    <p data-record-status role="status">Consultando promissória…</p>
    <form hidden>
      <label>Usar valores de <select name="origem"><option value="original">Carregamento original</option><option value="copia">Cópia comercial</option></select></label>
      <label><input type="checkbox" name="parcelado"> Parcelar por percentual</label>
      <label>Vencimento <input type="date" name="vencimento" required></label>
      <div hidden>
        <p>Informe percentuais que somem 100%. Cada parcela tem seu próprio vencimento e link de assinatura.</p>
        <div data-parcela-rows></div>
        <button type="button" class="btn btn-secondary" data-parcela-add>Adicionar parcela</button>
      </div>
      <label>Local de emissão e pagamento <input name="local" type="text" maxlength="120" required></label>
      <div class="promissoria-actions">
        <button class="btn btn-primary" type="submit" disabled>Salvar PDF</button>
        <a class="btn btn-secondary" href="https://assinador.iti.br/" target="_blank" rel="noopener noreferrer">Abrir assinador Gov.br</a>
      </div>
      <p>Na impressão, escolha Salvar como PDF. Para o cliente assinar à distância, gere o link em Enviar ao cliente.</p>
      <p role="status"></p>
    </form>
    <label hidden>Parcela da promissória <select data-parcela-select></select></label>
    <details data-share-panel>
      <summary>Enviar ao cliente</summary>
      <div class="promissoria-actions">
        <button class="btn btn-primary" type="button" data-create-link disabled>Gerar link de assinatura</button>
        <button class="btn btn-secondary" type="button" data-copy-link hidden>Copiar link</button>
        <a class="btn btn-secondary" target="_blank" rel="noopener noreferrer" hidden>Enviar link pelo WhatsApp</a>
        <button class="btn btn-secondary" type="button" data-refresh-link>Consultar assinatura</button>
      </div>
      <label hidden>Link para o cliente <input type="url" readonly></label>
      <p role="status"></p>
    </details>
    <form data-payment-form hidden>
      <p>Valor a receber <strong></strong></p>
      <label>Data do recebimento <input type="date" name="date" required></label>
      <button class="btn btn-primary" type="submit">Confirmar pagamento</button>
    </form>
    <p data-payment-status role="status"></p>
    <div class="promissoria-actions">
      <button class="btn btn-primary" type="button" data-view-signed hidden>Salvar PDF assinado</button>
      <button class="btn btn-secondary" type="button" data-close>Fechar</button>
    </div>
    <div data-preview></div>`;
  document.body.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.showModal();
  const form=dialog.querySelector('form:not([data-payment-form])'),fields=form.elements,status=form.querySelector('[role="status"]');
  const preview=dialog.querySelector('[data-preview]'),submit=form.querySelector('[type="submit"]');
  const empresa=lerEmpresaDocumentoV421();
  fields.local.value=[empresa.cidade,empresa.uf].filter(Boolean).join(' / ');
  const recordStatus=dialog.querySelector('[data-record-status]');
  const signedPdf=dialog.querySelector('[data-view-signed]');
  const sharePanel=dialog.querySelector('[data-share-panel]');
  const selector=dialog.querySelector('[data-parcela-select]');
  const draftPlan=promissoriaParcelas(form,selector);
  let bundle,ready=false,shown='',snapshot,recordAtual=null,plan=null,checkingPrint=false,loadingOrders=false;
  const render=()=>{
    if(!ready||recordAtual||company!==empresaV456||!finOwnerV722())return;
    try{
      const commercial=fields.origem.value==='copia';
      const card=document.querySelector('[data-v399-grupo="'+CSS.escape(String(gid))+'"]');
      if(clientePendenteV407(gid)||financeiroPendenteV403(gid,fields.origem.value)||
        card?.querySelector('.v414-transporte-form[data-pendente="1"]')||
        (commercial&&card?.querySelector('.v400-copia-box[data-pendente="1"]')))throw Error('Salve as alterações do carregamento antes de continuar.');
      snapshot=promissoriaSnapshot(gid,commercial,bundle);
      shown=JSON.stringify(snapshot);
      plan=draftPlan(snapshot.total);
      preview.innerHTML=promissoriaSheet(numeroPedido,snapshot,fields.vencimento.value,fields.local.value.trim(),emissao,plan?.selected);
      submit.disabled=checkingPrint;
      status.textContent='';
    }catch(error){
      preview.replaceChildren();
      submit.disabled=true;
      status.textContent=error.message;
    }
  };
  const refresh=promissoriaLinkPanel(dialog,gid,()=>{
    if(recordAtual||checkingPrint)return null;
    if(!form.reportValidity())return null;
    const before=shown;
    render();
    if(submit.disabled||!ready||company!==empresaV456)return null;
    if(before!==shown){
      status.textContent='Os dados mudaram. Confira o documento atualizado antes de gerar o link.';
      return null;
    }
    return {numeroPedido,snapshot,vencimento:plan?.input[0].vencimento??fields.vencimento.value,local:fields.local.value.trim(),...(plan?{parcelas:plan.input,parcela:plan.selected.numero}:{})};
  },async record=>{
    recordStatus.textContent='';
    if(record?.signedAt||record?.document.parcelas){
      recordAtual=record;
      form.hidden=true;
      sharePanel.hidden=!record.document.parcelas;
      dialog.querySelector('h3').textContent=record.signedAt?'Promissória assinada':'Promissórias parceladas';
      recordStatus.textContent=record.signedAt?'Assinatura recebida em '+new Date(record.signedAt).toLocaleString('pt-BR')+'.':'Aguardando assinatura desta parcela.';
      signedPdf.textContent=record.signedAt?'Salvar PDF assinado':'Salvar PDF da parcela';
      if(record.document.parcelas){
        const parcelas=record.document.parcelas;
        selector.closest('label').hidden=false;
        selector.replaceChildren(...parcelas.map(row=>new Option(
          'Parcela '+row.numero+'/'+parcelas.length+' · '+row.percentual.toLocaleString('pt-BR')+'% · '+valorPromissoria(row.centavos),String(row.numero)
        )));
        selector.value=String(record.parcela.numero);
      }
      const {numeroPedido,snapshot,vencimento,local,emissao}=record.document;
      preview.innerHTML=promissoriaSheet(numeroPedido,snapshot,vencimento,local,emissao,record.parcela?{...record.parcela,quantidade:record.document.parcelas.length}:null);
      const image=preview.querySelector('.promissoria-sign img');
      if(record.signedAt){image.src=record.signature;image.hidden=false;}
      return;
    }
    if(ready||loadingOrders)return;
    loadingOrders=true;
    status.textContent='Conferindo os pedidos incluídos…';
    form.hidden=false;
    try{
      const result=await orderDocEnsureV767(gid);
      if(!dialog.open||recordAtual||company!==empresaV456||!finOwnerV722())return;
      bundle=result?.bundle;
      ready=true;
      render();
    }catch(error){status.textContent=error.message;}
    finally{loadingOrders=false;}
  });
  signedPdf.onclick=()=>{
    if(recordAtual&&company===empresaV456&&finOwnerV722()){
      promissoriaPrint(dialog,preview.firstElementChild,recordAtual.document.numeroPedido,recordStatus);
    }
  };
  selector.onchange=()=>recordAtual?refresh():render();
  form.addEventListener('input',render);
  form.onsubmit=async event=>{
    event.preventDefault();
    if(!ready||recordAtual||checkingPrint||company!==empresaV456||!finOwnerV722())return;
    checkingPrint=true;
    submit.disabled=true;
    const result=await refresh();
    checkingPrint=false;
    if(!dialog.open||recordAtual||company!==empresaV456||!finOwnerV722())return;
    const before=shown;
    render();
    if(!result||submit.disabled)return;
    if(before!==shown){status.textContent='Os dados mudaram. Confira o documento atualizado antes de salvar.';return;}
    if(!form.reportValidity()||!fields.local.value.trim()){status.textContent='Confira o vencimento e o local de emissão e pagamento.';return;}
    promissoriaPrint(dialog,preview.firstElementChild,numeroPedido,status);
  };
  await refresh();
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-promissoria-load]');
  if(button)promissoriaOpen(button.dataset.promissoriaLoad);
});
