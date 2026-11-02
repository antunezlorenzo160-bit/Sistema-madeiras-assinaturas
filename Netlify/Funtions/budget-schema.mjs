import {resolveCompanyMemberRole} from './lib/company-session.mjs';
import {employeeCan} from '../../public/employee-permissions.mjs';
import {billingAccessRef,billingAccessState} from './lib/billing-access.mjs';
import {authenticate,failure,json,PlatformError} from './lib/platform-auth.mjs';
import {prepareBudgetSchema} from './lib/budget-schema.mjs';
import configuration from '../../config/budget-active.json' with {type:'json'};
const preparing=new Map();

export default async function handler(req){
  if(req.method!=='POST')return json(405,{error:'Método não permitido.'});
  try{
    const identity=await authenticate(req,false),{db,uid}=identity;
    if(configuration.enabled!==true)throw new PlatformError(503,'O filtro aguarda a publicação das regras compatíveis.');
    // Always derive the tenant from membership, including for platform owners.
    // No tenant or document ID supplied in a request is accepted.
    const member=await db.doc('membros/'+uid).get(),data=member.exists?member.data():null;
    if(data?.ativo!==true||typeof data.empresaId!=='string'||!/^[-A-Za-z0-9_]{1,120}$/.test(data.empresaId))throw new PlatformError(403,'Conta sem empresa ativa.');
    const company=await db.doc('empresas/'+data.empresaId).get(),permissionMember=resolveCompanyMemberRole(data,company.exists?company.data():null,identity).member;
    if(!employeeCan(permissionMember,'budgets'))throw new PlatformError(403,'Sem permissão para consultar orçamentos.');
    const policy=await billingAccessRef(db,data.empresaId).get(),access=billingAccessState(policy.exists?policy.data():null);
    if(!access.read)throw new PlatformError(403,'Acesse Configurações → Planos para renovar.');
    if(!access.write||!employeeCan(permissionMember,'budgets',true))return json(200,await prepareBudgetSchema(db,data.empresaId,uid,Date.now(),{readOnly:true}));
    if(!preparing.has(data.empresaId)){
      const promise=prepareBudgetSchema(db,data.empresaId,uid).finally(()=>preparing.delete(data.empresaId));
      preparing.set(data.empresaId,promise);
    }
    return json(200,await preparing.get(data.empresaId));
  }catch(error){return failure(error);}
}
