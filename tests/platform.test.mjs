import test from 'node:test';
import assert from 'node:assert/strict';
import { isPlatformAdmin, validatePlan, validateWatermark } from '../Netlify/Funtions/lib/platform.mjs';

test('company admin claims never grant platform access; only configured owner with verified email does',()=>{
  const email='antunezlorenzo160@gmail.com';
  assert.equal(isPlatformAdmin({uid:'employee',email:'employee@example.com',email_verified:true,admin:true,role:'Administrador'},null,email),false);
  assert.equal(isPlatformAdmin({uid:'owner',email,email_verified:false},null,email),false);
  assert.equal(isPlatformAdmin({uid:'owner',email,email_verified:true},null,email),true);
  assert.equal(isPlatformAdmin({uid:'other',email,email_verified:true},'owner',email),false);
  assert.equal(isPlatformAdmin({uid:'owner'},'owner',email),true);
  assert.equal(isPlatformAdmin({uid:'first-login'},undefined,undefined),false);
});
test('plans use integer cents and known periods',()=>{
  assert.equal(validatePlan({name:' Mensal ',amountCents:9990,interval:'monthly'}).name,'Mensal');
  for(const amountCents of [-1,NaN,Infinity,1.1,'9990'])assert.throws(()=>validatePlan({name:'Plano',amountCents,interval:'monthly'}));
  assert.throws(()=>validatePlan({name:'Plano',amountCents:100,interval:'forever'}));
});
test('watermark validates ranges and rejects SVG and disguised images',()=>{
  assert.deepEqual(validateWatermark({widthMm:180,opacity:.04,image:''}),{widthMm:180,opacity:.04,image:''});
  assert.throws(()=>validateWatermark({widthMm:300,opacity:.04}));
  assert.throws(()=>validateWatermark({widthMm:180,opacity:0}));
  assert.throws(()=>validateWatermark({widthMm:180,opacity:.04,image:'data:image/svg+xml;base64,PHN2Zz4='}));
  assert.throws(()=>validateWatermark({widthMm:180,opacity:.04,image:'data:image/png;base64,PHNjcmlwdD4='}));
});
