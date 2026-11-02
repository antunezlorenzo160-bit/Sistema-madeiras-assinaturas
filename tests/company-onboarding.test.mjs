import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync,copyFileSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCompanyOnboarding } from '../scripts/build-company-onboarding.mjs';
test('company access uses verified membership and retains unauthenticated and cross-company probes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'company-access-')),file=join(dir,'index.html');
 try{
  copyFileSync(new URL('../public/index.html',import.meta.url),file);buildCompanyOnboarding(file);
  const first=readFileSync(file,'utf8');buildCompanyOnboarding(file);assert.equal(readFileSync(file,'utf8'),first);
  const start=first.indexOf('const TEMPLATE=')+15;let end=start+1;for(;end<first.length;end++){if(first[end]==='\\'){end++;continue;}if(first[end]==='"'){end++;break;}}
  const app=JSON.parse(first.slice(start,end)),outer=first.slice(end);
  assert(!app.includes("ctx.empresaId!=='mdeiras-oeste-pkwj3e'"));
  assert(outer.includes('const empresaId=m.data().empresaId;expected[uid]=empresaId;'));
  assert(outer.includes("'dados da empresa sem login'"));assert(outer.includes("'empresa diferente'"));
  const valid=outer.match(/function empresaValidaV702\(value\)\{[^\n]+\}/)[0];const context=vm.createContext({});vm.runInContext(valid,context);
  assert.equal(vm.runInContext("empresaValidaV702('empresa-nova')",context),true);assert.equal(vm.runInContext("empresaValidaV702('../outra')",context),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
