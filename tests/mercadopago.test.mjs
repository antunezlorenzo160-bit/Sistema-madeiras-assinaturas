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
