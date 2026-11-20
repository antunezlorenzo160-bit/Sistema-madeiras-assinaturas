import {authenticate,failure,json,PlatformError} from './lib/platform-auth.mjs';
import {prepareLogLabourV804,confirmLogLabourV804,receiveLogLabourV804,cancelLogLabourV804,listLogLabourV804} from './lib/log-labour.mjs';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{const identity=await authenticate(req,false,{requireMembership:false});
  if(req.method==='GET'){const url=new URL(req.url);return json(200,await listLogLabourV804(identity.db,identity,{from:url.searchParams.get('from'),to:url.searchParams.get('to')}));}
  const raw=await req.text();if(raw.length>120000)throw new PlatformError(413,'Serviço muito grande.');let input;try{input=JSON.parse(raw);}catch{throw new PlatformError(400,'Pedido inválido.');}
  const actions={prepare:prepareLogLabourV804,confirm:confirmLogLabourV804,receive:receiveLogLabourV804,cancel:cancelLogLabourV804};if(!input||Object.keys(input).some(k=>!['action','service'].includes(k))||!Object.hasOwn(actions,input.action))throw new PlatformError(400,'Ação inválida.');return json(200,await actions[input.action](identity.db,identity,input.service));
 }catch(error){return failure(error);}
}
