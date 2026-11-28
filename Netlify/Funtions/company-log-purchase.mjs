import {authenticate,failure,json,PlatformError} from './lib/platform-auth.mjs';
import {confirmLogPurchase,cancelLogPurchase,listLogPurchases} from './lib/log-purchase.mjs';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{
  const identity=await authenticate(req,false,{requireMembership:false});
  if(req.method==='GET'){const url=new URL(req.url);return json(200,await listLogPurchases(identity.db,identity,{from:url.searchParams.get('from'),to:url.searchParams.get('to')}));}
  const raw=await req.text();if(raw.length>120000)throw new PlatformError(413,'Compra muito grande.');let input;try{input=JSON.parse(raw);}catch{throw new PlatformError(400,'Pedido inválido.');}
  if(!input||Object.keys(input).some(k=>!['action','purchase'].includes(k))||!['confirm','cancel'].includes(input.action))throw new PlatformError(400,'Ação inválida.');
  return json(200,await (input.action==='confirm'?confirmLogPurchase:cancelLogPurchase)(identity.db,identity,input.purchase));
 }catch(e){return failure(e);}
}
