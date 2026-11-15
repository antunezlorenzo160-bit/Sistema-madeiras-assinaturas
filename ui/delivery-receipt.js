document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-delivery-receipt-v765]');if(!button)return;event.preventDefault();
 if(!parent.__smEmployeeCan('orders')||button.disabled)return;
 const original=button.textContent;button.disabled=true;button.textContent='Buscando comprovante…';
 try{if(!navigator.onLine)throw Error('Conecte-se para compartilhar o comprovante.');await parent.__v456ReceiptLinkV765(button.dataset.deliveryReceiptV765);}catch(e){alert(e.message||'Não foi possível abrir o comprovante.');}finally{button.disabled=false;button.textContent=original;}
});
