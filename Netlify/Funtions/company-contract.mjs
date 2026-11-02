import {createCompanyTestCheckout,verifyCompanyTestCheckout} from './lib/company-checkout.mjs';
import {authenticate,json,failure,PlatformError} from './lib/platform-auth.mjs';
import {companyContractOverview,requestCompanyContract} from './lib/company-contract.mjs';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{
  const identity=await authenticate(req,false,{requireMembership:false});
  if(req.method==='GET')return json(200,await companyContractOverview(identity.db,identity));
  const text=await req.text();if(text.length>4000)throw new PlatformError(413,'Pedido muito grande.');
  let input;try{input=JSON.parse(text);}catch{throw new PlatformError(400,'Pedido inválido.');}
  if(!input||typeof input!=='object'||Array.isArray(input))throw new PlatformError(400,'Pedido inválido.');
  if(input.action==='checkout.create')return json(200,await createCompanyTestCheckout({db:identity.db,identity,input,base:new URL(req.url).origin,token:process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN,webhookSecret:process.env.MERCADO_PAGO_TEST_WEBHOOK_SECRET}));
  if(input.action==='checkout.verify')return json(200,await verifyCompanyTestCheckout({db:identity.db,identity,input,token:process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN}));
  if(input.action&&input.action!=='request.create')throw new PlatformError(400,'Ação inválida.');
  return json(200,await requestCompanyContract(identity.db,identity,input));
 }catch(error){return failure(error);}
}
