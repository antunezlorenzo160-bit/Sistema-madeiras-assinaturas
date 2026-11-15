import {createHash} from 'node:crypto';
import {financeCollectionPath,financeOwnerContext} from './finance-access.mjs';
import {PlatformError} from './platform.mjs';
import {fiscalSourceV762,fiscalPartyV762,fiscalDataV762,fiscalSnapshotV762,fiscalIssuesV762} from '../../../public/fiscal-preparation.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const fiscalPrefixV762=id=>financeCollectionPath(id)+'Fiscal';
export const fiscalKeyV762=source=>hash(fiscalSourceV762(source));
function parse(fn){try{return fn();}catch(e){throw new PlatformError(400,e.message);}}
async function sourceSnapshot(db,read,company,source){
 let rows=[],order=null;
 if(source.type==='order'){const s=await read(db.doc(`empresas/${company}/dados/sm2_orcamentos_guardados/registros/${source.id}`));order=s.exists?s.data():null;}
 else{const s=await read(db.collection(`empresas/${company}/dados/sm2_carregamentos/registros`).where('grupoCargaId','==',source.id).limit(401));if(s.docs.length>400)throw new PlatformError(409,'A carga excede 400 itens.');rows=s.docs.map(d=>({...d.data(),id:d.id})).filter(i=>i.excluido!==true).sort((a,b)=>a.id.localeCompare(b.id));}
 let snapshot;try{snapshot=fiscalSnapshotV762(source,rows,order);}catch(e){throw new PlatformError(409,e.message);}
 return {snapshot,signature:hash(snapshot)};
}
const aliasRef=(db,c,source)=>db.doc(fiscalPrefixV762(c)+'Origens/'+fiscalKeyV762(source));
const draftRef=(db,c,id)=>db.doc(fiscalPrefixV762(c)+'Rascunhos/'+id);
const configRef=(db,c)=>db.doc(fiscalPrefixV762(c)+'Configuracao/emitente');
function packet(context,config,draft,current){const data=draft?.data||{recipient:current.snapshot.recipient,products:[...new Map(current.snapshot.lines.map(l=>[l.key,{key:l.key,ncm:l.ncm,cfop:l.cfop}])).values()],notes:''};return {...context,config:config||null,draft:draft||null,...current,data,issues:fiscalIssuesV762(current.snapshot,config?.party,data),sourceChanged:!!draft&&draft.signature!==current.signature};}
export async function readFiscalPreparation(db,identity,input={},now=Date.now()){
 const source=input.source?parse(()=>fiscalSourceV762(input.source)):null;
 const orderSource=input.orderId?parse(()=>fiscalSourceV762({type:'order',id:input.orderId})):null;
 if(orderSource&&source?.type!=='load')throw new PlatformError(400,'Vincule o pedido pela carga.');
 const result=await db.runTransaction(async tx=>{const context=await financeOwnerContext(db,identity,r=>tx.get(r),false,now),company=context.empresaId,conf=await tx.get(configRef(db,company)),config=conf.exists?conf.data():null;
  if(!source){const s=await tx.get(db.collection(fiscalPrefixV762(company)+'Rascunhos').orderBy('updatedAt','desc').limit(100));return {...context,config,drafts:s.docs.map(d=>{const v=d.data();return {id:d.id,source:v.source,orderId:v.orderId||null,recipient:v.data.recipient.nome,totalCents:v.snapshot.totals.totalCents,updatedAt:v.updatedAt,status:'not-issued'};})};}
  const aliases=await Promise.all([source,...(orderSource?[orderSource]:[])].map(s=>tx.get(aliasRef(db,company,s)))),ids=[...new Set(aliases.filter(s=>s.exists).map(s=>s.data().draftId))];if(ids.length>1)throw new PlatformError(409,'Pedido e carga já têm preparações separadas.');
  const s=await tx.get(draftRef(db,company,ids[0]||fiscalKeyV762(orderSource||source))),draft=s.exists?s.data():null;
  if(orderSource){await sourceSnapshot(db,r=>tx.get(r),company,orderSource);if(draft?.source.type==='load'&&draft.source.id!==source.id||draft?.orderId&&draft.orderId!==orderSource.id)throw new PlatformError(409,'Esta preparação já tem outro vínculo.');}
  const current=await sourceSnapshot(db,r=>tx.get(r),company,orderSource?source:draft?.source||source);return {...packet(context,config,draft,current),linkOrderId:orderSource?.id||draft?.orderId||null};
 });
 const fresh=await financeOwnerContext(db,identity,undefined,false,now);if(fresh.empresaId!==result.empresaId)throw new PlatformError(409,'A empresa mudou.');return {...result,canWrite:fresh.canWrite};
}
export async function saveFiscalPreparation(db,identity,input,now=Date.now()){
 if(!input||Object.keys(input).some(k=>!['companyId','action','source','orderId','revision','signature','data','party'].includes(k))||!['config','draft'].includes(input.action)||!Number.isSafeInteger(input.revision)||input.revision<0)throw new PlatformError(400,'Pedido fiscal inválido.');
 const initial=await financeOwnerContext(db,identity,undefined,true,now);if(input.companyId!==initial.empresaId)throw new PlatformError(403,'A empresa mudou.');
 const party=input.action==='config'?parse(()=>fiscalPartyV762(input.party)):null,data=input.action==='draft'?parse(()=>fiscalDataV762(input.data)):null,source=input.action==='draft'?parse(()=>fiscalSourceV762(input.source)):null;
 const orderSource=input.orderId?parse(()=>fiscalSourceV762({type:'order',id:input.orderId})):null;
 if(orderSource&&source?.type!=='load')throw new PlatformError(400,'Vincule o pedido pela cópia comercial da carga.');
 return db.runTransaction(async tx=>{const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now),company=context.empresaId;if(company!==initial.empresaId)throw new PlatformError(409,'A empresa mudou.');
  if(party){const ref=configRef(db,company),s=await tx.get(ref),previous=s.exists?s.data():null,signature=hash(party);if((previous?.revision||0)!==input.revision){if(previous?.revision===input.revision+1&&previous.signature===signature)return {...context,config:previous,repeated:true};throw new PlatformError(409,'O cadastro fiscal mudou. Reabra para conferir.');}const next={party,signature,revision:input.revision+1,updatedAt:now,updatedBy:identity.uid,environment:'preparation',provider:null};tx.set(ref,next);tx.create(db.doc(ref.path+'/versoes/'+next.revision),{at:now,by:identity.uid,previous,next});return {...context,config:next};}
  const aliases=await Promise.all([source,...(orderSource?[orderSource]:[])].map(async s=>{const ref=aliasRef(db,company,s),snap=await tx.get(ref);return {ref,source:s,id:snap.exists?snap.data().draftId:null};}));
  const ids=[...new Set(aliases.map(a=>a.id).filter(Boolean))];if(ids.length>1)throw new PlatformError(409,'O pedido e a carga já têm preparações separadas. Confira os vínculos antes de continuar.');
  const id=ids[0]||fiscalKeyV762(orderSource||source),ref=draftRef(db,company,id),saved=await tx.get(ref),previous=saved.exists?saved.data():null;
  if(previous?.source?.type==='load'&&source.type==='order')throw new PlatformError(409,'Este pedido já está ligado a uma carga. Reabra a preparação para conferir a carga.');
  if(previous?.source?.type==='load'&&previous.source.id!==source.id)throw new PlatformError(409,'O pedido já está ligado a outra carga.');
  if(previous?.orderId&&orderSource&&previous.orderId!==orderSource.id)throw new PlatformError(409,'A carga já está ligada a outro pedido.');
  const current=await sourceSnapshot(db,r=>tx.get(r),company,source);if(input.signature!==current.signature)throw new PlatformError(409,'A origem mudou. Reabra e confira os dados atuais antes de salvar.');
  if(orderSource)await sourceSnapshot(db,r=>tx.get(r),company,orderSource);
  const keys=new Set(current.snapshot.lines.map(l=>l.key));if(data.products.some(p=>!keys.has(p.key)))throw new PlatformError(400,'Os produtos mudaram. Reabra a preparação.');
  const requestSignature=hash([source,orderSource?.id||previous?.orderId||(source.type==='order'?source.id:null),current.signature,data]);
  if((previous?.revision||0)!==input.revision){if(previous?.revision===input.revision+1&&previous.requestSignature===requestSignature)return {...context,draft:previous,repeated:true};throw new PlatformError(409,'A preparação mudou em outro aparelho ou já existe para o pedido. Reabra para conferir.');}
  const next={id,source,orderId:orderSource?.id||previous?.orderId||(source.type==='order'?source.id:null),data,snapshot:current.snapshot,signature:current.signature,requestSignature,status:'not-issued',revision:input.revision+1,createdAt:previous?.createdAt||now,updatedAt:now,updatedBy:identity.uid};
  tx.set(ref,next);tx.create(db.doc(ref.path+'/versoes/'+next.revision),{at:now,by:identity.uid,previous,next});for(const a of aliases)tx.set(a.ref,{draftId:id,source:a.source});return {...context,draft:next};
 });
}
