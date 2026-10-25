import { authenticate, failure, json, PlatformError } from './lib/platform-auth.mjs';
import { redeemInvitation } from './lib/invitations.mjs';

export default async function handler(req){
  if(req.method!=='POST')return json(405,{error:'Método não permitido.'});
  try{
    const identity=await authenticate(req,false,{requireMembership:false});
    const text=await req.text();
    if(text.length>2000)throw new PlatformError(413,'Pedido muito grande.');
    let data;try{data=JSON.parse(text);}catch{throw new PlatformError(400,'Pedido inválido.');}
    const result=await redeemInvitation(identity.db,data?.token,identity,Date.now(),{name:data?.name});
    return json(200,{ok:true,...result,trialMode:'indefinite'});
  }catch(error){return failure(error);}
}
