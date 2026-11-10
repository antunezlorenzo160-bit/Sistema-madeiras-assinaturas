import {authenticate,failure,json,PlatformError} from './lib/platform-auth.mjs';
import {listSharedTrips,sharedTripReport,saveSharedTrip} from './lib/shared-trips.mjs';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{const identity=await authenticate(req,false,{requireMembership:false});
  if(req.method==='GET'){const q=new URL(req.url).searchParams;return json(200,q.get('id')?await sharedTripReport(identity.db,identity,q.get('id')):await listSharedTrips(identity.db,identity,{from:q.get('from'),to:q.get('to')}));}
  const raw=await req.text();if(raw.length>16000)throw new PlatformError(413,'Pedido muito grande.');let input;try{input=JSON.parse(raw);}catch{throw new PlatformError(400,'Pedido inválido.');}
  return json(200,await saveSharedTrip(identity.db,identity,input));
 }catch(e){return failure(e);}
}
