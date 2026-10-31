import {authenticate,failure,json} from './lib/platform-auth.mjs';
import {companySession} from './lib/company-session.mjs';
export default async function handler(req){
 if(req.method!=='GET')return json(405,{error:'Método não permitido.'});
 try{const identity=await authenticate(req,false,{requireMembership:false});return json(200,await companySession(identity.db,identity));}
 catch(error){return failure(error);}
}
