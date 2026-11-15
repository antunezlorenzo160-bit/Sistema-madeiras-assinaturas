import {authenticate,failure,json,PlatformError} from './lib/platform-auth.mjs';
import {readFiscalPreparation,saveFiscalPreparation} from './lib/fiscal-preparation.mjs';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{const identity=await authenticate(req,false,{requireMembership:false});if(req.method==='GET'){const q=new URL(req.url).searchParams;return json(200,await readFiscalPreparation(identity.db,identity,q.has('type')||q.has('id')?{source:{type:q.get('type'),id:q.get('id')},orderId:q.get('orderId')||null}:{}));}const raw=await req.text();if(raw.length>250000)throw new PlatformError(413,'Preparação fiscal muito grande.');let input;try{input=JSON.parse(raw);}catch{throw new PlatformError(400,'Pedido inválido.');}return json(200,await saveFiscalPreparation(identity.db,identity,input));}catch(e){return failure(e);}
}
