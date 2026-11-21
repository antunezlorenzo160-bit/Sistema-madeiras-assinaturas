import {authenticate,failure,json,PlatformError} from './lib/platform-auth.mjs';
import {getLoadTransport,saveLoadTransport} from './lib/load-transport.mjs';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{
  const identity=await authenticate(req,false,{requireMembership:false});
  if(req.method==='GET')return json(200,await getLoadTransport(identity.db,identity,new URL(req.url).searchParams.get('loadId')));
  const raw=await req.text();if(raw.length>4000)throw new PlatformError(413,'Pedido muito grande.');let input;try{input=JSON.parse(raw);}catch{throw new PlatformError(400,'Pedido inválido.');}
  return json(200,await saveLoadTransport(identity.db,identity,input));
 }catch(e){return failure(e);}
}
