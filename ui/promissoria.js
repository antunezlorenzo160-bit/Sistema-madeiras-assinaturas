const promissoriaCss = `
.promissoria-sheet{box-sizing:border-box;color:#16231b;background:white;border:1px solid #355845;padding:3mm;font:10pt/1.25 Arial,sans-serif;overflow-wrap:anywhere}
.promissoria-sheet h2,.promissoria-sheet h3,.promissoria-sheet th,.promissoria-band{background:#154423;color:white;margin:0;text-align:center;padding:1.2mm 2mm}
.promissoria-sheet h2{font-size:17pt}.promissoria-sheet h3{font-size:14pt}
.promissoria-sheet table{width:100%;border-collapse:collapse;margin:2mm 0;font:inherit;color:inherit;min-width:0}
.promissoria-sheet th,.promissoria-sheet td{border:1px solid #788b7e;padding:1mm 1.6mm;white-space:normal;background-image:none}
.promissoria-sheet td{color:#16231b;background:#fff}
.promissoria-sheet .promissoria-money{text-align:right}
.promissoria-company{padding:2mm 0}.promissoria-company .v421-empresa-cab{display:flex;align-items:center;gap:4mm}
.promissoria-company img{max-width:44mm;max-height:25mm;object-fit:contain}
.promissoria-company .v421-empresa-nome{font-size:16pt;font-weight:bold;color:#154423}
.promissoria-total{padding:1.6mm;background:#e4ebe4;text-align:right;font-weight:bold;color:#154423}
.promissoria-cut{border:0;border-top:1px dashed #55645a;margin:4mm 0}
.promissoria-note{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2mm}
.promissoria-side{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;font-weight:bold}
.promissoria-sign{text-align:center;padding:2mm 0}.promissoria-sign img{display:block;margin:auto;width:85mm;max-width:100%;height:17mm;object-fit:contain}
.promissoria-sign span{display:block;border-top:1px solid;margin:auto;width: min(85mm,95%);padding-top:1mm;font-weight:bold}
.promissoria-sign img[hidden]{display:none}
.promissoria-sign:has(img[hidden]){padding-top:19mm}
@media print{.promissoria-sheet{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
`;

function promissoriaButton(gid){
  return '<button type="button" class="btn btn-secondary" data-promissoria-load="'+esc(gid)+'">Gerar promissória</button>';
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
  return {cliente,empresa,produtos,calc,totalPedidos,total,cabecalho:documentoEmpresaHtmlV421('relatorio'),transporte:[transporte.transportadora,transporte.motorista,transporte.placa].filter(Boolean).join(' · ')};
}

