import {authenticate,json,failure,PlatformError} from './lib/platform-auth.mjs';
import {companyContractOverview,requestCompanyContract} from './lib/company-contract.mjs';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{
  const identity=await authenticate(req,false,{requireMembership:false});
  if(req.method==='GET')return json(200,await companyContractOverview(identity.db,identity));
  const text=await req.text();if(text.length>4000)throw new PlatformError(413,'Pedido muito grande.');
  let input;try{input=JSON.parse(text);}catch{throw new PlatformError(400,'Pedido inválido.');}
  return json(200,await requestCompanyContract(identity.db,identity,input));
 }catch(error){return failure(error);}
}
