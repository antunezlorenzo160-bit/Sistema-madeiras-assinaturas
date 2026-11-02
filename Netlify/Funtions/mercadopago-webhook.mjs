import {verifyWebhook,confirmTestPayment} from './lib/payment-confirmation.mjs';
import {serverDb,json,failure} from './lib/platform-auth.mjs';
export default async function handler(req){
 if(req.method!=='POST')return json(405,{error:'Método não permitido.'});
 try{
  const paymentId=verifyWebhook(req,process.env.MERCADO_PAGO_TEST_WEBHOOK_SECRET);
  const text=await req.text();if(text.length>16000)return json(413,{error:'Notificação muito grande.'});
  let body;try{body=JSON.parse(text);}catch{return json(400,{error:'Notificação inválida.'});}
  if(body.type!=='payment')return json(200,{ok:true,ignored:true});
  if(String(body.data?.id)!==paymentId)return json(400,{error:'Pagamento divergente.'});
  const result=await confirmTestPayment({db:serverDb(),paymentId,token:process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN});
  return json(200,result);
 }catch(error){
  if(error.supportCode){
   console.warn('mercadopago_webhook_rejected',{supportCode:error.supportCode});
   return json(error.status,{error:error.message,supportCode:error.supportCode});
  }
  return failure(error);
 }
}
