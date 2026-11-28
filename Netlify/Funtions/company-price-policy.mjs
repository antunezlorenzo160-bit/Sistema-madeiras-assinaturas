import {authenticate,failure,json,PlatformError} from './lib/platform-auth.mjs';
import {employeeOwnerContext} from './lib/employees.mjs';
import {normalizePricePolicy} from '../../public/document-pricing.mjs';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{
  const identity=await authenticate(req,false,{requireMembership:false});
  if(!identity.emailVerified)throw new PlatformError(403,'Confirme seu e-mail.');
  const member=await identity.db.doc('membros/'+identity.uid).get(),m=member.exists?member.data():null;
  if(m?.ativo!==true||!/^[-\w]{1,128}$/.test(m.empresaId||''))throw new PlatformError(403,'Conta sem empresa ativa.');
  const ref=identity.db.doc('empresas/'+m.empresaId+'/configuracao/precos');
  if(req.method==='GET'){const saved=await ref.get();return json(200,{policy:normalizePricePolicy(saved.exists?saved.data():{})});}
  const context=await employeeOwnerContext(identity.db,identity,undefined,true);
  const body=await req.text();if(body.length>1500)throw new PlatformError(413,'Pedido muito grande.');
  let input;try{input=JSON.parse(body);}catch{throw new PlatformError(400,'Pedido inválido.');}
  let policy;try{policy=normalizePricePolicy(input);}catch(e){throw new PlatformError(400,e.message);}
  await identity.db.runTransaction(async tx=>{
   const latest=await employeeOwnerContext(identity.db,identity,r=>tx.get(r),true);
   if(latest.empresaId!==m.empresaId)throw new PlatformError(409,'O vínculo da conta mudou. Atualize a página.');
   const previous=await tx.get(ref);if(Number(previous.data()?.revision||0)!==Number(input.revision||0))throw new PlatformError(409,'Configuração alterada em outro aparelho. Atualize antes de salvar.');
   policy={...policy,revision:Number(previous.data()?.revision||0)+1};
   tx.set(ref,{...policy,updatedAt:Date.now(),updatedBy:context.ownerUid});
  });
  return json(200,{policy});
 }catch(error){return failure(error);}
}
