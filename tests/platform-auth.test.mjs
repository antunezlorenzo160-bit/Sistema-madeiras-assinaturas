import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { isPlatformAdmin, PlatformError } from '../Netlify/Funtions/lib/platform.mjs';

test('server denies tenant admins and unverified owners before exposing platform data',async()=>{
  let identity, checks=0;
  const db={doc:()=>({get:async()=>({exists:true,data:()=>({ativo:true,empresaId:'empresa'})})})};
  const context=vm.createContext({isPlatformAdmin,PlatformError,OWNER_EMAIL:'antunezlorenzo160@gmail.com',Response,
    process:{env:{FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({project_id:'estoque-madeiras-cc4d7'})}},
    cert:x=>x,getApps:()=>[{}],initializeApp:()=>{},getFirestore:()=>db,
    getAuth:()=>({verifyIdToken:async(token,checkRevoked)=>{checks++;assert.equal(checkRevoked,undefined);return identity;}})});
  const source=readFileSync(new URL('../Netlify/Funtions/lib/platform-auth.mjs',import.meta.url),'utf8')
    .replace(/^import .*;\n/gm,'').replace(/^export \{.*\};\n/gm,'').replace(/export (async )?function /g,'$1function ');
  vm.runInContext(source,context);const authenticate=vm.runInContext('authenticate',context);
  await assert.rejects(authenticate(new Request('https://example.com')),{status:401});
  const request=new Request('https://example.com',{headers:{Authorization:'Bearer verified-token'}});
  identity={uid:'employee',email:'employee@example.com',email_verified:true,admin:true,role:'Administrador'};
  await assert.rejects(authenticate(request),{status:403});
  identity={uid:'owner',email:'antunezlorenzo160@gmail.com',email_verified:false};
  await assert.rejects(authenticate(request),{status:403});
  identity.email_verified=true;assert.equal((await authenticate(request)).db,db);
  assert.equal(checks,3);
});
