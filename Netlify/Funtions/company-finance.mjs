import {authenticate,failure,json,PlatformError} from './lib/platform-auth.mjs';
import {listFinanceEntries,saveFinanceEntry,cancelFinanceEntry} from './lib/company-finance.mjs';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{
  const identity=await authenticate(req,false,{requireMembership:false});
  if(req.method==='GET'){const query=new URL(req.url).searchParams;return json(200,await listFinanceEntries(identity.db,identity,{from:query.get('from'),to:query.get('to')}));}
  const raw=await req.text();if(raw.length>5000)throw new PlatformError(413,'Pedido muito grande.');
  let input;try{input=JSON.parse(raw);}catch{throw new PlatformError(400,'Pedido inválido.');}
  if(input?.action==='save')return json(200,await saveFinanceEntry(identity.db,identity,input.entry));
  if(input?.action==='cancel')return json(200,await cancelFinanceEntry(identity.db,identity,input.entry));
  throw new PlatformError(400,'Ação inválida.');
 }catch(e){return failure(e);}
}
