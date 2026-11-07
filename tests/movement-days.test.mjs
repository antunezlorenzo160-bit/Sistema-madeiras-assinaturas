import test from 'node:test';import assert from 'node:assert/strict';import {groupMovementDays} from '../public/movement-days.mjs';
const dayOf=x=>x.day;
test('daily entries and exits separated; transfers and adjustments not counted as external flow',()=>{
 const input=[{day:'2026-11-02',tipo:'entrada',volume:2},{day:'2026-11-02',tipo:'saida',volume:1},{day:'2026-11-02',tipo:'entrada',volume:5,transferencia:true},{day:'2026-11-02',tipo:'ajuste',volume:8}];
 const [g]=groupMovementDays(input,{dayOf});assert.equal(g.totals.entrada.m3,2);assert.equal(g.totals.saida.m3,1);assert.equal(g.transferencia.length,1);assert.equal(g.ajuste.length,1);assert.equal(input[0].volume,2);
});
test('date, direction and accented species filters apply without mixing units',()=>{
 const input=[{day:'2026-11-01',madeira:'Ipê',tipo:'entrada',volume:2},{day:'2026-11-03',madeira:'Ipê',tipo:'saida',volume:4,tipoCadastro:'m2'},{day:'2026-11-03',madeira:'Ipê',tipo:'saida',volume:3,tipoCadastro:'linear'}];
 const days=groupMovementDays(input,{dayOf,from:'2026-11-02',search:'ipe',kind:'saida'});assert.equal(days.length,1);assert.deepEqual(days[0].totals.saida,{m3:0,m2:4,linear:3});
});
