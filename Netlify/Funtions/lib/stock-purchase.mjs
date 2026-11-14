import {purchaseSettlementV757} from '../../../public/purchase-payments.mjs';
import {paymentNotFutureV757} from './purchase-payments.mjs';
import {createHash} from 'node:crypto';
import {financeCollectionPath,financeOwnerContext} from './finance-access.mjs';
import {FINANCE_PREVIEW} from './finance-context.mjs';
import {PlatformError} from './platform.mjs';
import {normalizeStockPurchase,stockCostKey} from '../../../public/stock-purchase.mjs';
export const purchaseRecordsPath=id=>financeCollectionPath(id)+'ComprasEstoque';
export function purchaseRecordId(...parts){const chars=createHash('sha256').update(JSON.stringify(['stock-purchase',...parts])).digest('hex').slice(0,32).split('');chars[12]='4';chars[16]='8';const id=chars.join('');return id.slice(0,8)+'-'+id.slice(8,12)+'-'+id.slice(12,16)+'-'+id.slice(16,20)+'-'+id.slice(20);}
const hash=input=>createHash('sha256').update(JSON.stringify(input)).digest('hex');
export async function confirmStockPurchase(db,identity,input,now=Date.now()){
 let config;try{config=normalizeStockPurchase(input);}catch(e){throw new PlatformError(400,e.message);}
 paymentNotFutureV757(config.payment,now);
 const initial=await financeOwnerContext(db,identity,undefined,true,now),signature=hash(config);
 if(config.companyId!==initial.empresaId)throw new PlatformError(403,'A empresa da tela mudou. Reabra o sistema antes de confirmar esta compra.');
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'O vínculo mudou. Entre novamente.');
  const receiptRef=db.doc(purchaseRecordsPath(context.empresaId)+'/'+config.id),savedSnap=await tx.get(receiptRef),saved=savedSnap.exists?savedSnap.data():null;
  if(saved){if(saved.signature!==signature)throw new PlatformError(409,'Este descarregamento já foi confirmado com outros valores. Confira o financeiro antes de lançar novamente.');return {empresaId:context.empresaId,preview:FINANCE_PREVIEW,receipt:saved,repeated:true};}
  const entryId=purchaseRecordId(config.id,'entry'),entryRef=db.doc(financeCollectionPath(context.empresaId)+'/'+entryId),entrySnap=await tx.get(entryRef);if(entrySnap.exists)throw new PlatformError(409,'Registro financeiro já existente. Confira o descarregamento.');
  const catalogs=new Map(await Promise.all([...new Set(config.lines.map(i=>i.madeiraId))].map(async id=>{const snap=await tx.get(db.doc(`empresas/${context.empresaId}/dados/sm2_madeiras/registros/${id}`));if(!snap.exists)throw new PlatformError(400,'Madeira não encontrada no cadastro desta empresa.');return [id,snap.data()];})));
  const rows=await Promise.all(config.lines.map(async line=>{
   const stockId=purchaseRecordId(config.id,line.id,'stock'),movementId=purchaseRecordId(config.id,line.id,'movement'),stockRef=db.doc(`empresas/${context.empresaId}/dados/sm2_${config.stock}/registros/${stockId}`),movementRef=db.doc(`empresas/${context.empresaId}/dados/sm2_movimentos/registros/${movementId}`);
   const [stockSnap,movementSnap]=await Promise.all([tx.get(stockRef),tx.get(movementRef)]);if(stockSnap.exists||movementSnap.exists)throw new PlatformError(409,'Um item desta compra já existe. Confira o descarregamento.');
   const wood=catalogs.get(line.madeiraId),kind=wood.tipoCadastro||'m3';if(kind!==line.tipoMedida)throw new PlatformError(400,'A unidade mudou no cadastro. Confira o item da compra.');
   let linearRule=null;
   if(line.tipoMedida==='linear'){
    linearRule=(wood.regrasLinear||[]).find(r=>String(r.tipo||'').trim()===line.produto&&(!line.codigoProduto||String(r.codigo||'')===line.codigoProduto));
    if(!linearRule)throw new PlatformError(400,'O tipo de produto linear mudou no cadastro. Confira a compra.');
   }
   const physical={madeiraId:line.madeiraId,madeira:String(wood.nome||wood.especie||'Madeira').slice(0,180),especie:String(wood.especie||wood.nome||'').slice(0,180),produto:String(linearRule?.tipo||wood.produto||'').slice(0,120),qualidade:String(wood.qualidade||'').slice(0,120),tipoMedida:line.tipoMedida,largura:line.largura,espessura:line.espessura,comprimento:line.comprimento,quantidade:line.quantidade,volume:line.volume,estadoMadeira:line.estadoMadeira,...(linearRule?{codigoProduto:String(linearRule.codigo||''),volumeReal:line.volume,...(line.linearTotalV744===true?{linearTotalV744:true}:{})}:{}),...(line.purchasePacketsV755?{contadoComoPacote:true,purchasePacketsV755:line.purchasePacketsV755,purchasePiecesPerPacketV755:line.purchasePiecesPerPacketV755}:{})};
   const stock={...physical,id:stockId,destino:config.stock,fornecedorOrigem:config.supplier,preco:0,valor:0,purchaseReceiptV728:config.id,atualizadoEm:now,...(line.estadoMadeira==='verde'?{dataEntradaVerde:now,secagemDias:line.secagemDias,secagemPrevista:now+line.secagemDias*86400000}:{})};
   const data=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'medium'}).format(new Date(now));
   const movement={...physical,id:movementId,tipoCadastro:line.tipoMedida,tipo:'entrada',costRecordedAtV728:now,origem:config.stock==='estoque2'?'Estoque 2':'Estoque 1',fornecedorOrigem:config.supplier,data,purchaseReceiptV728:config.id,atualizadoEm:now,...(line.estadoMadeira==='verde'?{origemMovimentacao:'Mad. verde'}:{})};
   return {stockRef,movementRef,stock,movement,privateLine:{...line,stockId,movementId,costKey:stockCostKey(physical)}};
  }));
  const receipt={...config,lines:rows.map(row=>row.privateLine),signature,entryId,revision:1,createdAt:now,createdBy:identity.uid};
  const entry={id:entryId,revision:1,type:'purchase',date:config.date,description:'Compra — descarregamento no '+(config.stock==='estoque2'?'Estoque 2':'Estoque 1'),partner:config.supplier,reference:config.reference||'Compra '+config.id,category:'wood',amountCents:config.totalCents,costCents:null,...(config.payment?{settlement:purchaseSettlementV757(config,now,identity.uid)}:{}),status:'active',createdAt:now,createdBy:identity.uid,updatedAt:now,updatedBy:identity.uid,source:{type:'stock-purchase',receiptId:config.id,goodsCents:config.goodsCents,acquisitionExpensesCents:config.addedCents}};
  for(const row of rows){tx.create(row.stockRef,row.stock);tx.create(row.movementRef,row.movement);}
  tx.create(receiptRef,receipt);tx.create(entryRef,entry);tx.create(db.doc(entryRef.path+'/versoes/1'),{action:'stock-purchase.confirm',at:now,by:identity.uid,previous:null,next:entry});
  return {empresaId:context.empresaId,preview:FINANCE_PREVIEW,receipt,repeated:false};
 });
}
