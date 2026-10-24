import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const template = JSON.parse(html.match(/const TEMPLATE=(".*?");\nlet credentials/s)[1]);
const code = template.slice(template.indexOf('function numeroProd('), template.indexOf('function chaveUsoProducaoCalc('));
const calcular = new Function(code + ';return baixaCalculadaMaterial;')();
const pedido = (qtd = 3) => ({quantidade:qtd,espessura:2.5,largura:10,comprimento:3});
const sobra = (r,tipo) => r.sobras.find(s => s.tipo === tipo);
const area = (larg, comp, qtd) => larg * comp * qtd;
function conferirMaterial(r,larg,comp,qtd) {
  const produzida = area(r.req.larg,r.req.comp,r.produzidas);
  const sobras = r.sobras.filter(s=>s.tipo!=='excedente').reduce((a,s)=>a+area(s.largura,s.comprimento,s.quantidade),0);
  assert.ok(Math.abs(produzida+sobras-area(larg,comp,qtd))<1e-7);
}
test('wide wood with at least 50cm leftover: cut before ripping, preserving the full width at the end',()=>{
  const r=calcular(pedido(),'[1 × 2,5 × 35 × 3,75]');
  assert.deepEqual([sobra(r,'largura').quantidade,sobra(r,'largura').largura,sobra(r,'largura').comprimento],[1,5,3]);
  assert.deepEqual([sobra(r,'comprimento').quantidade,sobra(r,'comprimento').largura,sobra(r,'comprimento').comprimento],[1,35,0.75]);
  conferirMaterial(r,35,3.75,1);
});
test('narrow wood with less than one metre leftover: rip whole and then cut',()=>{
  const r=calcular(pedido(2),'[1 × 2.5 × 25 × 3.75]');
  assert.deepEqual([sobra(r,'largura').quantidade,sobra(r,'largura').comprimento],[1,3.75]);
  assert.deepEqual([sobra(r,'comprimento').quantidade,sobra(r,'comprimento').largura],[2,10]);
  conferirMaterial(r,25,3.75,1);
});
test('thresholds include exactly 30cm width and exactly 50cm length leftover',()=>{
  const r=calcular({...pedido(2),largura:12},'[1 × 2.5 × 30 × 3.5]');
  assert.equal(sobra(r,'largura').comprimento,3);
  assert.equal(sobra(r,'comprimento').largura,30);
  conferirMaterial(r,30,3.5,1);
  const below=calcular(pedido(),'[1 × 2.5 × 35 × 3.49]');
  assert.equal(sobra(below,'largura').comprimento,3.49);
  conferirMaterial(below,35,3.49,1);
});
test('narrow wood at one metre and repeated lengths preserve piece counts and volume',()=>{
  for(const [larg,comp,qtd] of [[25,4,2],[35,7,2],[25,6.75,2]]){
    const r=calcular(pedido(),`[${qtd} × 2.5 × ${larg} × ${comp}]`);
    conferirMaterial(r,larg,comp,qtd);
    assert.equal(r.atendidas,3);
    assert.equal(r.excedentes,r.produzidas-3);
    if(larg===25&&comp===4)assert.equal(sobra(r,'largura').comprimento,3);
    if(larg===25&&comp===6.75)assert.equal(sobra(r,'largura').quantidade,2);
  }
});
test('minimum leftover remains 5cm and non-fitting material produces no false scraps',()=>{
  assert.deepEqual(calcular(pedido(),'').sobras,[]);
  assert.deepEqual(calcular(pedido(),'[1 × 2.5 × 9 × 4]').sobras,[]);
  assert.deepEqual(calcular(pedido(),'[1 × 2.5 × 35 × 2]').sobras,[]);
  assert.equal(sobra(calcular(pedido(),'[1 × 2.5 × 34 × 3.04]'),'largura'),undefined);
});