function promissoriaSheet(gid, snapshot, vencimento, local){
  const {cliente,empresa,produtos,calc,totalPedidos,total,cabecalho,transporte}=snapshot;
  const data=vencimento?vencimento.split('-').reverse().join('/'):'—';
  const valor=finMoneyV722(total);
  const endereco=[cliente.logradouro,cliente.numero,cliente.complemento,cliente.bairro,cliente.cep].filter(Boolean).join(' · ');
  const rowsProdutos=produtos.map(({titulo,volume,centavos})=>
    `<tr><td>${esc(titulo)}</td><td class="promissoria-money">${volume>0?numeroRomaneioV418(volume,4)+' m³':'—'}</td><td class="promissoria-money">${finMoneyV722(centavos)}</td></tr>`
  ).join('');
  const resumo=[
    ['Subtotal do carregamento',Math.round(calc.subtotal*100)],
    ['Desconto',-Math.round(calc.desconto*100)],
    ['Frete',Math.round(calc.frete*100)],
    ['Outras despesas',Math.round(calc.outras*100)],
    ['Pedidos incluídos',totalPedidos]
  ];
  const rows=resumo.filter(([,amount],index)=>index===0||amount!==0).map(([label,amount])=>
    `<tr><td colspan="2">${label}</td><td class="promissoria-money">${finMoneyV722(amount)}</td></tr>`
  ).join('');
  return `<article class="promissoria-sheet">
    <div class="promissoria-company">${cabecalho}</div>
    <h2>PEDIDO <small>nº ${esc(gid)}</small></h2>
    <table><tbody>
      <tr><td><b>Cliente</b> ${esc(cliente.nome)}</td><td><b>Telefone</b> ${esc(cliente.telefone||'—')}</td></tr>
      <tr><td colspan="2"><b>Endereço</b> ${esc(endereco||'—')}</td></tr>
      <tr><td><b>Cidade / UF</b> ${esc([cliente.cidade,cliente.uf].filter(Boolean).join(' / ')||'—')}</td><td><b>Pagamento</b> Nota promissória</td></tr>
      <tr><td colspan="2"><b>Transporte</b> ${esc(transporte||'—')}</td></tr>
    </tbody></table>
    <table><thead><tr><th>PRODUTO</th><th>VOLUME</th><th>VALOR</th></tr></thead>
    <tbody>${rowsProdutos}</tbody><tfoot>${rows}</tfoot></table>
    <div class="promissoria-total">TOTAL DO PEDIDO: ${valor}</div>
    <hr class="promissoria-cut">
    <section class="promissoria-note"><div class="promissoria-band promissoria-side">REPÚBLICA FEDERATIVA DO BRASIL</div><div>
      <h3>NOTA PROMISSÓRIA</h3>
      <table><tbody>
        <tr><td><b>Número</b> ${esc(gid)}</td><td><b>Vencimento</b> ${data}</td><td><b>Valor</b> ${valor}</td></tr>
        <tr><td colspan="3"><b>Empresa</b> ${esc(empresa.nome)}${empresa.cnpj?' · CNPJ '+esc(fmtDocEmpresaV421(empresa.cnpj)):''}</td></tr>
        <tr><td colspan="3"><b>Cliente</b> ${esc(cliente.nome)}</td></tr>
        <tr><td colspan="3"><b>CPF / CNPJ</b> ${esc(documentoClienteFormatadoV417(cliente.documento)||'—')}</td></tr>
        <tr><td colspan="3"><b>Local e data de emissão</b> ${esc(local||'—')} · ${new Date().toLocaleDateString('pt-BR')}</td></tr>
        <tr><td colspan="3">Pagarei por esta nota promissória, no vencimento indicado, a ${esc(empresa.nome)} ou à sua ordem, a quantia de ${valor}, em moeda corrente nacional. Local de pagamento: ${esc(local||'—')}.</td></tr>
      </tbody></table>
      <div class="promissoria-sign"><img alt="Assinatura desenhada pelo cliente" hidden><span>Assinatura do cliente</span></div>
    </div></section>
  </article>`;
}

function promissoriaSignature(canvas){
  const ctx=canvas.getContext('2d');
  ctx.lineWidth=4;
  ctx.lineCap=ctx.lineJoin='round';
  let pointer=null, signed=false;
  const point=event=>{
    const box=canvas.getBoundingClientRect();
    return [(event.clientX-box.left)*canvas.width/box.width,(event.clientY-box.top)*canvas.height/box.height];
  };
  canvas.onpointerdown=event=>{
    if(pointer!==null||event.button!==0)return;
    pointer=event.pointerId;
    canvas.setPointerCapture(pointer);
    ctx.beginPath();
    ctx.moveTo(...point(event));
  };
  canvas.onpointermove=event=>{
    if(event.pointerId!==pointer)return;
    const next=point(event);
    ctx.lineTo(...next);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(...next);
    signed=true;
  };
  canvas.onlostpointercapture=()=>{pointer=null;};
  return {
    clear(){ctx.clearRect(0,0,canvas.width,canvas.height);signed=false;},
    image(){return signed?canvas.toDataURL('image/png'):'';}
  };
}

