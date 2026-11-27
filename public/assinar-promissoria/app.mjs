import {promissoriaCss,promissoriaSheet,promissoriaSignature,promissoriaPrint} from '../promissoria-document.mjs';

const [token,parte]=location.hash.slice(1).split('/');
const parcela=parte===undefined?undefined:Number(parte);
const main=document.querySelector('main'), preview=document.querySelector('#documento');
const dialog=main.querySelector('.signature-dialog'), open=main.querySelector('#abrir-assinatura');
const form=dialog.querySelector('form'), status=main.querySelector('#status');
const signatureStatus=dialog.querySelector('#status-assinatura'), close=dialog.querySelector('#fechar-assinatura');
const confirm=form.querySelector('[type="submit"]'), save=main.querySelector('#salvar');
const signature=promissoriaSignature(form.querySelector('canvas'));
const style=document.createElement('style');
style.textContent=promissoriaCss;
document.head.append(style);
let saved,paymentRequest;

async function request(action,additional={}){
  const response=await fetch('/.netlify/functions/assinatura-promissoria',{
    method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
    signal:AbortSignal.timeout(20000),
    body:JSON.stringify({action,token,parcela,...additional})
  });
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Não foi possível acessar a promissória.');
  return result;
}

function renderDocument(){
  const result=saved;
  const {numeroPedido,snapshot,vencimento,local,emissao}=result.document;
  preview.innerHTML=promissoriaSheet(numeroPedido,snapshot,vencimento,local,emissao,result.parcela?{...result.parcela,quantidade:result.document.parcelas.length}:null,result.payment);
  if(result.signedAt){
    const image=preview.querySelector('.promissoria-sign img');
    image.src=result.signature;
    image.hidden=false;
  }
}

function render(result){
  saved=result;
  renderDocument();
  if(result.signedAt){
    status.textContent='Assinatura recebida pela empresa. Salve uma cópia em PDF.';
  }else{
    status.textContent='';
  }
  open.hidden=!!result.signedAt;
  save.hidden=!result.signedAt;
}

function refreshPayment(){
  if(!paymentRequest){
    paymentRequest=request('payment-status').then(({payment})=>{
      if(saved.payment?.date===payment?.date)return;
      saved={...saved,payment};
      renderDocument();
    }).finally(()=>{paymentRequest=null;});
  }
  return paymentRequest;
}

function refreshVisiblePayment(){
  if(!document.hidden&&saved)refreshPayment().catch(()=>{});
}

open.onclick=()=>{signatureStatus.textContent='';dialog.showModal();};
close.onclick=()=>dialog.close();
dialog.addEventListener('cancel',event=>{if(confirm.disabled)event.preventDefault();});
form.querySelector('#limpar').onclick=()=>{signature.clear();signatureStatus.textContent='';};
form.onsubmit=async event=>{
  event.preventDefault();
  if(confirm.disabled||saved?.signedAt)return;
  const image=signature.image();
  if(!image){signatureStatus.textContent='Desenhe sua assinatura antes de confirmar.';return;}
  confirm.disabled=close.disabled=true;
  signatureStatus.textContent='Enviando assinatura…';
  try{
    const result=await request('sign',{accepted:true,signature:image});
    dialog.close();
    render({...result,payment:saved.payment});
    refreshVisiblePayment();
  }
  catch(error){signatureStatus.textContent=error.message+' Você pode tentar novamente.';}
  finally{confirm.disabled=close.disabled=false;}
};
save.onclick=async()=>{
  if(!saved?.signedAt||save.disabled)return;
  save.disabled=true;
  try{
    await refreshPayment();
    promissoriaPrint(main,preview.firstElementChild,saved.document.numeroPedido,status);
  }catch(error){status.textContent=error.message;}
  finally{save.disabled=false;}
};

try{
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error('Link inválido. Peça o link de assinatura à empresa.');
  render(await request('view'));
  setInterval(refreshVisiblePayment,15000);
  document.addEventListener('visibilitychange',refreshVisiblePayment);
}catch(error){status.textContent=error.message;}
