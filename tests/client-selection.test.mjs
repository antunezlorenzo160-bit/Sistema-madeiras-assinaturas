import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const template=JSON.parse(index.match(/const TEMPLATE\s*=\s*("(?:\\.|[^"\\])*")/)[1]);
const script=[...template.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const camposClientesV492='));
const schema=script.split('\n').find(s=>s.startsWith('const camposClientesV492='));
const handler=script.split('\n').find(s=>s.startsWith("document.addEventListener('change',ev=>{const select=ev.target.closest('select[data-v407-cliente-select]')"));
assert(schema&&handler,'generated client selector exists');
function setup(line=handler){
 let listener;
 const fields=Object.fromEntries(['nome','documento','telefone','email','cep','logradouro','numero','complemento','bairro','cidade','uf','municipioIBGE','indicadorIE','paisCodigo','enderecoEntrega','inscricaoEstadual'].map(k=>[k,{value:'Anterior'}]));
 const status={textContent:''},form={dataset:{},querySelector:selector=>selector==='.v407-cliente-status'?status:fields[selector.match(/data-v407-campo="([^"]+)"/)?.[1]]};
 const customer={id:'cliente-a',nome:'Cliente <teste>',documento:'123',telefone:'456',uf:'SC',observacoes:'Interno',email:null};
 const context={document:{addEventListener(type,fn){assert.equal(type,'change');listener=fn;}},CSS:{escape:s=>s},listaClientesV492:()=>[customer]};
 vm.createContext(context);vm.runInContext(schema+'\n'+line,context);
 const select={value:'cliente-a',closest:()=>form};
 return {context,fields,form,status,customer,select,change:()=>listener({target:{closest:()=>select}})};
}
test('regression reproduces old out-of-scope reference without selecting or saving anything',()=>{
 const s=setup(handler.replace('for(const[k]of camposClientesV492)','for(const[k]of camposClienteV407)'));
 assert.throws(s.change,/camposClienteV407 is not defined/);assert.equal(s.fields.nome.value,'Anterior');assert.equal(s.form.dataset.pendente,undefined);
});
test('actual generated client selector fills only its own form and marks it pending without the private V407 schema',()=>{
 const s=setup();assert.equal(vm.runInContext('typeof camposClienteV407',s.context),'undefined');
 const before=JSON.stringify(s.customer);s.change();
 assert.equal(s.fields.nome.value,'Cliente <teste>');assert.equal(s.fields.documento.value,'123');assert.equal(s.fields.uf.value,'SC');assert.equal(s.fields.email.value,'');assert.equal(s.fields.cidade.value,'');
 assert.equal(s.form.dataset.pendente,'1');assert.match(s.status.textContent,/Salvar dados do cliente/);assert.equal(JSON.stringify(s.customer),before);
 // No save, stock or financial API exists in this environment; selecting must never call one.
});
test('an empty or stale selection leaves existing form data untouched',()=>{
 for(const id of ['', 'cliente-removido']){const s=setup();s.select.value=id;s.change();assert.equal(s.fields.nome.value,'Anterior');assert.equal(s.form.dataset.pendente,undefined);assert.equal(s.status.textContent,'');}
});
