import test from 'node:test';
import assert from 'node:assert/strict';
import {calcularParcelasPromissoria} from '../public/promissoria-parcelas.mjs';

test('divide o total entre as parcelas sem perder centavos',()=>{
  assert.deepEqual(calcularParcelasPromissoria(['60','20','20'],10001),[6001,2000,2000]);
  assert.deepEqual(calcularParcelasPromissoria(['33,33','33,33','33,34'],100),[33,33,34]);
  const total=Number.MAX_SAFE_INTEGER;
  assert.equal(calcularParcelasPromissoria([60,20,20],total).reduce((soma,valor)=>soma+valor,0),total);
});

test('rejeita percentuais incompletos, soma diferente de 100 e parcelas sem valor',()=>{
  assert.throws(()=>calcularParcelasPromissoria(['60','20',''],10000));
  assert.throws(()=>calcularParcelasPromissoria([60,20,19],10000));
  assert.throws(()=>calcularParcelasPromissoria([60,20,20],2));
});
