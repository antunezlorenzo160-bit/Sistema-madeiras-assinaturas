const escapePromissoria=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const vencimentoDaPromissoria=value=>escapePromissoria(value.split('-').reverse().join('/'));
const valorPromissoria=cents=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export const promissoriaCss = `
.promissoria-sheet{position:relative;box-sizing:border-box;color:#16231b;background:white;border:1px solid #355845;padding:3mm;font:10pt/1.25 Arial,sans-serif;overflow-wrap:anywhere}
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
.promissoria-paid{position:absolute;z-index:1;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-13deg);width:max-content;max-width:70%;box-sizing:border-box;padding:2mm 6mm;border:4px double currentColor;border-radius:2mm;color:#92332b;background:rgba(255,255,255,.82);text-align:center;line-height:1.15;pointer-events:none}
.promissoria-paid strong,.promissoria-paid span{display:block}
.promissoria-paid strong{font-size:clamp(30px,8vw,56px);font-weight:900;letter-spacing:.09em}
.promissoria-paid span{font-size:11px;font-weight:700;overflow-wrap:anywhere}
.promissoria-paid time{font-size:11px}
.promissoria-sign{text-align:center;padding:2mm 0}.promissoria-sign img{display:block;margin:auto;width:85mm;max-width:100%;height:17mm;object-fit:contain}
.promissoria-sign span{display:block;border-top:1px solid;margin:auto;width: min(85mm,95%);padding-top:1mm;font-weight:bold}
.promissoria-sign img[hidden]{display:none}
.promissoria-sign:has(img[hidden]){padding-top:19mm}
@media print{.promissoria-sheet{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
`;

