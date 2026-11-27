import {promissoriaCss,promissoriaSheet,promissoriaSignature,promissoriaPrint} from '../promissoria-document.mjs';

const [token,parte]=location.hash.slice(1).split('/');
const parcela=parte===undefined?undefined:Number(parte);
const main=document.querySelector('main'), preview=document.querySelector('#documento');
const form=main.querySelector('form'), status=main.querySelector('#status');
const confirm=form.querySelector('[type="submit"]'), save=main.querySelector('#salvar');
const signature=promissoriaSignature(form.querySelector('canvas'));
const style=document.createElement('style');
style.textContent=promissoriaCss;
document.head.append(style);
let saved;

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

function render(result){
  saved=result;
  const {numeroPedido,snapshot,vencimento,local,emissao}=result.document;
  preview.innerHTML=promissoriaSheet(numeroPedido,snapshot,vencimento,local,emissao,result.parcela?{...result.parcela,quantidade:result.document.parcelas.length}:null);
  if(result.signedAt){
    const image=preview.querySelector('.promissoria-sign img');
    image.src=result.signature;
    image.hidden=false;
    status.textContent='Assinatura recebida pela empresa. Salve uma cópia em PDF.';
  }else{
    status.textContent='';
  }
  form.hidden=!!result.signedAt;
  save.hidden=!result.signedAt;
}

form.querySelector('#limpar').onclick=()=>signature.clear();
form.onsubmit=async event=>{
  event.preventDefault();
  if(confirm.disabled||saved?.signedAt)return;
  const image=signature.image();
  if(!image){status.textContent='Desenhe sua assinatura antes de confirmar.';return;}
  confirm.disabled=true;
  status.textContent='Enviando assinatura…';
  try{render(await request('sign',{accepted:true,signature:image}));}
  catch(error){status.textContent=error.message+' Você pode tentar novamente.';}
  finally{confirm.disabled=false;}
};
save.onclick=()=>{
  if(saved?.signedAt)promissoriaPrint(main,preview.firstElementChild,saved.document.numeroPedido,status);
};

try{
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error('Link inválido. Peça o link de assinatura à empresa.');
  render(await request('view'));
}catch(error){status.textContent=error.message;}
