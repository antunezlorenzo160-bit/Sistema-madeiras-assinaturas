import {readPromissoriaPayment,confirmPromissoriaPayment} from './lib/sale-receipts.mjs';
import {calcularParcelasPromissoria} from '../../public/promissoria-parcelas.mjs';
import {createHash,createHmac} from 'node:crypto';
import {authenticate,failure,json,PlatformError,serverDb} from './lib/platform-auth.mjs';
import {financeOwnerContext} from './lib/finance-access.mjs';
import {FINANCE_PREVIEW} from './lib/finance-context.mjs';
import {validateSignatureImage} from './assinatura-imagem.mjs';

const collection='promissoriasAssinaturaPrevia';
const validToken=/^[A-Za-z0-9_-]{43}$/;
const days=30*24*60*60*1000;

function invitationToken(empresaId,loadId){
  const secret=process.env.DELIVERY_SIGNATURE_SECRET;
  if(!secret||secret.length<32)throw new PlatformError(503,'O servidor da prévia ainda precisa da configuração de assinatura.');
  return createHmac('sha256',secret).update(JSON.stringify([collection,empresaId,loadId])).digest('base64url');
}

function invitationRef(db,token){
  return db.doc(collection+'/'+createHash('sha256').update(token).digest('hex'));
}

function validDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T00:00:00Z');
  return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value;
}

function documentFrom(input){
  const {numeroPedido,vencimento,local,snapshot}=input;
  const invalid=()=>{throw new PlatformError(400,'Confira os dados e o vencimento da promissória.');};
  if(typeof numeroPedido!=='string'||!/^\d{5}$/.test(numeroPedido)||!validDate(vencimento)||typeof local!=='string'||!local.trim()||local.length>120)invalid();
  const text=(value,max=250)=>typeof value==='string'?value.slice(0,max):'';
  const fields=(source,keys)=>Object.fromEntries(keys.map(key=>[key,text(source?.[key])]));
  const cliente=fields(snapshot?.cliente,['nome','telefone','documento','logradouro','numero','complemento','bairro','cep','cidade','uf']);
  const empresa=fields(snapshot?.empresa,['nome','cnpj','logradouro','numero','bairro','cidade','uf','telefone','email','site']);
  empresa.logoDataUrl=text(snapshot?.empresa?.logoDataUrl,400000);
  const calc=Object.fromEntries(['subtotal','desconto','frete','outras'].map(key=>[key,snapshot?.calc?.[key]]));
  const total=snapshot?.total,totalPedidos=snapshot?.totalPedidos;
  if(!cliente.nome||!empresa.nome||!Number.isSafeInteger(total)||total<=0||
    !Number.isSafeInteger(totalPedidos)||totalPedidos<0||Object.values(calc).some(value=>!Number.isFinite(value)||value<0||value>1e12)||
    total!==Math.round((calc.subtotal-calc.desconto+calc.frete+calc.outras)*100)+totalPedidos||
    !Array.isArray(snapshot?.produtos)||snapshot.produtos.length>300)invalid();
  const produtos=snapshot.produtos.map(product=>{
    const titulo=text(product?.titulo),volume=product?.volume,centavos=product?.centavos;
    if(!titulo||!(volume===null||Number.isFinite(volume)&&volume>=0)||!Number.isSafeInteger(centavos))invalid();
    return {titulo,volume,centavos};
  });
  const emissao=new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});
  let parcelas;
  if(input.parcelas!==undefined){
    if(!Array.isArray(input.parcelas)||input.parcelas.some(row=>!validDate(row?.vencimento)))invalid();
    let centavos;
    try{centavos=calcularParcelasPromissoria(input.parcelas.map(row=>row.percentual),total);}
    catch(error){throw new PlatformError(400,error.message);}
    parcelas=input.parcelas.map((row,index)=>({numero:index+1,percentual:Number(String(row.percentual).replace(',','.')),vencimento:row.vencimento,centavos:centavos[index]}));
  }
  return {numeroPedido,vencimento,local:local.trim(),emissao,...(parcelas?{parcelas}:{}),snapshot:{cliente,empresa,calc,total,totalPedidos,produtos,transporte:text(snapshot.transporte)}};
}

function parcelaSelecionada(record,numero){
  const parcelas=record.document.parcelas;
  if(!parcelas){
    if(numero!==undefined)throw new PlatformError(404,'Parcela não encontrada.');
    return null;
  }
  const index=numero??1;
  if(!Number.isInteger(index)||index<1||index>parcelas.length)throw new PlatformError(404,'Parcela não encontrada.');
  return parcelas[index-1];
}

function recordView(record,parcela=null,assinatura=record){
  return {document:record.document,parcela,signature:assinatura?.signature??null,signedAt:assinatura?.signedAt??null,expiresAt:record.expiresAt};
}

async function readParcela(db,ref,record,numero,read){
  const parcela=parcelaSelecionada(record,numero);
  if(!parcela)return recordView(record);
  const signed=await read(db.doc(ref.path+'/parcelas/'+parcela.numero));
  return recordView(record,parcela,signed.data());
}

