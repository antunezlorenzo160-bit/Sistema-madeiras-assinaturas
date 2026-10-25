import {authenticate,failure,json,PlatformError} from './lib/platform-auth.mjs';
import {prepareBudgetSchema} from './lib/budget-schema.mjs';
import configuration from '../../config/budget-active.json' with {type:'json'};
const preparing=new Map();

export default async function handler(req){
  if(req.method!=='POST')return json(405,{error:'Método não permitido.'});
  try{
    const {db,uid}=await authenticate(req,false);
    if(configuration.enabled!==true)throw new PlatformError(503,'O filtro aguarda a publicação das regras compatíveis.');
    // Always derive the tenant from membership, including for platform owners.
    // No tenant or document ID supplied in a request is accepted.
    const member=await db.doc('membros/'+uid).get(),data=member.exists?member.data():null;
    if(data?.ativo!==true||typeof data.empresaId!=='string'||!/^[-A-Za-z0-9_]{1,120}$/.test(data.empresaId))throw new PlatformError(403,'Conta sem empresa ativa.');
    if(!preparing.has(data.empresaId)){
      const promise=prepareBudgetSchema(db,data.empresaId,uid).finally(()=>preparing.delete(data.empresaId));
      preparing.set(data.empresaId,promise);
    }
    return json(200,await preparing.get(data.empresaId));
  }catch(error){return failure(error);}
}
