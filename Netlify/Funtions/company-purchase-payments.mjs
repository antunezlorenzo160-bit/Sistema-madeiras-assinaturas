import {authenticate,failure,json,PlatformError} from './lib/platform-auth.mjs';
import {listPurchaseAccounts,savePurchasePayment} from './lib/purchase-payments.mjs';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{const identity=await authenticate(req,false,{requireMembership:false});if(req.method==='GET'){const url=new URL(req.url);return json(200,await listPurchaseAccounts(identity.db,identity,{from:url.searchParams.get('from'),to:url.searchParams.get('to')}));}const raw=await req.text();if(raw.length>12000)throw new PlatformError(413,'Pedido muito grande.');let input;try{input=JSON.parse(raw);}catch{throw new PlatformError(400,'Pedido inválido.');}return json(200,await savePurchasePayment(identity.db,identity,input));}catch(e){return failure(e);}
}
