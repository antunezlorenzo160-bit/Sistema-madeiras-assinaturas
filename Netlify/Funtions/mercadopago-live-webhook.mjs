import {verifyWebhook} from './lib/payment-confirmation.mjs';
import {liveConfiguration,confirmLivePayment} from './lib/live-payments.mjs';
import {serverDb,json,failure} from './lib/platform-auth.mjs';
export default async function handler(req){
 if(req.method!=='POST')return json(405,{error:'Método não permitido.'});
 try{
  const config=liveConfiguration(),paymentId=verifyWebhook(req,config.secret),raw=await req.text();
  if(raw.length>16000)return json(413,{error:'Notificação muito grande.'});let body;try{body=JSON.parse(raw);}catch{return json(400,{error:'Notificação inválida.'});}
  if(body.type!=='payment')return json(200,{ok:true,ignored:true});
  if(String(body.data?.id)!==paymentId)return json(400,{error:'Pagamento divergente.'});
  return json(200,await confirmLivePayment({db:serverDb(),config,paymentId}));
 }catch(error){return failure(error);}
}
