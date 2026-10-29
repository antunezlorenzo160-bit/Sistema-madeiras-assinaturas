import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { applyLinearServices } from '../scripts/linear-services.mjs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const tail=html.slice(html.indexOf('const TEMPLATE=')+15);
let end=1;for(;end<tail.length;end++){if(tail[end]==='\\'){end++;continue}if(tail[end]==='"'){end++;break}}
const app=applyLinearServices(JSON.parse(tail.slice(0,end)));
const context={};vm.createContext(context);
vm.runInContext(app.slice(app.indexOf('function cobrarServicosLinear('),app.indexOf('function atualizarDisponibilidadeLinear(')),context);
const bill=context.cobrarServicosLinear;
test('linear services add independent percentages to material and preserve quoted rates',()=>{
 const item={volume:6,preco:10,encaixe:true,friso:true,encaixePercentual:10,frisoPercentual:5};
 const x=bill(item);assert.equal(x.valorMaterial,60);assert.equal(x.valorEncaixe,6);assert.equal(x.valorFriso,3);assert.equal(x.valor,69);
 assert.equal(bill(x).valor,69);assert.equal(item.valor,undefined);
 assert.equal(bill({...item,encaixe:false}).valor,63);assert.equal(bill({...item,encaixe:false,friso:false}).valor,60);
});
test('legacy products have no service surcharge and no cubic rounding',()=>{
 const x=bill({comprimento:3.1,quantidade:2,preco:10});assert.equal(x.valor,62);assert.equal(x.comprimentoCobrado,3.1);assert.equal(x.compensarPerda,false);
});
test('services apply only to quotation/load and enabled product services',()=>{
 let destination='orcamento';const checks={chkEndireitamento:{checked:true},chkAplainamento:{checked:true}};
 const rule={encaixeAtivo:true,frisoAtivo:false,encaixePercentual:12,frisoPercentual:8};
 const c={document:{querySelector:()=>({value:destination})},$:id=>checks[id],regraLinearSelecionadaV381:()=>rule};vm.createContext(c);
 const start=app.indexOf('function selecionarServicosLinear('),end=app.indexOf('function aplicarCobrancaOrcamento(',start);vm.runInContext(app.slice(start,end),c);
 assert.equal(c.selecionarServicosLinear().encaixe,true);assert.equal(c.selecionarServicosLinear().friso,false);
 destination='estoque1';assert.equal(c.selecionarServicosLinear().encaixe,false);
 destination='carga';assert.equal(c.selecionarServicosLinear().encaixe,true);
});
test('build retains configuration, snapshots charges and separates grouped services',()=>{
 assert.ok(app.includes('encaixeAtivo:r?.encaixeAtivo===true'));
 assert.ok(app.includes('encaixePercentual:Number(row.querySelector'));
 assert.ok(app.includes('dados[servico+\'Ativo\']===true'));
 assert.ok(app.includes("x.encaixe?'ENC1':'ENC0'"));
 assert.ok(app.includes('Object.assign(item,cobrarServicosLinear'));
 assert.ok(app.includes("linear?' Encaixe ':' Endir. '"));
 assert.equal(applyLinearServices(app),app);
});
test('saved linear configuration survives normalization, while old products default off',()=>{
 const c={};vm.createContext(c);const start=app.indexOf('function normalizarMadeiras('),end=app.indexOf('madeiras=normalizarMadeiras(madeiras)',start);vm.runInContext(app.slice(start,end),c);
 const rule={tipo:'Ripa',precoVarejo:10,encaixeAtivo:true,encaixePercentual:12.5,frisoAtivo:false,frisoPercentual:4};
 const saved=JSON.parse(JSON.stringify([{id:'one',nome:'Pinus',tipoCadastro:'linear',regrasLinear:[rule]}]));
 const result=c.normalizarMadeiras(saved)[0].regrasLinear[0];assert.equal(result.encaixeAtivo,true);assert.equal(result.encaixePercentual,12.5);assert.equal(result.frisoAtivo,false);assert.equal(result.frisoPercentual,4);
 const legacy=c.normalizarMadeiras([{nome:'Pinus',tipoCadastro:'linear',regrasLinear:[{tipo:'Ripa',preco:10}]}])[0].regrasLinear[0];assert.equal(legacy.encaixeAtivo,false);assert.equal(legacy.frisoPercentual,0);
});