export function promissoriaSheet(numeroPedido, snapshot, vencimento, local, emissao, parcela=null, pagamento=null){
  const {cliente,empresa,produtos,calc,totalPedidos,total,transporte}=snapshot;
  const data=parcela?vencimentoDaPromissoria(parcela.vencimento):vencimento?escapePromissoria(vencimento.split('-').reverse().join('/')):'—';
  const logo=typeof empresa.logoDataUrl==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(empresa.logoDataUrl)?empresa.logoDataUrl:'';
  const cabecalho=[empresa.cnpj&&'CNPJ '+empresa.cnpj,[empresa.logradouro,empresa.numero,empresa.bairro].filter(Boolean).join(' · '),[empresa.cidade,empresa.uf].filter(Boolean).join(' / '),[empresa.telefone,empresa.email,empresa.site].filter(Boolean).join(' · ')].filter(Boolean);

  const valor=valorPromissoria(total);
  const valorNota=parcela?valorPromissoria(parcela.centavos):valor;
  const endereco=[cliente.logradouro,cliente.numero,cliente.complemento,cliente.bairro,cliente.cep].filter(Boolean).join(' · ');
  const rowsProdutos=produtos.map(({titulo,volume,centavos})=>
    `<tr><td>${escapePromissoria(titulo)}</td><td class="promissoria-money">${volume>0?volume.toLocaleString('pt-BR',{minimumFractionDigits:4,maximumFractionDigits:4})+' m³':'—'}</td><td class="promissoria-money">${valorPromissoria(centavos)}</td></tr>`
  ).join('');
  const resumo=[
    ['Subtotal do carregamento',Math.round(calc.subtotal*100)],
    ['Desconto',-Math.round(calc.desconto*100)],
    ['Frete',Math.round(calc.frete*100)],
    ['Outras despesas',Math.round(calc.outras*100)],
    ['Pedidos incluídos',totalPedidos]
  ];
  const rows=resumo.filter(([,amount],index)=>index===0||amount!==0).map(([label,amount])=>
    `<tr><td colspan="2">${label}</td><td class="promissoria-money">${valorPromissoria(amount)}</td></tr>`
  ).join('');
  return `<article class="promissoria-sheet">
    <div class="promissoria-company"><div class="v421-empresa-cab">
      ${logo?`<img src="${logo}" alt="Logomarca">`:''}<div><div class="v421-empresa-nome">${escapePromissoria(empresa.nome)}</div>
      ${cabecalho.map(line=>`<div>${escapePromissoria(line)}</div>`).join('')}</div>
    </div></div>
    <h2>PEDIDO <small>nº ${escapePromissoria(numeroPedido)}</small></h2>
    <table><tbody>
      <tr><td><b>Cliente</b> ${escapePromissoria(cliente.nome)}</td><td><b>Telefone</b> ${escapePromissoria(cliente.telefone||'—')}</td></tr>
      <tr><td colspan="2"><b>Endereço</b> ${escapePromissoria(endereco||'—')}</td></tr>
      <tr><td><b>Cidade / UF</b> ${escapePromissoria([cliente.cidade,cliente.uf].filter(Boolean).join(' / ')||'—')}</td><td><b>Pagamento</b> Nota promissória</td></tr>
      <tr><td colspan="2"><b>Transporte</b> ${escapePromissoria(transporte||'—')}</td></tr>
    </tbody></table>
    <table><thead><tr><th>PRODUTO</th><th>VOLUME</th><th>VALOR</th></tr></thead>
    <tbody>${rowsProdutos}</tbody><tfoot>${rows}</tfoot></table>
    <div class="promissoria-total">TOTAL DO PEDIDO: ${valor}</div>
    <hr class="promissoria-cut">
    <section class="promissoria-note"><div class="promissoria-band promissoria-side">REPÚBLICA FEDERATIVA DO BRASIL</div><div>
      <h3>NOTA PROMISSÓRIA${parcela?` · PARCELA ${parcela.numero}/${parcela.quantidade}`: ''}</h3>
      <table><tbody>
        <tr><td><b>Número</b> ${escapePromissoria(numeroPedido)}</td><td><b>Vencimento</b> ${data}</td><td><b>Valor</b> ${valorNota}</td></tr>
        <tr><td colspan="3"><b>Empresa</b> ${escapePromissoria(empresa.nome)}${empresa.cnpj?' · CNPJ '+escapePromissoria(empresa.cnpj):''}</td></tr>
        <tr><td colspan="3"><b>Cliente</b> ${escapePromissoria(cliente.nome)}</td></tr>
        <tr><td colspan="3"><b>CPF / CNPJ</b> ${escapePromissoria(cliente.documento||'—')}</td></tr>
        <tr><td colspan="3"><b>Local e data de emissão</b> ${escapePromissoria(local||'—')} · ${escapePromissoria(emissao)}</td></tr>
        <tr><td colspan="3">Pagarei por esta nota promissória, no vencimento indicado, a ${escapePromissoria(empresa.nome)} ou à sua ordem, a quantia de ${valorNota}, em moeda corrente nacional. Local de pagamento: ${escapePromissoria(local||'—')}.</td></tr>
      </tbody></table>
      <div class="promissoria-sign"><img alt="Assinatura desenhada pelo cliente" hidden><span>Assinatura do cliente</span></div>
    </div></section>
    ${pagamento&&!pagamento.voided?`<div class="promissoria-paid">
      <strong>PAGO</strong><span>${escapePromissoria(empresa.nome)}</span>
      <time datetime="${escapePromissoria(pagamento.date)}">${vencimentoDaPromissoria(pagamento.date)}</time>
    </div>`:''}
  </article>`;
}

export function promissoriaSignature(canvas){
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

export function promissoriaPrint(dialog, sheet, numeroPedido, status){
  const frame=document.createElement('iframe');
  frame.title='Impressão da promissória';
  frame.style.cssText='position:absolute;width:194mm;height:281mm;left:-10000px;border:0';
  frame.onload=async()=>{
    try{
      const doc=frame.contentDocument;
      await Promise.allSettled([...doc.images].map(img=>img.decode()));
      if(!dialog.isConnected){frame.remove();return;}
      const page=doc.querySelector('main'),content=page.firstElementChild;
      const scale=Math.min(1,(page.clientHeight-2)/content.offsetHeight);
      if(scale<0.7)throw Error('Este carregamento tem itens demais para um PDF legível em uma folha.');
      content.style.zoom=String(scale);
      frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }catch(error){status.textContent=error.message;frame.remove();}
  };
  const parcela=sheet.querySelector('.promissoria-note h3')?.textContent.split(' · ')[1];
  frame.srcdoc=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Promissória ${escapePromissoria(numeroPedido)}${parcela?` - ${escapePromissoria(parcela)}`: ''}</title>
    <style>${promissoriaCss} @page{size:A4;margin:8mm}body{margin:0}main{position:relative;height:280mm;width:194mm}@media print{.promissoria-sheet{position:static}}</style>
    <main>${sheet.outerHTML}</main></html>`;
  dialog.querySelector('iframe')?.remove();
  dialog.append(frame);
}
