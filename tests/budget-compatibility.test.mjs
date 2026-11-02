import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildBudgetCompatibility} from '../scripts/build-budget-compatibility.mjs';

const source=readFileSync(new URL('../ui/budget-records.js',import.meta.url),'utf8');
const context=vm.createContext({empresaV456:'test-company'});vm.runInContext(source,context);
const normalize=vm.runInContext('normalizarRegistroOrcamentoV703',context);
const ref={path:'empresas/test-company/dados/sm2_orcamento_itens/registros/item'};
test('full active and excluded records use an explicit boolean without mutating inputs',()=>{
 const original={id:'item',quantidade:3,preco:123};const result=normalize(ref,original);
 assert.equal(result.excluido,false);assert.equal(original.excluido,undefined);assert.equal(result.quantidade,3);assert.equal(result.preco,123);
 assert.equal(normalize(ref,{excluido:true}).excluido,true);
 assert.equal(normalize(ref,{excluido:null}).excluido,false);
});
test('merges cannot resurrect excluded records and other collections or tenants remain unchanged',()=>{
 const patch={quantidade:4};assert.equal(normalize(ref,patch,{merge:true}),patch);assert.equal(normalize(ref,patch,{mergeFields:['quantidade']}),patch);
 assert.equal(normalize(ref,{excluido:true},{merge:true}).excluido,true);
 const stock={path:ref.path.replace('sm2_orcamento_itens','sm2_estoque1')};assert.equal(normalize(stock,patch),patch);
 const other={path:ref.path.replace('test-company','other-company')};assert.equal(normalize(other,patch),patch);
});
test('build is idempotent and applies normalization to online, queued and batch writes without filtering legacy items',()=>{
 const dir=mkdtempSync(join(tmpdir(),'budget-compatible-')),file=join(dir,'index.html');
 try{
  copyFileSync(new URL('../public/index.html',import.meta.url),file);buildBudgetCompatibility(file);const html=readFileSync(file,'utf8');buildBudgetCompatibility(file);assert.equal(readFileSync(file,'utf8'),html);
  assert(html.includes('BUDGET_COMPATIBILITY_V703'));
  assert(html.includes('set(ref,dados,opcoes){dados=normalizarRegistroOrcamentoV703'));
  if(html.includes('BUDGET_ACTIVE_V704'))assert(/FILTRO_ORCAMENTO_V704=(?:true|false)/.test(html));
  else assert(!html.includes('where(\'excluido\''));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