export default async function handler(req){
  if(!FINANCE_PREVIEW)return json(404,{error:'Recurso disponível na prévia.'});
  if(req.method!=='POST')return json(405,{error:'Método não permitido.'});
  try{
    const raw=await req.text();
    if(raw.length>650000)throw new PlatformError(413,'Arquivo grande demais para enviar.');
    let input;
    try{input=JSON.parse(raw);}catch{throw new PlatformError(400,'Pedido inválido.');}
    if(!input||typeof input!=='object')throw new PlatformError(400,'Pedido inválido.');
    const now=Date.now();
    if(['owner-read','create','confirm-payment'].includes(input.action)){
      if(typeof input.loadId!=='string'||!/^[-\w]{1,180}$/.test(input.loadId))throw new PlatformError(400,'Carregamento inválido.');
      const identity=await authenticate(req,false,{requireMembership:false});
      const {db}=identity;
      if(input.action==='confirm-payment'){
        if(input.acknowledged!==true)throw new PlatformError(400,'Confirme que o valor foi recebido e ainda não foi lançado no caixa.');
        const {empresaId}=await financeOwnerContext(db,identity,undefined,true,now);
        const saved=await invitationRef(db,invitationToken(empresaId,input.loadId)).get();
        if(!saved.exists)throw new PlatformError(404,'Promissória não encontrada.');
        const record=saved.data();
        if(record.document.parcelas&&input.parcela===undefined)throw new PlatformError(400,'Selecione a parcela recebida.');
        const parcela=parcelaSelecionada(record,input.parcela);
        const payment=await confirmPromissoriaPayment(db,identity,{
          empresaId,loadId:input.loadId,numero:parcela?.numero??0,amountCents:parcela?.centavos??record.document.snapshot.total,
          date:input.date,dueDate:record.document.parcelas?.reduce((last,row)=>row.vencimento>last?row.vencimento:last,record.document.vencimento)??record.document.vencimento
        },now);
        return json(200,{empresaId,payment});
      }
      const result=await db.runTransaction(async tx=>{
        const {empresaId}=await financeOwnerContext(db,identity,ref=>tx.get(ref),input.action==='create',now);
        const token=invitationToken(empresaId,input.loadId),ref=invitationRef(db,token);
        const saved=await tx.get(ref);
        if(saved.exists){
          const record=saved.data();
          const view=await readParcela(db,ref,record,input.parcela,child=>tx.get(child));
          const payment=await readPromissoriaPayment(db,empresaId,input.loadId,view.parcela?.numero??0,child=>tx.get(child));
          if(input.action==='create'&&record.expiresAt<=now){
            record.expiresAt=now+days;
            tx.update(ref,{expiresAt:record.expiresAt});
          }
          return {...view,expiresAt:record.expiresAt,token,empresaId,payment};
        }
        if(input.action==='owner-read')return {document:null,empresaId};
        const document=documentFrom(input);
        const record={empresaId,loadId:input.loadId,document,createdAt:now,createdBy:identity.uid,expiresAt:now+days};
        const parcela=parcelaSelecionada(record,input.parcela);
        tx.create(ref,record);
        return {...recordView(record,parcela,null),token,empresaId};
      });
      return json(200,result);
    }
    if(!['view','sign','payment-status'].includes(input.action)||typeof input.token!=='string'||!validToken.test(input.token))throw new PlatformError(404,'Link inválido.');
    const db=serverDb(),ref=invitationRef(db,input.token);
    const read=saved=>{
      if(!saved.exists||saved.data().expiresAt<=now)throw new PlatformError(404,'Link inválido ou expirado. Peça à empresa para renovar o link.');
      return saved.data();
    };
    if(input.action!=='sign'){
      const record=read(await ref.get());
      const parcela=parcelaSelecionada(record,input.parcela);
      const receipt=await readPromissoriaPayment(db,record.empresaId,record.loadId,parcela?.numero??0);
      const payment=receipt&&!receipt.voided?{date:receipt.date}:null;
      if(input.action==='payment-status')return json(200,{payment});
      return json(200,{...await readParcela(db,ref,record,input.parcela,child=>child.get()),payment});
    }
    if(input.accepted!==true)throw new PlatformError(400,'Confirme que você leu e concorda com o documento.');
    try{validateSignatureImage(input.signature);}catch(error){throw new PlatformError(400,error.message);}
    const result=await db.runTransaction(async tx=>{
      const record=read(await tx.get(ref));
      const parcela=parcelaSelecionada(record,input.parcela);
      const signed={signature:input.signature,signedAt:now};
      if(parcela){
        const child=db.doc(ref.path+'/parcelas/'+parcela.numero), existing=await tx.get(child);
        if(existing.exists)return recordView(record,parcela,existing.data());
        tx.create(child,signed);
        return recordView(record,parcela,signed);
      }
      if(record.signedAt)return recordView(record);
      tx.update(ref,signed);
      return recordView({...record,...signed});
    });
    return json(200,result);
  }catch(error){return failure(error);}
}
