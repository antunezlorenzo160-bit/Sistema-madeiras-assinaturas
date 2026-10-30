import {periodView} from './contract-periods.mjs';
import {randomUUID} from 'node:crypto';
import {PlatformError,validateRenewalPreference} from './platform.mjs';
const root='plataforma_admin/billing';
const validId=value=>typeof value==='string'&&/^[-A-Za-z0-9_]{1,120}$/.test(value);
function offered(plan){return plan.active!==false&&Number.isSafeInteger(plan.amountCents)&&plan.amountCents>=0&&plan.amountCents<=100000000&&['monthly','yearly'].includes(plan.interval)&&typeof plan.name==='string'&&Boolean(plan.name.trim());}
export async function companyContext(db,identity,read=ref=>ref.get()){
 if(identity.emailVerified!==true)throw new PlatformError(403,'Confirme seu e-mail antes de escolher um plano.');
 const member=await read(db.doc(`membros/${identity.uid}`));
 if(!member.exists||member.data().ativo!==true||!validId(member.data().empresaId))throw new PlatformError(403,'Entre com uma conta vinculada a uma empresa ativa.');
 const empresaId=member.data().empresaId,company=await read(db.doc(`${root}/companies/${empresaId}`));
 if(!company.exists)throw new PlatformError(404,'Empresa não cadastrada na plataforma.');
 if(company.data().ownerUid?company.data().ownerUid!==identity.uid:member.data().papel!=='admin')throw new PlatformError(403,'Somente o responsável pela empresa pode registrar a escolha do plano.');
 if(company.data().accessStatus==='suspended')throw new PlatformError(403,'O acesso desta empresa está suspenso.');
 return {empresaId,name:company.data().name};
}
export async function companyContractOverview(db,identity,now=Date.now()){
 const company=await companyContext(db,identity);
 const [catalog,request,period]=await Promise.all([db.collection(`${root}/plans`).limit(201).get(),db.doc(`${root}/contract_requests/${company.empresaId}`).get(),db.doc(`${root}/test_contract_periods/${company.empresaId}`).get()]);
 if(catalog.size>200)throw new PlatformError(409,'O catálogo de planos precisa ser revisado pela plataforma.');
 const plans=catalog.docs.filter(d=>offered(d.data())).sort((a,b)=>a.id.localeCompare(b.id));
 const seen=new Set(),offers=[];
 for(const doc of plans){const p=doc.data();const key=JSON.stringify([p.name,p.amountCents,p.interval]);if(seen.has(key))continue;seen.add(key);offers.push({id:doc.id,name:p.name,amountCents:p.amountCents,interval:p.interval,revision:Number(p.updatedAt||0)});}
 const stored=period.exists?period.data():null;
 const current=stored?catalog.docs.find(doc=>doc.id===stored.planId)?.data():null;
 const currentPeriod=periodView(stored,current,now);
 const linked=request.exists&&validId(request.data().checkoutId)?await db.doc(`${root}/charges/${request.data().checkoutId}`).get():null;
 const charge=linked?.exists&&linked.data().empresaId===company.empresaId&&linked.data().source==='company_test'?linked.data():null;
 const checkout=charge?{id:linked.id,status:charge.status,url:charge.url||'',amountCents:charge.amountCents,interval:charge.interval,periodApplied:charge.periodApplied===true,mode:'test'}:null;
 return {checkout,company,offers:currentPeriod?.active&&!currentPeriod.renewalOpen?[]:offers,currentPeriod,request:request.exists?request.data():null,simulationOnly:true,automaticBilling:false};
}
export async function requestCompanyContract(db,identity,input,now=Date.now()){
 if(!input||input.simulationOnly!==true||!validId(input.planId))throw new PlatformError(400,'Confira o plano e marque a confirmação da simulação.');
 let renewal;try{renewal=validateRenewalPreference(input.renewalPreference);}catch(error){throw new PlatformError(400,error.message);}
 if(!renewal.renewalPreference)throw new PlatformError(400,'Escolha a forma de renovação.');
 return db.runTransaction(async tx=>{
  const company=await companyContext(db,identity,ref=>tx.get(ref));
  const planRef=db.doc(`${root}/plans/${input.planId}`),requestRef=db.doc(`${root}/contract_requests/${company.empresaId}`);
  const [plan,previous,period]=await Promise.all([tx.get(planRef),tx.get(requestRef),tx.get(db.doc(`${root}/test_contract_periods/${company.empresaId}`))]);
  const current=period.exists?periodView(period.data(),null,now):null;
  if(current?.active&&!current.renewalOpen)throw new PlatformError(409,'Seu período vigente tem preço garantido. A revisão do plano será liberada perto da renovação.');
  if(!plan.exists||!offered(plan.data()))throw new PlatformError(409,'Este plano não está disponível. Atualize a página.');
  const p=plan.data();
  if(input.expectedAmountCents!==p.amountCents||input.expectedInterval!==p.interval||input.revision!==Number(p.updatedAt||0))throw new PlatformError(409,'O plano mudou. Atualize a página e confira novamente antes de solicitar.');
  const data={empresaId:company.empresaId,companyName:company.name,planId:plan.id,planName:p.name,amountCents:p.amountCents,interval:p.interval,renewalPreference:renewal.renewalPreference,automaticBilling:false,simulationOnly:true,status:'requested_test',requestedBy:identity.uid,requestedAt:now};
  const old=previous.exists?previous.data():null;
  if(old&&(!current||old.requestedAt>=current.renewalNoticeAt)&&['planId','amountCents','interval','renewalPreference','requestedBy','status'].every(key=>old[key]===data[key]))return {ok:true,request:old,unchanged:true};
  if(old?.checkoutId){const linked=await tx.get(db.doc(`${root}/charges/${old.checkoutId}`));if(linked.exists&&['checkout_creating','test_checkout_created'].includes(linked.data().status))throw new PlatformError(409,'Já existe um pagamento de teste para esta solicitação. Confira o resultado antes de escolher outro plano.');}
  tx.set(requestRef,data);
  tx.create(db.doc(`plataforma_admin/audit/events/${randomUUID()}`),{action:'contract.request_test',empresaId:company.empresaId,uid:identity.uid,planId:plan.id,renewalPreference:data.renewalPreference,at:now});
  return {ok:true,request:data};
 });
}
