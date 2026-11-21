// Same recipient link, now a read-only signed receipt. Nothing is sent automatically.
function receiptShareDialogV765(link){
 const url=new URL(link,location.origin);if(url.origin!==location.origin||url.pathname!=='/'||!/^[A-Za-z0-9_-]{40,60}$/.test(url.searchParams.get('assinar')||''))throw Error('Link de comprovante inválido.');
 document.getElementById('receipt-share-v765')?.remove();
 const modal=document.createElement('dialog');modal.id='receipt-share-v765';modal.style.cssText='max-width:430px;width:calc(100% - 36px);box-sizing:border-box;background:#172b20;color:#f0f7f2;border:1px solid #598568;border-radius:14px;padding:20px';
 const add=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;modal.append(el);return el;};add('h2','Compartilhar comprovante');add('p','O cliente abre o pedido com a assinatura pelo link. Não precisa baixar um PDF.');
 const status=add('p',''),share=add('button',navigator.share?'Compartilhar':'Abrir comprovante'),copy=add('button','Copiar link'),close=add('button','Fechar');
 for(const button of [share,copy,close]){button.type='button';button.style.cssText='margin:6px 6px 0 0;padding:10px 14px;border:0;border-radius:8px;font:inherit;cursor:pointer';}share.style.background='#e5b644';
 share.onclick=async()=>{if(!navigator.share){window.open(url.href,'_blank','noopener,noreferrer');return;}try{await navigator.share({title:'Comprovante de entrega',text:'Confira o pedido e a confirmação de recebimento.',url:url.href});}catch(e){if(e.name!=='AbortError')status.textContent='O navegador não abriu o compartilhamento. Use Copiar link e cole na conversa.';}};
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(url.href);status.textContent='Link copiado. Cole na conversa com o cliente.';}catch{let field=modal.querySelector('textarea');if(!field){field=document.createElement('textarea');field.readOnly=true;field.value=url.href;field.style.cssText='width:100%;box-sizing:border-box;margin-top:12px';modal.append(field);}field.focus();field.select();status.textContent='Copie o link selecionado e cole na conversa.';}};
 close.onclick=()=>modal.remove();modal.addEventListener('close',()=>modal.remove());document.body.append(modal);if(modal.showModal)modal.showModal();else modal.setAttribute('open','');share.focus();
}
window.__v456ReceiptLinkV765=async orderId=>{
 const user=auth?.currentUser,company=context?.empresaId;if(!user||!company)throw Error('Entre novamente para consultar o comprovante.');
 const response=await fetch('/.netlify/functions/assinatura-entrega',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+await user.getIdToken()},body:JSON.stringify({action:'receipt-link',orderId:String(orderId)}),signal:AbortSignal.timeout(20000),cache:'no-store'}),data=await response.json();
 if(auth?.currentUser?.uid!==user.uid||context?.empresaId!==company||data.empresaId&&data.empresaId!==company)throw Error('A sessão mudou. Abra o pedido novamente.');
 if(!response.ok)throw Error(data.error||'Não foi possível consultar o comprovante.');receiptShareDialogV765(data.link);
};
function receiptPublicV765(data){
 const receipt=data.receipt;if(!receipt)return;
 document.getElementById('receipt-public-v765')?.remove();const host=document.createElement('section');host.id='receipt-public-v765';
 const add=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;host.append(el);return el;};
 add('h3','Recebimento confirmado');add('p','Recebido por '+receipt.recipientName);add('p','Assinado em '+new Date(receipt.signedAt).toLocaleString('pt-BR'));
 if(typeof receipt.signatureImage==='string'&&receipt.signatureImage.length<=250000&&/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(receipt.signatureImage)){const img=document.createElement('img');img.src=receipt.signatureImage;img.alt='Assinatura do recebedor';img.style.cssText='display:block;max-width:100%;width:360px;height:auto;background:white;border:1px solid #bbb';host.append(img);}
 if(!receipt.preservedAtSignature)add('p','Pedido antigo: os itens e valores exibidos são os do registro atual.');
 const button=add('button','Compartilhar comprovante');button.type='button';button.onclick=()=>receiptShareDialogV765(location.origin+'/?assinar='+encodeURIComponent(assinaturaTokenV683));
 document.getElementById('assinatura-resumo-conteudo').append(host);document.getElementById('assinatura-resumo-status').textContent='Pedido assinado. Você pode compartilhar este comprovante.';
 const title=document.getElementById('assinatura-publica-v683').querySelector('h1,h2');if(title)title.textContent='Comprovante de entrega';
}
