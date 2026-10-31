import {authenticate,json,failure,PlatformError} from './lib/platform-auth.mjs';
import {companyContext} from './lib/company-contract.mjs';
import {liveConfiguration,liveOverview,createLiveCheckout,confirmLivePayment} from './lib/live-payments.mjs';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{
  const identity=await authenticate(req,false,{requireMembership:false}),config=liveConfiguration();
  if(req.method==='GET')return json(200,await liveOverview(identity.db,identity,config));
  const raw=await req.text();if(raw.length>4000)throw new PlatformError(413,'Pedido muito grande.');let input;try{input=JSON.parse(raw);}catch{throw new PlatformError(400,'Pedido inválido.');}
  if(!input||typeof input!=='object'||Array.isArray(input))throw new PlatformError(400,'Pedido inválido.');
  if(input.action==='create')return json(200,await createLiveCheckout({db:identity.db,identity,input,config,origin:new URL(req.url).origin}));
  if(input.action!=='verify'||typeof input.chargeId!=='string'||!/^live-[a-f0-9]{48}$/.test(input.chargeId))throw new PlatformError(400,'Pagamento inválido.');
  const company=await companyContext(identity.db,identity),charge=await identity.db.doc('plataforma_admin/billing/live_charges/'+input.chargeId).get();
  if(!charge.exists||charge.data().empresaId!==company.empresaId)throw new PlatformError(404,'Pagamento não encontrado nesta empresa.');
  return json(200,await confirmLivePayment({db:identity.db,config,chargeId:input.chargeId,paymentId:charge.data().paymentId}));
 }catch(error){return failure(error);}
}
