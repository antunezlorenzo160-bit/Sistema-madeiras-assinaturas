import {createHash} from 'node:crypto';
import {financeOwnerContext,financeCollectionPath} from './company-finance.mjs';
import {PlatformError} from './platform.mjs';
import {normalizeLoadTransport} from '../../../public/load-transport.mjs';
export function transportRecordKeys(loadId){
 const hash=createHash('sha256').update(loadId).digest('hex');const chars=hash.slice(0,32).split('');chars[12]='4';chars[16]='8';const uuid=chars.join('');
 return {configId:hash,entryId:uuid.slice(0,8)+'-'+uuid.slice(8,12)+'-'+uuid.slice(12,16)+'-'+uuid.slice(16,20)+'-'+uuid.slice(20)};
}
function validLoadId(value){if(typeof value!=='string'||!value||value.length>180||/[\u0000-\u001f]/.test(value))throw new PlatformError(400,'Carregamento inválido.');}
function checkLoad(snapshot,loadId){const row=snapshot?.exists?snapshot.data():null;if(!row||row.grupoCargaId!==loadId)throw new PlatformError(404,'Carregamento não encontrado nesta empresa.');if(!(row.cargaFechadaEm||row.cargaBaixadaEm||['concluido','aguardando_conferencia'].includes(row.cargaStatus)))throw new PlatformError(409,'Feche o carregamento antes de registrar gastos de transporte.');}
async function findLoad(db,empresaId,loadId){validLoadId(loadId);const list=await db.collection(`empresas/${empresaId}/dados/sm2_carregamentos/registros`).where('grupoCargaId','==',loadId).limit(1).get();const first=list.docs[0];checkLoad(first,loadId);return db.doc(`empresas/${empresaId}/dados/sm2_carregamentos/registros/${first.id}`);}
export async function getLoadTransport(db,identity,loadId,now=Date.now()){
 const context=await financeOwnerContext(db,identity,undefined,false,now),load=await findLoad(db,context.empresaId,loadId),keys=transportRecordKeys(loadId);
 const saved=await db.doc(financeCollectionPath(context.empresaId)+'Transporte/'+keys.configId).get();
 const latest=await financeOwnerContext(db,identity,undefined,false,now);if(latest.empresaId!==context.empresaId)throw new PlatformError(409,'O vínculo mudou. Entre novamente.');
 return {...latest,config:saved.exists?saved.data():null};
}
export async function saveLoadTransport(db,identity,input,now=Date.now()){
 let config;try{config=normalizeLoadTransport(input);}catch(e){throw new PlatformError(400,e.message);}
 const initial=await financeOwnerContext(db,identity,undefined,true,now),load=await findLoad(db,initial.empresaId,config.loadId),keys=transportRecordKeys(config.loadId);
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'O vínculo mudou. Entre novamente.');
  checkLoad(await tx.get(load),config.loadId);
  const configRef=db.doc(financeCollectionPath(context.empresaId)+'Transporte/'+keys.configId),entryRef=db.doc(financeCollectionPath(context.empresaId)+'/'+keys.entryId);
  const previousSnap=await tx.get(configRef),entrySnap=await tx.get(entryRef),previous=previousSnap.exists?previousSnap.data():null,oldEntry=entrySnap.exists?entrySnap.data():null;
  if(oldEntry&&(oldEntry.source?.type!=='load-transport'||oldEntry.source.loadId!==config.loadId))throw new PlatformError(409,'Já existe outro registro com esta identificação. Consulte o suporte.');
  if((previous?.revision||0)!==config.revision){
   const same=previous?.revision===config.revision+1&&previous.mode===config.mode&&previous.date===config.date&&Object.keys(config.costs).every(key=>previous.costs?.[key]===config.costs[key]);
   if(same)return {empresaId:context.empresaId,config:previous,entry:oldEntry};
   throw new PlatformError(409,'Os gastos mudaram em outro aparelho. Consulte os dados atuais antes de salvar.');
  }
  const saved={...config,revision:config.revision+1,updatedAt:now,updatedBy:identity.uid};
  let entry=null;
  if(config.totalCents>0||oldEntry){
   entry={id:keys.entryId,revision:(oldEntry?.revision||0)+1,type:'expense',date:config.date,description:'Transporte do carregamento',partner:'',reference:'Carga '+config.loadId.slice(0,100),category:'freight',amountCents:config.totalCents,costCents:null,status:config.totalCents>0?'active':'cancelled',createdAt:oldEntry?.createdAt||now,createdBy:oldEntry?.createdBy||identity.uid,updatedAt:now,updatedBy:identity.uid,source:{type:'load-transport',loadId:config.loadId,mode:config.mode,configRevision:saved.revision}};
   if(config.totalCents===0){entry.cancelledAt=now;entry.cancelledBy=identity.uid;}
  }
  tx.set(configRef,saved);tx.create(db.doc(configRef.path+'/versoes/'+saved.revision),{at:now,by:identity.uid,previous:previous||null,next:saved});
  if(entry){tx.set(entryRef,entry);tx.create(db.doc(entryRef.path+'/versoes/'+entry.revision),{action:entry.status==='cancelled'?'cancel':'transport.update',at:now,by:identity.uid,previous:oldEntry||null,next:entry});}
  return {empresaId:context.empresaId,config:saved,entry};
 });
}
