document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-delivery-receipt-v765]');if(!button)return;event.preventDefault();
 if(!parent.__smEmployeeCan('orders')||button.disabled)return;
 const original=button.textContent;button.disabled=true;button.textContent='Buscando comprovante…';
 try{if(!navigator.onLine)throw Error('Conecte-se para compartilhar o comprovante.');await parent.__v456ReceiptLinkV765(button.dataset.deliveryReceiptV765);}catch(e){alert(e.message||'Não foi possível abrir o comprovante.');}finally{button.disabled=false;button.textContent=original;}
});
// V816: the current budget/order/history title belongs beside the Home button.
function mountOrderPanelHeadingV816(){
 const section=document.getElementById('orcamento'),nav=document.querySelector('header .tabs');
 if(!section||!nav||typeof window.matchMedia!=='function'||document.getElementById('orderPanelTitleV816'))return;
 const panels=[['orcEntregasPainel','Histórico de entregas'],['orcGuardadosPainel','Pedidos'],['orcAtualPainel','Orçamento']].map(([id,label])=>({panel:document.getElementById(id),label}));
 for(const id of ['orcAtualPainel','orcEntregasPainel'])document.getElementById(id)?.querySelector('.card>h2')?.classList.add('order-original-heading-v816');
 const title=document.createElement('h2');title.id='orderPanelTitleV816';title.hidden=true;nav.appendChild(title);
 const media=window.matchMedia('(max-width:760px)');
 const update=()=>{
  const current=panels.find(({panel})=>panel&&!panel.hidden&&panel.style.display!=='none');
  const show=media.matches&&section.classList.contains('active')&&!!current;
  if(show&&title.textContent!==current.label)title.textContent=current.label;
  title.hidden=!show;
  if(document.body.classList.contains('order-title-fixed-v816')!==show)document.body.classList.toggle('order-title-fixed-v816',show);
 };
 const observer=new MutationObserver(update);observer.observe(section,{attributes:true,attributeFilter:['class']});for(const {panel}of panels)if(panel)observer.observe(panel,{attributes:true,attributeFilter:['style','hidden']});
 media.addEventListener?.('change',update);update();
}
setTimeout(mountOrderPanelHeadingV816,0);
