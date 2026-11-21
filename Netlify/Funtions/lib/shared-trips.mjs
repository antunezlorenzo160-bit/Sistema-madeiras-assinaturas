import {createHash} from 'node:crypto';
import {financeOwnerContext,financeCollectionPath} from './finance-access.mjs';
import {PlatformError} from './platform.mjs';
import {normalizeSharedTrip,allocateTripCosts} from '../../../public/shared-trips.mjs';
import {loadPhysicalM3,reviewLoadSaleDuplicates} from '../../../public/load-sales.mjs';
import {stockChartDate} from '../../../public/stock-charts.mjs';
import {transportRecordKeys} from './load-transport.mjs';
import {loadSaleKeys,describeLoadSale} from './load-sales.mjs';
import {readWeightedStockCosts} from './stock-average-cost.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export const tripPath=company=>financeCollectionPath(company)+'ViagensCompartilhadas';
export const tripLinkPath=(company,loadId)=>financeCollectionPath(company)+'VinculosViagem/'+hash(loadId);
export function tripEntryId(id){const c=hash('shared-trip:'+id).slice(0,32).split('');c[12]='4';c[16]='8';const s=c.join('');return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);}
function queryLoad(db,company,id){return db.collection(`empresas/${company}/dados/sm2_carregamentos/registros`).where('grupoCargaId','==',id).limit(401);}
function group(snapshot,id){
 if(!snapshot.docs.length||snapshot.docs.length>400)throw new PlatformError(409,'Carregamento ausente ou com mais de 400 itens. Confira a viagem.');
 const items=snapshot.docs.map(d=>({...d.data(),id:d.id}));
 if(items.some(i=>i.grupoCargaId!==id||i.cargaStatus==='montagem'||['cancelado','cancelled','excluido'].includes(i.cargaStatus)||i.cargaArquivadaInconsistenteEm||!(i.cargaFechadaEm||i.cargaBaixadaEm||['concluido','aguardando_conferencia'].includes(i.cargaStatus))))throw new PlatformError(409,'Use somente carregamentos originais fechados, sem itens cancelados.');
 const physicalM3=loadPhysicalM3(items);if(physicalM3===null)throw new PlatformError(409,'A viagem compartilhada exige volume físico em m³ em todos os pedidos.');
 const ordered=[...items].sort((a,b)=>Number(b.dadosClienteCargaV407?.atualizadoEm||0)-Number(a.dadosClienteCargaV407?.atualizadoEm||0));
 const customer=String(ordered[0].dadosClienteCargaV407?.nome||items[0].compradorDestino||items[0].cliente||'Cliente não informado').slice(0,180);
 return {loadId:id,physicalM3,customer,items};
}
function requestOf(config){return Object.fromEntries(['companyId','id','date','destination','truck','driver','loadIds','costs','status','acknowledgeExistingExpenses'].map(k=>[k,config[k]]));}
function sameRequest(a,b){return JSON.stringify(requestOf(a))===JSON.stringify(requestOf(b));}
function checkCompany(context,company){if(context.empresaId!==company)throw new PlatformError(409,'A empresa mudou. Entre novamente antes de continuar.');}
export async function saveSharedTrip(db,identity,input,now=Date.now()){
 let config;try{config=normalizeSharedTrip(input);}catch(e){throw new PlatformError(400,e.message);}
 const initial=await financeOwnerContext(db,identity,undefined,true,now);checkCompany(initial,config.companyId);
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);checkCompany(context,initial.empresaId);
  const ref=db.doc(tripPath(context.empresaId)+'/'+config.id),entryRef=db.doc(financeCollectionPath(context.empresaId)+'/'+tripEntryId(config.id)),[previousSnap,entrySnap]=await Promise.all([tx.get(ref),tx.get(entryRef)]),previous=previousSnap.exists?previousSnap.data():null,oldEntry=entrySnap.exists?entrySnap.data():null;
  if(oldEntry&&(oldEntry.source?.type!=='shared-trip'||oldEntry.source.tripId!==config.id))throw new PlatformError(409,'Conflito na identificação da despesa.');
  if((previous?.revision||0)!==config.revision){if(previous?.revision===config.revision+1&&sameRequest(previous,config))return {empresaId:context.empresaId,trip:previous,repeated:true};throw new PlatformError(409,'A viagem mudou em outro aparelho. Recarregue antes de salvar.');}
  if(previous?.status==='cancelled')throw new PlatformError(409,'Esta viagem foi cancelada. Crie outra viagem.');
  if(config.status==='cancelled'&&!previous)throw new PlatformError(409,'Viagem não encontrada.');
  if(config.status==='cancelled'&&!sameRequest({...previous,status:'cancelled'},config))throw new PlatformError(409,'Recarregue a viagem antes de cancelar.');
  const ids=[...new Set([...(previous?.loadIds||[]),...config.loadIds])],links=await Promise.all(ids.map(id=>tx.get(db.doc(tripLinkPath(context.empresaId,id)))));
  for(let i=0;i<ids.length;i++){const link=links[i].exists?links[i].data():null;if(config.status==='active'&&config.loadIds.includes(ids[i])&&link?.tripId&&link.tripId!==config.id)throw new PlatformError(409,'Um carregamento já pertence a outra viagem. Abra a viagem existente.');}
  let loads=[],direct=[];
  if(config.status==='active'){
   const snapshots=await Promise.all(config.loadIds.map(id=>tx.get(queryLoad(db,context.empresaId,id))));if(snapshots.reduce((n,s)=>n+s.docs.length,0)>2000)throw new PlatformError(409,'Muitos itens nesta viagem. Use menos carregamentos.');
   loads=snapshots.map((s,i)=>group(s,config.loadIds[i]));
   direct=await Promise.all(config.loadIds.map(id=>tx.get(db.doc(financeCollectionPath(context.empresaId)+'/'+transportRecordKeys(id).entryId))));
   if(direct.some(s=>s.exists&&s.data().status==='active'&&s.data().amountCents>0)&&!config.acknowledgeExistingExpenses)throw new PlatformError(409,'Há gastos já registrados nas cargas. Confira e marque que eles são exclusivos, sem repeti-los nos gastos compartilhados.');
  }
  const allocations=config.status==='active'?allocateTripCosts(config.totalCents,loads.map(({loadId,physicalM3,customer})=>({loadId,physicalM3,customer}))):previous.allocations;
  const saved={...config,allocations,revision:config.revision+1,createdAt:previous?.createdAt||now,createdBy:previous?.createdBy||identity.uid,updatedAt:now,updatedBy:identity.uid};
  const entry={id:entryRef.path.split('/').at(-1),revision:(oldEntry?.revision||0)+1,type:'expense',date:config.date,description:'Gastos da viagem compartilhada — '+config.destination,partner:'',reference:'Viagem '+config.id,category:'freight',amountCents:config.totalCents,costCents:null,status:config.status==='active'&&config.totalCents>0?'active':'cancelled',createdAt:oldEntry?.createdAt||now,createdBy:oldEntry?.createdBy||identity.uid,updatedAt:now,updatedBy:identity.uid,source:{type:'shared-trip',tripId:config.id,configRevision:saved.revision,allocations}};
  tx.set(ref,saved);tx.create(db.doc(ref.path+'/versoes/'+saved.revision),{at:now,by:identity.uid,previous,next:saved});
  tx.set(entryRef,entry);tx.create(db.doc(entryRef.path+'/versoes/'+entry.revision),{at:now,by:identity.uid,previous:oldEntry,next:entry});
  for(let i=0;i<ids.length;i++){const owned=links[i].exists?links[i].data()?.tripId:null;if(config.status==='active'&&config.loadIds.includes(ids[i]))tx.set(db.doc(tripLinkPath(context.empresaId,ids[i])),{loadId:ids[i],tripId:config.id,updatedAt:now});else if(owned===config.id)tx.set(db.doc(tripLinkPath(context.empresaId,ids[i])),{loadId:ids[i],tripId:null,updatedAt:now});}
  return {empresaId:context.empresaId,trip:saved};
 });
}
export async function projectSharedTripExpenses(db,company,entries){
 const trips=entries.filter(e=>e.status==='active'&&e.source?.type==='shared-trip');
 if(trips.some(e=>!Array.isArray(e.source.allocations)))throw new PlatformError(409,'Confira o rateio da viagem compartilhada.');
 const ids=[...new Set(trips.flatMap(e=>e.source.allocations.map(a=>a.loadId)))];if(ids.length>40)throw new PlatformError(409,'Muitos pedidos de viagens neste período. Consulte um período menor.');
 const snapshots=await Promise.all(ids.map(id=>queryLoad(db,company,id).get()));if(snapshots.reduce((n,s)=>n+s.docs.length,0)>2000)throw new PlatformError(409,'Muitos itens nas viagens. Consulte um período menor.');
 const sources=new Map(snapshots.map((snapshot,index)=>[ids[index],group(snapshot,ids[index])]));
 return entries.map(entry=>{if(entry.status!=='active'||entry.source?.type!=='shared-trip')return entry;
  const original=entry.source.allocations;if(!Array.isArray(original)||original.length<2)throw new PlatformError(409,'Confira o rateio da viagem compartilhada.');
  const allocations=allocateTripCosts(entry.amountCents,original.map(a=>{const load=sources.get(a.loadId);return {loadId:a.loadId,physicalM3:load.physicalM3,customer:load.customer};}));
  return {...entry,source:{...entry.source,allocations}};
 });
}
export async function listSharedTrips(db,identity,{from,to},now=Date.now()){
 if(typeof from!=='string'||typeof to!=='string'||stockChartDate(from)!==from||stockChartDate(to)!==to||from>to)throw new PlatformError(400,'Confira as datas.');
 const context=await financeOwnerContext(db,identity,undefined,false,now),path=`empresas/${context.empresaId}/dados/sm2_carregamentos/registros`,start=Date.parse(from+'T00:00:00Z')-86400000,end=Date.parse(to+'T00:00:00Z')+2*86400000;
 const [closed,completed,trips]=await Promise.all(['cargaFechadaEm','cargaBaixadaEm'].map(field=>db.collection(path).where(field,'>=',start).where(field,'<=',end).limit(2001).get()).concat(db.collection(tripPath(context.empresaId)).where('date','>=',from).where('date','<=',to).limit(101).get()));
 if(closed.docs.length>2000||completed.docs.length>2000||trips.docs.length>100)throw new PlatformError(409,'Muitos registros. Consulte um período menor.');
 const ids=[...new Set([...closed.docs,...completed.docs].map(d=>d.data().grupoCargaId).filter(Boolean))];if(ids.length>40)throw new PlatformError(409,'Mais de 40 cargas. Consulte um período menor.');
 const candidates=await Promise.all(ids.map(async id=>{let load;try{load=group(await queryLoad(db,context.empresaId,id).get(),id);}catch(e){if(e.status===409)return null;throw e;}
  const within=stamp=>{if(!Number.isFinite(Number(stamp))||Number(stamp)<=0)return false;const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(Number(stamp))).map(p=>[p.type,p.value])),day=parts.year+'-'+parts.month+'-'+parts.day;return day>=from&&day<=to;};
  if(!load.items.some(i=>within(i.cargaFechadaEm)||within(i.cargaBaixadaEm)))return null;
  const [link,expense]=await Promise.all([db.doc(tripLinkPath(context.empresaId,id)).get(),db.doc(financeCollectionPath(context.empresaId)+'/'+transportRecordKeys(id).entryId).get()]);
  return {loadId:id,physicalM3:load.physicalM3,customer:load.customer,tripId:link.exists?link.data().tripId:null,exclusiveCents:expense.exists&&expense.data().status==='active'?expense.data().amountCents:0};}));
 const latest=await financeOwnerContext(db,identity,undefined,false,now);checkCompany(latest,context.empresaId);return {...latest,trips:trips.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>b.date.localeCompare(a.date)),candidates:candidates.filter(Boolean)};
}
export async function sharedTripReport(db,identity,id,now=Date.now()){
 if(typeof id!=='string'||!(/^[a-f0-9-]{36}$/i).test(id))throw new PlatformError(400,'Viagem inválida.');
 const context=await financeOwnerContext(db,identity,undefined,false,now),saved=await db.doc(tripPath(context.empresaId)+'/'+id).get();if(!saved.exists)throw new PlatformError(404,'Viagem não encontrada.');const trip=saved.data();
 const loads=await Promise.all(trip.loadIds.map(async loadId=>{try{return group(await queryLoad(db,context.empresaId,loadId).get(),loadId);}catch(e){if(e.status!==409)throw e;const saved=trip.allocations.find(a=>a.loadId===loadId);return {...saved,items:[],missing:true,reason:e.message};}})),woodIds=new Set(loads.flatMap(l=>l.items.map(i=>i.madeiraId))),projection=await readWeightedStockCosts(db,context.empresaId,woodIds),allocations=allocateTripCosts(trip.status==='active'?trip.totalCents:0,loads);
 const manualSnapshot=await db.collection(financeCollectionPath(context.empresaId)).where('type','==','sale').where('status','==','active').limit(1001).get();if(manualSnapshot.docs.length>1000)throw new PlatformError(409,'Muitas vendas manuais para conferir duplicidade. Consulte o suporte.');const manualRows=manualSnapshot.docs.map(d=>({...d.data(),id:d.id}));
 let revenue=0,cost=0,exclusive=0,pending=false,pendingRevenue=false;
 const rows=await Promise.all(allocations.map(async load=>{
  const [config,expense]=await Promise.all([db.doc(financeCollectionPath(context.empresaId)+'VendasCarga/'+loadSaleKeys(load.loadId).configId).get(),db.doc(financeCollectionPath(context.empresaId)+'/'+transportRecordKeys(load.loadId).entryId).get()]),rawSale=load.missing?null:describeLoadSale(load.items,load.loadId,config.exists?config.data():null,projection),sale=rawSale?reviewLoadSaleDuplicates([...manualRows,rawSale]).at(-1):null,active=sale?.status==='active',amountCents=active?sale.amountCents:sale&&sale.status!=='pending-review'?0:null,costCents=sale?.status==='pending-review'?null:active?sale.costCents:sale?0:null,exclusiveCents=expense.exists&&expense.data().status==='active'?expense.data().amountCents:0;
  revenue+=amountCents||0;pendingRevenue||=amountCents===null;cost+=costCents||0;exclusive+=exclusiveCents;pending||=costCents===null;
  return {loadId:load.loadId,customer:load.customer,physicalM3:load.physicalM3,amountCents,costCents,exclusiveCents,sharedCents:load.amountCents,resultCents:costCents===null?null:amountCents-costCents-exclusiveCents-load.amountCents,pendingReason:load.missing?load.reason:!sale?'Aguardando baixa completa do carregamento.':sale.status==='pending-review'?'Confira a possível duplicidade de venda no Financeiro.':sale.status==='cancelled'?'Esta carga foi marcada fora das vendas.':sale.source.costPendingReason||null,items:load.items.map(i=>({madeira:i.madeira||i.especie||i.produto||'',quantidade:i.quantidade,espessura:i.espessura,largura:i.largura,comprimento:i.comprimento,physicalM3:loadPhysicalM3([i])}))};
 }));
 const latest=await financeOwnerContext(db,identity,undefined,false,now);checkCompany(latest,context.empresaId);
 return {...latest,trip,needsReview:loads.some(l=>l.missing),loads:rows,total:{revenueCents:pendingRevenue?null:revenue,costCents:pending?null:cost,exclusiveCents:exclusive,sharedCents:trip.status==='active'?trip.totalCents:0,resultCents:pending?null:revenue-cost-exclusive-(trip.status==='active'?trip.totalCents:0)}};
}
export async function sharedTripCandidates(db,identity,loadIds,now=Date.now()){
 if(!Array.isArray(loadIds)||loadIds.length<2||loadIds.length>20||new Set(loadIds).size!==loadIds.length||loadIds.some(id=>typeof id!=='string'||!id||id.length>180||/[\u0000-\u001f]/.test(id)))throw new PlatformError(400,'Selecione de 2 a 20 carregamentos diferentes.');
 const context=await financeOwnerContext(db,identity,undefined,false,now),snapshots=await Promise.all(loadIds.map(id=>queryLoad(db,context.empresaId,id).get()));
 if(snapshots.reduce((n,s)=>n+s.docs.length,0)>2000)throw new PlatformError(409,'Muitos itens nesta seleção. Use menos carregamentos.');
 const candidates=await Promise.all(snapshots.map(async(snapshot,index)=>{const id=loadIds[index],load=group(snapshot,id),[link,expense]=await Promise.all([db.doc(tripLinkPath(context.empresaId,id)).get(),db.doc(financeCollectionPath(context.empresaId)+'/'+transportRecordKeys(id).entryId).get()]);return {loadId:id,physicalM3:load.physicalM3,customer:load.customer,tripId:link.exists?link.data().tripId:null,exclusiveCents:expense.exists&&expense.data().status==='active'?expense.data().amountCents:0};}));
 const latest=await financeOwnerContext(db,identity,undefined,false,now);checkCompany(latest,context.empresaId);return {...latest,candidates};
}
