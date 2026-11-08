import {readWeightedStockCosts} from './stock-average-cost.mjs';
import {weightedCostForLoad} from '../../../public/stock-average-cost.mjs';
import {createHash} from 'node:crypto';
import {financeCollectionPath,financeOwnerContext} from './finance-access.mjs';
import {PlatformError} from './platform.mjs';
import {completedLoadSale,normalizeLoadSaleConfig,loadPhysicalM3} from '../../../public/load-sales.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function loadSaleKeys(loadId){const key=hash(['load-sale',loadId]),chars=key.slice(0,32).split('');chars[12]='4';chars[16]='8';const id=chars.join('');return {configId:key,entryId:id.slice(0,8)+'-'+id.slice(8,12)+'-'+id.slice(12,16)+'-'+id.slice(16,20)+'-'+id.slice(20)};}
function loadQuery(db,empresaId,loadId){return db.collection(`empresas/${empresaId}/dados/sm2_carregamentos/registros`).where('grupoCargaId','==',loadId).limit(401);}
function groupRows(snapshot){if(snapshot.docs.length>400)throw new PlatformError(409,'A carga excede o limite de itens desta consulta. Consulte o suporte.');return snapshot.docs.map(doc=>({...doc.data(),id:doc.id})).sort((a,b)=>a.id.localeCompare(b.id));}
export function describeLoadSale(items,loadId,config=null,costProjection=null){
 let sale;try{sale=completedLoadSale(items);}catch(e){throw new PlatformError(409,e.message);}if(!sale)return null;
 const physicalSignature=hash(items.map(i=>[i.id,i.madeiraId||'',i.tipoMedida||i.tipoCadastro||'m3',...['quantidade','volume','espessura','largura','comprimento'].map(k=>Number(i[k]||0)),i.estadoMadeira||'',i.produto||'']));
 const signature=hash([loadId,sale,physicalSignature]),keys=loadSaleKeys(loadId),costChanged=config?.costCents!==null&&config?.costCents!==undefined&&config.physicalSignature!==physicalSignature;
 const automatic=weightedCostForLoad(items,costProjection),manualCost=config&&config.physicalSignature===physicalSignature?config.costCents:null;
 const costCents=costChanged?null:manualCost??automatic.costCents;
 return {id:keys.entryId,revision:config?.revision||0,type:'sale',date:sale.date,description:'Venda do carregamento original',partner:sale.partner,reference:'Carga '+loadId.slice(0,100),category:'wood',amountCents:sale.amountCents,costCents,status:config?.include===false?'cancelled':'active',updatedAt:Math.max(...items.map(i=>Number(i.atualizadoEm||i.cargaBaixadaEm||0)),Number(config?.updatedAt||0)),source:{type:'load-sale',physicalM3:loadPhysicalM3(items),costMode:costChanged?'pending':manualCost!==null&&manualCost!==undefined?'manual':automatic.costCents!==null?'average':'pending',automaticCostCents:automatic.costCents,automaticCostPendingReason:automatic.reason,usesConferenceAverage:automatic.usesConferenceAverage===true,costPendingReason:costCents===null?automatic.reason:null,loadId,signature,physicalSignature,manualEntryId:config?.manualEntryId||null,separateConfirmed:config?.resolution==='separate',costRequiresReview:costChanged,serviceCents:sale.serviceCents,woodCents:sale.woodCents,pendingServiceLines:sale.pendingServiceLines,zeroValueLines:sale.zeroValueLines,subtotalCents:sale.subtotalCents,discountCents:sale.discountCents,freightCents:sale.freightCents,otherCents:sale.otherCents}};
}
export async function projectLoadSales(db,empresaId,{from,to},openingPolicy=undefined){
 // Only read on an explicit financial consultation. A query never creates ledger entries.
 const start=Date.parse(from+'T00:00:00Z')-86400000,end=Date.parse(to+'T00:00:00Z')+2*86400000-1;
 const source=await db.collection(`empresas/${empresaId}/dados/sm2_carregamentos/registros`).where('cargaBaixadaEm','>=',start).where('cargaBaixadaEm','<=',end).orderBy('cargaBaixadaEm','desc').limit(2001).get();
 if(source.docs.length>2000)throw new PlatformError(409,'Muitos itens de cargas neste período. Selecione um período menor para conferir todas as vendas.');
 const ids=[...new Set(source.docs.map(doc=>String(doc.data().grupoCargaId||'')).filter(Boolean))];if(ids.length>40)throw new PlatformError(409,'Muitas cargas neste período. Selecione um período menor para conferir todas as vendas.');
 const groups=await Promise.all(ids.map(async id=>{const keys=loadSaleKeys(id);const [group,saved]=await Promise.all([loadQuery(db,empresaId,id).get(),db.doc(financeCollectionPath(empresaId)+'VendasCarga/'+keys.configId).get()]);return {id,items:groupRows(group),config:saved.exists?saved.data():null};}));
 const costProjection=ids.length?await readWeightedStockCosts(db,empresaId,new Set(groups.flatMap(g=>g.items.map(i=>i.madeiraId))),openingPolicy):null;
 const rows=groups.map(g=>describeLoadSale(g.items,g.id,g.config,costProjection));
 return rows.filter(row=>row&&row.date>=from&&row.date<=to);
}
export async function saveLoadSaleConfig(db,identity,input,now=Date.now()){
 let request;try{request=normalizeLoadSaleConfig(input);}catch(e){throw new PlatformError(400,e.message);}
 const initial=await financeOwnerContext(db,identity,undefined,true,now),keys=loadSaleKeys(request.loadId);
 const sourceItems=groupRows(await loadQuery(db,initial.empresaId,request.loadId).get());
 const costProjection=await readWeightedStockCosts(db,initial.empresaId,new Set(sourceItems.map(i=>i.madeiraId)));
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'O vínculo mudou. Entre novamente.');
  const configRef=db.doc(financeCollectionPath(context.empresaId)+'VendasCarga/'+keys.configId),previousSnap=await tx.get(configRef),previous=previousSnap.exists?previousSnap.data():null;
  const items=groupRows(await tx.get(loadQuery(db,context.empresaId,request.loadId))),current=describeLoadSale(items,request.loadId,previous,costProjection);
  if(!current)throw new PlatformError(409,'A carga precisa estar totalmente baixada para entrar como venda.');
  if(current.source.signature!==request.signature)throw new PlatformError(409,'A carga mudou. Consulte o período novamente antes de salvar o custo.');
  let manualRef=null,manual=null;
  if(request.manualEntry){manualRef=db.doc(financeCollectionPath(context.empresaId)+'/'+request.manualEntry.id);const snap=await tx.get(manualRef);manual=snap.exists?snap.data():null;}
  const manualEntryId=request.manualEntry?.id||previous?.manualEntryId||null;
  if((previous?.revision||0)!==request.revision){
   if(previous?.revision===request.revision+1&&previous.costCents===request.costCents&&previous.include===request.include&&previous.signature===request.signature&&previous.manualEntryId===manualEntryId&&previous.resolution===request.resolution)return {empresaId:context.empresaId,entry:current,manualEntry:manual};
   throw new PlatformError(409,'O custo mudou em outro aparelho. Consulte o período novamente.');
  }
  if(previous?.manualEntryId&&request.manualEntry&&previous.manualEntryId!==request.manualEntry.id)throw new PlatformError(409,'A carga já substitui outro lançamento manual.');
  if(request.manualEntry&&(!manual||manual.type!=='sale'||manual.status!=='active'||manual.source||manual.amountCents!==current.amountCents||manual.date!==current.date||manual.revision!==request.manualEntry.revision))throw new PlatformError(409,'O lançamento manual mudou ou não corresponde à data e ao valor desta venda. Consulte o período novamente.');
  const saved={loadId:request.loadId,revision:request.revision+1,include:request.include,costCents:request.costCents,signature:request.signature,physicalSignature:current.source.physicalSignature,manualEntryId,resolution:request.resolution,updatedAt:now,updatedBy:identity.uid};
  let retired=null;if(manual){retired={...manual,status:'cancelled',revision:manual.revision+1,updatedAt:now,updatedBy:identity.uid,cancelledAt:now,cancelledBy:identity.uid,supersededByLoadId:request.loadId};}
  tx.set(configRef,saved);tx.create(db.doc(configRef.path+'/versoes/'+saved.revision),{at:now,by:identity.uid,previous:previous||null,next:saved});
  if(retired){tx.set(manualRef,retired);tx.create(db.doc(manualRef.path+'/versoes/'+retired.revision),{action:'link.load-sale',at:now,by:identity.uid,previous:manual,next:retired});}
  return {empresaId:context.empresaId,entry:describeLoadSale(items,request.loadId,saved,costProjection),manualEntry:retired};
 });
}
