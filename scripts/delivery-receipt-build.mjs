export function applyDeliveryReceiptOuterV765(html,root){
 const replace=(a,b)=>{if(!html.includes(a)||html.indexOf(a)!==html.lastIndexOf(a))throw Error('Trecho da assinatura mudou: '+a.slice(0,90));html=html.replace(a,()=>b);};
 replace('window.__v456CreateDeliverySignature=async orderId=>{',root+'\nwindow.__v456CreateDeliverySignature=async orderId=>{');
 replace('let pedidoAssinaturaCarregado=false;','let pedidoAssinaturaCarregado=false,assinaturaResumoHashV765;');
 replace("  const p=data.pedido,n=v=>", "  assinaturaResumoHashV765=data.previewHash;\n  const p=data.pedido,n=v=>");
 replace("  if(p.cliente)linha(conteudo,'p','Cliente: '+p.cliente);", "  if(p.empresa?.nome)linha(conteudo,'h3',p.empresa.nome);if(p.empresa?.cnpj)linha(conteudo,'p','CNPJ: '+p.empresa.cnpj);\n  if(p.cliente)linha(conteudo,'p','Cliente: '+p.cliente);");
 replace("tipo==='linear'?n(x.comprimento)+' m'", "tipo==='linear'?(x.linearTotalV744?'Metragem total':n(x.comprimento)+' m')");
 replace("(tipo==='granel'?'':n(x.quantidade)+' pç · ')", "(tipo==='granel'||x.linearTotalV744?'':n(x.quantidade)+' pç · ')");
 replace("document.getElementById('assinatura-concluida').textContent='Este pedido já foi confirmado.';}","document.getElementById('assinatura-concluida').textContent='Recebimento confirmado.';receiptPublicV765(data);}");
 replace("signatureImage:canvasAssinatura.toDataURL('image/png')", "signatureImage:canvasAssinatura.toDataURL('image/png'),previewHash:assinaturaResumoHashV765");
 replace("textContent=data.alreadySigned?'Este pedido já foi confirmado.':'Recebimento confirmado. Obrigado!';", "textContent='Recebimento confirmado. Obrigado!';await carregarPedidoAssinatura();");
 replace("}catch(e){st.textContent=String(e?.message||e);b.disabled=false;", "}catch(e){document.getElementById('assinatura-resumo-repetir').hidden=false;document.getElementById('assinatura-resumo-repetir').textContent='Recarregar pedido';st.textContent=String(e?.message||e);b.disabled=false;");
 return html;
}
