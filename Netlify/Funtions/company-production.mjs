import {authenticate,json,failure,PlatformError} from './lib/platform-auth.mjs';
import {listProduction,updateProduction} from './lib/production-access.mjs';
import {requireEmployeeRules} from './lib/employee-rules.mjs';
import {getApp} from 'firebase-admin/app';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{
  const identity=await authenticate(req,false);
  // Refuse the new production workflow until Firestore also enforces the split.
  const token=await getApp().options.credential.getAccessToken();await requireEmployeeRules({accessToken:token.access_token});
  if(req.method==='GET')return json(200,await listProduction(identity.db,identity));
  const raw=await req.text();if(raw.length>5000)throw new PlatformError(413,'Pedido muito grande.');let input;try{input=JSON.parse(raw);}catch{throw new PlatformError(400,'Pedido inválido.');}
  if(!input||typeof input!=='object'||Array.isArray(input))throw new PlatformError(400,'Pedido inválido.');
  return json(200,await updateProduction(identity.db,identity,input));
 }catch(error){return failure(error);}
}
