import {createHash} from 'node:crypto';
import expected from '../../../config/employee-rules.json' with {type:'json'};
import {PlatformError} from './platform.mjs';
export async function employeeRulesReady({accessToken,request=fetch}){
 const base='https://firebaserules.googleapis.com/v1/';
 const get=async path=>{const response=await request(base+path,{headers:{Authorization:'Bearer '+accessToken},signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('rules-unavailable');return response.json();};
 const release=await get('projects/estoque-madeiras-cc4d7/releases/cloud.firestore');
 if(typeof release.rulesetName!=='string'||!/^projects\/estoque-madeiras-cc4d7\/rulesets\/[-\w]+$/.test(release.rulesetName))return false;
 const rules=await get(release.rulesetName);
 const source=(rules.source?.files||[]).map(f=>f.content||'').join('\n');
 return createHash('sha256').update(source.replace(/\s/g,'')).digest('hex')===expected.sha256;
}
export async function requireEmployeeRules(options){let ready=false;try{ready=await employeeRulesReady(options);}catch{}if(!ready)throw new PlatformError(409,'Não foi possível confirmar a configuração de acesso dos funcionários. Atualize a lista e, se continuar, entre em contato com o suporte.');return true;}
