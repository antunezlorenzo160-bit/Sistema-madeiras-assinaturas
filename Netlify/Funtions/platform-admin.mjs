import {confirmTestPayment} from './lib/payment-confirmation.mjs';
import { randomUUID } from 'node:crypto';
import { authenticate, failure, json, PlatformError } from './lib/platform-auth.mjs';
import { METHODS, validatePlan, validateWatermark } from './lib/platform.mjs';
import { testCheckout,inspectTestCheckout } from './lib/mercadopago.mjs';
import { createReadBudget } from './lib/read-budget.mjs';
import { createInvitation } from './lib/invitations.mjs';
import {companyDetail,manageCompany} from './lib/company-management.mjs';

const ids = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(value);
const overviewReads = createReadBudget();
export default async function handler(req) {
  if (!['GET','POST'].includes(req.method)) return json(405,{error:'Método não permitido.'});
  let stage='authentication',ownerAuthorized=false;
  try {
    const {db,uid} = await authenticate(req);
    ownerAuthorized=true;
    const root = db.collection('plataforma_admin');
    if (req.method === 'GET') {
      if(new URL(req.url).searchParams.get('refresh')==='1')overviewReads.invalidate();
      const overview = await overviewReads.load(async()=>{
      const read=(name,promise)=>promise.catch(error=>{error.stage=name;throw error;});
      const [plans,companies,subscriptions,watermark,charges] = await Promise.all([
        read('plans',root.doc('billing').collection('plans').limit(200).get()),
        read('companies',root.doc('billing').collection('companies').limit(200).get()),
        read('subscriptions',root.doc('billing').collection('subscriptions').limit(200).get()),
        read('watermark',root.doc('pdf_watermark').get()),
        read('charges',root.doc('billing').collection('charges').limit(100).get()),
      ]);
      const list = snap => snap.docs.map(d=>({...d.data(),id:d.id}));
      return {plans:list(plans),companies:list(companies),subscriptions:list(subscriptions),charges:list(charges),
        watermark:watermark.exists?watermark.data():{widthMm:180,opacity:.04,image:''},
        methods:METHODS.map(id=>({id,status:process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN?'test_available':'not_connected'})),provider:'mercadopago',testConfigured:Boolean(process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN),livePayments:false,webhookConfigured:Boolean(process.env.MERCADO_PAGO_TEST_WEBHOOK_SECRET)};
      });
      return json(200,overview);
    }
    stage='operation';
    const text = await req.text();
    if (text.length > 400000) throw new PlatformError(413,'Arquivo muito grande.');
    let input; try { input = JSON.parse(text); } catch { throw new PlatformError(400,'Pedido inválido.'); }
    if (!input || typeof input !== 'object') throw new PlatformError(400,'Pedido inválido.');
    if(input.action==='company.detail')return json(200,await companyDetail(db,input.empresaId));
    if(['company.access','trial.save'].includes(input.action)){
      const result=await manageCompany(db,input,uid);overviewReads.invalidate();return json(200,result);
    }
    if(input.action==='invitation.create'){
      const base=new URL(req.url).protocol==='https:'?new URL(req.url).origin:process.env.DEPLOY_PRIME_URL||process.env.URL;
      if(!base||!base.startsWith('https://'))throw new PlatformError(503,'URL da prévia não configurada.');
      const result=await createInvitation(db,input,uid);
      const url=new URL('/cadastro/',base);url.hash='convite='+result.token;
      return json(200,{ok:true,url:url.href,empresaId:result.empresaId});
    }
    if(input.action==='charge.inspect')return json(200,await inspectTestCheckout({db,chargeId:input.chargeId,token:process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN}));
    if(input.action==='charge.verify'){
      const result=await confirmTestPayment({db,chargeId:input.chargeId,token:process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN});
      overviewReads.invalidate();return json(200,result);
    }
    if (input.action === 'charge.test') {
      if (!ids(input.empresaId)) throw new PlatformError(400,'Empresa inválida.');
      const subscription = await root.doc('billing').collection('subscriptions').doc(input.empresaId).get();
      if (!subscription.exists || subscription.data().status === 'canceled') throw new PlatformError(400,'Cadastre uma assinatura válida antes de gerar a cobrança de teste.');
      if(!ids(subscription.data().planId))throw new PlatformError(400,'Escolha um plano para esta assinatura antes de gerar o checkout de teste.');
      const plan = await root.doc('billing').collection('plans').doc(subscription.data().planId).get();
      if (!plan.exists || plan.data().active === false) throw new PlatformError(400,'Plano indisponível.');
      const base = new URL(req.url).protocol==='https:'?new URL(req.url).origin:process.env.DEPLOY_PRIME_URL || process.env.URL;
      if (!base || !base.startsWith('https://')) throw new PlatformError(503,'URL da prévia não configurada.');
      const id = randomUUID();
      const checkout = await testCheckout({token:process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN,amountCents:plan.data().amountCents,title:plan.data().name,reference:id,returnUrl:new URL('/plataforma/',base).href,...(process.env.MERCADO_PAGO_TEST_WEBHOOK_SECRET?{notificationUrl:new URL('/.netlify/functions/mercadopago-webhook',base).href}:{})});
      await root.doc('billing').collection('charges').doc(id).set({...checkout,empresaId:input.empresaId,planId:plan.id,amountCents:plan.data().amountCents,status:'test_checkout_created',createdAt:Date.now(),createdBy:uid});
      overviewReads.invalidate();
      return json(200,{ok:true,id,url:checkout.url,mode:'test'});
    }
    let ref, data, clearTrialNotices=[];
    try {
      if (input.action === 'plan.save') {
        if (input.id && !ids(input.id)) throw Error('Plano inválido.');
        ref = root.doc('billing').collection('plans').doc(input.id || randomUUID()); data = validatePlan(input);
      } else if (input.action === 'company.save') {
        if (!ids(input.empresaId) || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120) throw Error('Informe a empresa e o nome.');
        ref = root.doc('billing').collection('companies').doc(input.empresaId);
        data = {name:input.name.trim(),empresaId:input.empresaId};
      } else if (input.action === 'subscription.save') {
        if (!ids(input.empresaId) || !ids(input.planId) || !['trial','active','past_due','canceled'].includes(input.status)) throw Error('Assinatura inválida.');
        const [company,plan] = await Promise.all([root.doc('billing').collection('companies').doc(input.empresaId).get(),root.doc('billing').collection('plans').doc(input.planId).get()]);
        if (!company.exists || !plan.exists) throw Error('Cadastre a empresa e o plano primeiro.');
        ref = root.doc('billing').collection('subscriptions').doc(input.empresaId);
        data = {empresaId:input.empresaId,planId:input.planId,status:input.status,source:'manual_admin'};
        if(input.status!=='trial'){
          const members=await db.collection('membros').where('empresaId','==',input.empresaId).limit(401).get();
          if(members.size>400)throw new PlatformError(409,'Esta empresa exige uma operação em lote maior.');
          clearTrialNotices=members.docs.map(member=>member.ref);
          Object.assign(data,{trialMode:null,trialEndDate:null,trialEndsAt:null});
        }
      } else if (input.action === 'watermark.save') {
        ref = root.doc('pdf_watermark'); data = validateWatermark(input);
      } else throw Error('Ação inválida.');
    } catch(error) { if(error instanceof PlatformError)throw error;throw new PlatformError(400,error.message); }
    const batch = db.batch();
    batch.set(ref,{...data,updatedAt:Date.now(),updatedBy:uid},{merge:true});
    for(const member of clearTrialNotices)batch.update(member,{avisoPlataforma:null});
    batch.set(root.doc('audit').collection('events').doc(randomUUID()),{action:input.action,target:ref.path,uid,at:Date.now()});
    await batch.commit();
    overviewReads.invalidate();
    return json(200,{ok:true,id:ref.id});
  } catch(error) { if(!error.stage)error.stage=stage;return failure(error,ownerAuthorized); }
}
