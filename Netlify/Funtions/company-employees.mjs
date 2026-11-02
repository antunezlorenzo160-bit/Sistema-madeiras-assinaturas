import {getApp} from 'firebase-admin/app';
import {employeeRulesReady,requireEmployeeRules} from './lib/employee-rules.mjs';
import {authenticate,failure,json,PlatformError} from './lib/platform-auth.mjs';
import {listEmployees,createEmployeeInvite,updateEmployee,cancelEmployeeInvite,redeemEmployeeInvite} from './lib/employees.mjs';
export default async function handler(req){
 if(!['GET','POST'].includes(req.method))return json(405,{error:'Método não permitido.'});
 try{
  const identity=await authenticate(req,false,{requireMembership:false});
  if(req.method==='GET'){const result=await listEmployees(identity.db,identity);let rulesReady=false;try{const token=await getApp().options.credential.getAccessToken();rulesReady=await employeeRulesReady({accessToken:token.access_token});}catch{}return json(200,{...result,rulesReady});}
  const text=await req.text();if(text.length>12000)throw new PlatformError(413,'Pedido muito grande.');
  let input;try{input=JSON.parse(text);}catch{throw new PlatformError(400,'Pedido inválido.');}
  if(!input||typeof input!=='object'||Array.isArray(input))throw new PlatformError(400,'Pedido inválido.');
  if(['invite.create','member.update'].includes(input.action)&&input.permissionSchema!==2)throw new PlatformError(409,'Atualize a página para carregar as permissões separadas de Orçamentos, Pedidos e Produção.');
  const actions={'invite.create':createEmployeeInvite,'member.update':updateEmployee,'invite.cancel':cancelEmployeeInvite,'invite.redeem':redeemEmployeeInvite};
  const action=Object.hasOwn(actions,input.action)?actions[input.action]:null;
  if(!action)throw new PlatformError(400,'Ação inválida.');
  if(['invite.create','invite.redeem','member.update'].includes(input.action)){const token=await getApp().options.credential.getAccessToken();await requireEmployeeRules({accessToken:token.access_token});}
  return json(200,await action(identity.db,identity,input));
 }catch(error){return failure(error);}
}
