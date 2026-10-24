import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
// Exercise the real handler with in-memory Firestore and auth services only.
let source=readFileSync(new URL('../Netlify/Funtions/assinatura-entrega.mjs',import.meta.url),'utf8');
source=source.replace("'./assinatura-imagem.mjs'",JSON.stringify(new URL('../Netlify/Funtions/assinatura-imagem.mjs',import.meta.url).href));
source=source.replace(/^import .* from 'firebase-admin\/.*';\n/gm,'');
source=source.replace(/function services\(\) \{[\s\S]*?\n\}\n\nfunction digest/, 'function services(){return globalThis.signatureTestServices;}\n\nfunction digest');
const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const fixture=JSON.parse(readFileSync(new URL('fixtures/assinatura-teste.json',import.meta.url),'utf8'));
const token='a'.repeat(43), inviteId='invite', key=Buffer.alloc(32,7);
const hash=s=>createHash('sha256').update(s).digest('hex');
const paths={token:'sm2_entrega_tokens/'+hash(token),invite:'empresas/company/dados/sm2_entrega_assinaturas/registros/invite',order:'empresas/company/dados/sm2_orcamentos_guardados/registros/order'};
function setup(){
 const records=new Map([[paths.token,{empresaId:'company',inviteId,status:'pending'}],[paths.invite,{empresaId:'company',orderId:'order',status:'pending',codeHash:createHmac('sha256',key).update('invite:12345678').digest('hex')}],[paths.order,{status:'entregue'}]]);
 const snap=path=>({exists:records.has(path),data:()=>records.get(path)});
 const db={doc:path=>({path,get:async()=>snap(path)}),runTransaction:async fn=>{
  const changes=[];const result=await fn({get:async ref=>snap(ref.path),update:(ref,data)=>changes.push([ref.path,data])});
  for(const [path,data]of changes)records.set(path,{...records.get(path),...data});return result;
 }};
 globalThis.signatureTestServices={db,key,auth:{}};return records;
}
const submit=async overrides=>handler(new Request('http://local.test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...fixture,...overrides})}));
test('saves image, name and timestamp together in the correct order; prevents overwrite',async()=>{
 const records=setup();const response=await submit({});assert.equal(response.status,200);
 const order=records.get(paths.order);assert.equal(order.assinaturaImagem,fixture.signatureImage);assert.equal(order.assinaturaStatus,'assinado');assert.equal(order.assinadoPor,fixture.recipientName);assert.ok(order.assinadoEm>0);
 const again=await submit({recipientName:'Outro recebedor'});assert.equal((await again.json()).alreadySigned,true);assert.equal(records.get(paths.order).assinadoPor,fixture.recipientName);
});
test('name and drawn signature work without a separate code, including existing invitations',async()=>{const records=setup();assert.equal((await submit({code:undefined})).status,200);assert.equal(records.get(paths.order).assinaturaCodigoVerificado,false);assert.equal(records.get(paths.order).assinaturaMetodo,'link_nome_assinatura');});
test('missing image cannot mark order signed',async()=>{const records=setup();assert.equal((await submit({signatureImage:undefined})).status,400);assert.equal(records.get(paths.invite).status,'pending');});
test('wrong token and undelivered orders cannot be signed',async()=>{const records=setup();assert.equal((await submit({token:'b'.repeat(43)})).status,404);records.set(paths.order,{status:'confirmado'});assert.equal((await submit({})).status,409);assert.equal(records.get(paths.order).assinaturaImagem,undefined);});

test('new and reopened invitations stay on the request site instead of the production URL',async()=>{
 const records=new Map([
  ['membros/employee',{ativo:true,empresaId:'company'}],
  ['empresas/company/dados/sm2_orcamentos_guardados/registros/order',{status:'confirmado'}],
 ]);
 const snap=path=>({exists:records.has(path),data:()=>records.get(path)});
 const db={doc:path=>({path,get:async()=>snap(path)}),collection:path=>({doc:id=>({path:path+'/'+id})}),runTransaction:async fn=>{
  const changes=[];
  const tx={get:async ref=>snap(ref.path),create:(ref,data)=>{assert.equal(records.has(ref.path),false);changes.push([ref.path,data]);},set:(ref,data)=>changes.push([ref.path,data]),update:(ref,data)=>changes.push([ref.path,{...records.get(ref.path),...data}])};
  const result=await fn(tx);for(const [path,data]of changes)records.set(path,data);return result;
 }};
 globalThis.signatureTestServices={db,key,auth:{verifyIdToken:async()=>({uid:'employee'})}};
 const previousUrl=process.env.URL, previousPrimeUrl=process.env.DEPLOY_PRIME_URL;
 process.env.URL='https://production.example';process.env.DEPLOY_PRIME_URL='https://production.example';
 try{
  const create=async origin=>{
   const r=await handler(new Request(origin+'/.netlify/functions/assinatura-entrega',{method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body:JSON.stringify({action:'create',orderId:'order'})}));
   assert.equal(r.status,200);return r.json();
  };
  const first=await create('https://deploy-preview-1--example.netlify.app');
  const reopened=await create('https://deploy-preview-1--example.netlify.app');
  assert.equal(new URL(first.link).origin,'https://deploy-preview-1--example.netlify.app');
  assert.equal(reopened.link,first.link);assert.equal('code' in reopened,false);assert.equal('code' in first,false);
  const production=await create('https://production.example');
  assert.equal(new URL(production.link).origin,'https://production.example');
  assert.equal(new URL(production.link).search,new URL(first.link).search);
 }finally{
  if(previousUrl===undefined)delete process.env.URL;else process.env.URL=previousUrl;
  if(previousPrimeUrl===undefined)delete process.env.DEPLOY_PRIME_URL;else process.env.DEPLOY_PRIME_URL=previousPrimeUrl;
 }
});

test('preview uses only the token-bound order and returns selected customer-facing fields',async()=>{
 const records=setup();records.set(paths.order,{status:'entregue',cliente:'Cliente',telefone:'private',desconto:10,itens:[{madeira:'Pinus',tipoMedida:'m2',quantidade:6,contadoComoPacote:true,volume:1.8,valor:100,custo:25}],segredo:'internal'});
 const r=await submit({action:'preview',token,orderId:'other'});assert.equal(r.status,200);const data=await r.json();
 assert.equal(data.pedido.cliente,'Cliente');assert.equal(data.pedido.total,90);assert.equal(data.pedido.itens[0].pacotes,1);
 assert.equal('telefone' in data.pedido,false);assert.equal('custo' in data.pedido.itens[0],false);assert.equal('segredo' in data.pedido,false);
 assert.equal((await submit({action:'preview',token:'b'.repeat(43)})).status,404);
 records.set(paths.invite,{...records.get(paths.invite),empresaId:'other'});assert.equal((await submit({action:'preview'})).status,404);
});
