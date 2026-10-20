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
test('invalid code cannot save an image',async()=>{const records=setup();assert.equal((await submit({code:'99999999'})).status,400);assert.equal(records.get(paths.order).assinaturaImagem,undefined);assert.equal(records.get(paths.invite).attempts,1);});
test('missing image cannot mark order signed',async()=>{const records=setup();assert.equal((await submit({signatureImage:undefined})).status,400);assert.equal(records.get(paths.invite).status,'pending');});
test('wrong token and undelivered orders cannot be signed',async()=>{const records=setup();assert.equal((await submit({token:'b'.repeat(43)})).status,404);records.set(paths.order,{status:'confirmado'});assert.equal((await submit({})).status,409);assert.equal(records.get(paths.order).assinaturaImagem,undefined);});
