import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {applyLinearCmdp} from '../scripts/linear-cmdp.mjs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');const tail=html.slice(html.indexOf('const TEMPLATE=')+15);let end=1;for(;end<tail.length;end++){if(tail[end]==='\\'){end++;continue}if(tail[end]==='"'){end++;break}}
const app=applyLinearCmdp(JSON.parse(tail.slice(0,end)));
const c={};vm.createContext(c);
// Use the same commercial-length rule used by the cubic mode.
const match=app.match(/function proximaMedidaComercial\([^\n]+/);vm.runInContext(match[0],c);
vm.runInContext(app.slice(app.indexOf('function cobrarServicosLinear('),app.indexOf('function selecionarServicosLinear(')),c);
const bill=c.cobrarServicosLinear;
test('CMDP rounds each piece before quantity and applies services to corrected material',()=>{
 const x=bill({comprimento:3.1,quantidade:2,preco:10,compensarPerda:true,encaixe:true,encaixePercentual:10});
 assert.equal(x.comprimento,3.1);assert.equal(x.comprimentoCobrado,3.5);assert.equal(x.volume,6.2);assert.equal(x.volumeReal,6.2);assert.equal(x.metrosCobrados,7);assert.equal(x.valorMaterial,70);assert.equal(x.valorEncaixe,7);assert.equal(x.valor,77);
 assert.equal(bill(x).valor,77);assert.equal(bill({...x,compensarPerda:false}).valor,68.2);
});
test('commercial lengths stay unchanged and old items remain without CMDP',()=>{
 assert.equal(bill({comprimento:3.5,quantidade:1,preco:10,compensarPerda:true}).valor,35);
 assert.equal(bill({comprimento:3.1,quantidade:1,preco:10}).valor,31);
 assert.equal(bill({comprimento:3.500001,quantidade:1,preco:10,compensarPerda:true}).comprimentoCobrado,4);
});
test('linear registration and budget toggle keep the selected CMDP setting',()=>{
 assert.ok(app.includes("$('campoCadCmdp').style.display=(m3||linear)"));assert.ok(app.includes("botaoOpcaoOrc(ids,'compensarPerda',x.compensarPerda===true,'CMDP')"));assert.equal(applyLinearCmdp(app),app);
});
