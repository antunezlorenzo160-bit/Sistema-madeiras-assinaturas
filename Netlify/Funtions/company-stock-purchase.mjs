import {authenticate,failure,json,PlatformError} from './lib/platform-auth.mjs';
import {confirmStockPurchase} from './lib/stock-purchase.mjs';
export default async function handler(req){
 if(req.method!=='POST')return json(405,{error:'Método não permitido.'});
 try{const identity=await authenticate(req,false,{requireMembership:false}),raw=await req.text();if(raw.length>120000)throw new PlatformError(413,'Pedido muito grande.');let input;try{input=JSON.parse(raw);}catch{throw new PlatformError(400,'Pedido inválido.');}return json(200,await confirmStockPurchase(identity.db,identity,input));}catch(e){return failure(e);}
}