function promissoriaPrint(dialog, sheet, gid, status){
  const frame=document.createElement('iframe');
  frame.title='Impressão da promissória';
  frame.style.cssText='position:absolute;width:194mm;height:281mm;left:-10000px;border:0';
  frame.onload=async()=>{
    try{
      const doc=frame.contentDocument;
      await Promise.allSettled([...doc.images].map(img=>img.decode()));
      if(!dialog.open)return;
      const page=doc.querySelector('main'),content=page.firstElementChild;
      const scale=Math.min(1,(page.clientHeight-2)/content.offsetHeight);
      if(scale<0.7)throw Error('Este carregamento tem itens demais para um PDF legível em uma folha.');
      content.style.zoom=String(scale);
      frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }catch(error){status.textContent=error.message;frame.remove();}
  };
  frame.srcdoc=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Promissória ${esc(gid)}</title>
    <style>${promissoriaCss} @page{size:A4;margin:8mm}body{margin:0}main{height:280mm;width:194mm}</style>
    <main>${sheet.outerHTML}</main></html>`;
  dialog.querySelector('iframe')?.remove();
  dialog.append(frame);
}

async function promissoriaOpen(gid){
  if(!finOwnerV722()||document.querySelector('.promissoria-dialog'))return;
  const company=empresaV456;
  const dialog=document.createElement('dialog');
  dialog.className='promissoria-dialog';
  dialog.style.cssText='width:min(800px,94vw);max-height:90vh;overflow:auto;background:white;color:#16231b;padding:16px;border:1px solid #355845;border-radius:8px';
  dialog.setAttribute('aria-label','Gerar promissória');
  dialog.innerHTML=`<style>${promissoriaCss}
    .promissoria-dialog label{display:block;margin:8px 0}
    .promissoria-dialog canvas{display:block;width:min(100%,400px);background:white;border:1px solid #355845;touch-action:none}
    .promissoria-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
    </style><h3>Gerar promissória</h3>
    <form>
      <label>Usar valores de <select name="origem"><option value="original">Carregamento original</option><option value="copia">Cópia comercial</option></select></label>
      <label>Vencimento <input type="date" name="vencimento" required></label>
      <label>Local de emissão e pagamento <input name="local" type="text" maxlength="120" required></label>
      <label for="promissoria-canvas">Assinatura desenhada (opcional)</label>
      <canvas id="promissoria-canvas" width="800" height="200" aria-label="Área para assinatura desenhada"></canvas>
      <div class="promissoria-actions">
        <button class="btn btn-secondary" type="button" data-clear>Limpar assinatura</button>
        <button class="btn btn-primary" type="submit" disabled>Salvar PDF</button>
        <a class="btn btn-secondary" href="https://assinador.iti.br/" target="_blank" rel="noopener noreferrer">Abrir assinador Gov.br</a>
        <button class="btn btn-secondary" type="button" data-close>Fechar</button>
      </div>
      <p>Na impressão, escolha Salvar como PDF. Para assinar pelo Gov.br, selecione o PDF salvo e devolva o arquivo assinado.</p>
      <p role="status"></p>
    </form><div data-preview></div>`;
  document.body.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.showModal();
  const form=dialog.querySelector('form'),fields=form.elements,status=form.querySelector('[role="status"]');
  const preview=dialog.querySelector('[data-preview]'),submit=form.querySelector('[type="submit"]');
  const signature=promissoriaSignature(form.querySelector('canvas'));
  const empresa=lerEmpresaDocumentoV421();
  fields.local.value=[empresa.cidade,empresa.uf].filter(Boolean).join(' / ');
  let bundle,ready=false,shown='';
  const showSignature=()=>{
    const img=preview.querySelector('.promissoria-sign img');
    if(!img)return;
    const image=signature.image();
    img.hidden=!image;
    if(image)img.src=image;
    else img.removeAttribute('src');
  };
  const render=()=>{
    if(!ready||company!==empresaV456||!finOwnerV722())return;
    try{
      const commercial=fields.origem.value==='copia';
      const card=document.querySelector('[data-v399-grupo="'+CSS.escape(String(gid))+'"]');
      if(clientePendenteV407(gid)||financeiroPendenteV403(gid,fields.origem.value)||
        card?.querySelector('.v414-transporte-form[data-pendente="1"]')||
        (commercial&&card?.querySelector('.v400-copia-box[data-pendente="1"]')))throw Error('Salve as alterações do carregamento antes de continuar.');
      const snapshot=promissoriaSnapshot(gid,commercial,bundle);
      shown=JSON.stringify(snapshot);
      preview.innerHTML=promissoriaSheet(gid,snapshot,fields.vencimento.value,fields.local.value.trim());
      showSignature();
      submit.disabled=false;
      status.textContent='';
    }catch(error){
      preview.replaceChildren();
      submit.disabled=true;
      status.textContent=error.message;
    }
  };
  form.addEventListener('input',render);
  form.querySelector('canvas').addEventListener('lostpointercapture',showSignature);
  dialog.querySelector('[data-clear]').onclick=()=>{signature.clear();showSignature();};
  form.onsubmit=event=>{
    event.preventDefault();
    if(!ready||company!==empresaV456||!finOwnerV722())return;
    const before=shown;
    render();
    if(submit.disabled)return;
    if(before!==shown){status.textContent='Os dados mudaram. Confira o documento atualizado antes de salvar.';return;}
    if(!fields.local.value.trim()){status.textContent='Informe o local de emissão e pagamento.';return;}
    promissoriaPrint(dialog,preview.firstElementChild,gid,status);
  };
  status.textContent='Conferindo os pedidos incluídos…';
  try{
    const result=await orderDocEnsureV767(gid);
    if(!dialog.open||company!==empresaV456||!finOwnerV722())return;
    bundle=result?.bundle;
    ready=true;
    render();
  }catch(error){status.textContent=error.message;}
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-promissoria-load]');
  if(button)promissoriaOpen(button.dataset.promissoriaLoad);
});
