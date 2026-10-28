import test from 'node:test';
import assert from 'node:assert/strict';
import { testCheckout } from '../Netlify/Funtions/lib/mercadopago.mjs';

test('checkout fails closed without a test account or credential',async()=>{
  const options={amountCents:9900,title:'Plano',reference:'reference',returnUrl:'https://example.com/plataforma/'};
  await assert.rejects(testCheckout(options),/credenciais de teste/);
  let calls=0;
  await assert.rejects(testCheckout({...options,token:'APP_USR-live',request:async()=>{calls++;return {ok:true,json:async()=>({id:1,tags:[]})};}}),/somente credenciais/);
  assert.equal(calls,1); // Production seller never reaches preference creation.
});
test('checkout uses server plan amount and leaves available payment types unrestricted',async()=>{
  const calls=[];
  const result=await testCheckout({token:'APP_USR-test-seller',amountCents:9900,title:'Mensal',reference:'invoice-id',returnUrl:'https://example.com/plataforma/',
    request:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>calls.length===1?{id:123,tags:['test_user']}:{id:'pref',init_point:'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref'}};}});
  assert.equal(result.mode,'test');assert.equal(result.sellerId,'123');
  const preference=JSON.parse(calls[1].options.body);
  assert.equal(preference.items[0].unit_price,99);assert.equal(preference.items[0].currency_id,'BRL');
  assert.equal(preference.payment_methods,undefined);assert.equal(preference.external_reference,'invoice-id');
});

test('checkout diagnostic identifies the actual application and redacts callback parameters and buyer data',async()=>{
 const {inspectTestCheckout}=await import('../Netlify/Funtions/lib/mercadopago.mjs');
 const charge={mode:'test',sellerId:'123',preferenceId:'pref',createdAt:100};
 const db={doc:()=>({get:async()=>({exists:true,data:()=>charge})})};
 let calls=0;
 const request=async()=>({ok:true,json:async()=>++calls===1?{id:123,tags:['test_user']}:{collector_id:123,external_reference:'invoice',client_id:789,notification_url:'https://preview.example/.netlify/functions/hook?private=value',payer:{email:'private@example.com'}}});
 const result=await inspectTestCheckout({db,chargeId:'invoice',token:'APP_USR-test',request});
 assert.equal(result.applicationId,'789');assert.equal(result.sellerId,'123');assert.equal(result.notificationUrl,'https://preview.example/.netlify/functions/hook');
 assert(!JSON.stringify(result).includes('private'));assert(!JSON.stringify(result).includes('APP_USR'));
 await assert.rejects(inspectTestCheckout({db,chargeId:'invoice',token:'APP_USR-other',request:async()=>({ok:true,json:async()=>({id:999,tags:['test_user']})})}),/outro vendedor/);
});
