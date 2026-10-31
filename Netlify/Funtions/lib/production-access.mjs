import {randomUUID} from 'node:crypto';
import {employeeCan} from '../../../public/employee-permissions.mjs';
import {billingAccessRef,billingAccessState} from './billing-access.mjs';
import {PlatformError} from './platform.mjs';
const validId=x=>typeof x==='string'&&/^[-\w]{1,128}$/.test(x);
const root=id=>`empresas/${id}/dados/sm2_orcamentos_guardados/registros`;
export async function productionContext(db,identity,read=ref=>ref.get(),write=false,now=Date.now()){
 if(!identity.emailVerified)throw new PlatformError(403,'Confirme seu e-mail para acessar a produção.');
 const member=await read(db.doc('membros/'+identity.uid)),m=member.exists?member.data():null;
 if(m?.ativo!==true||!validId(m.empresaId)||!employeeCan(m,'production',write))throw new PlatformError(403,'Sua conta não tem permissão para '+(write?'alterar':'visualizar')+' a produção.');
 const policy=await read(billingAccessRef(db,m.empresaId)),access=billingAccessState(policy.exists?policy.data():null,now);
 if(!access.read||(write&&!access.write))throw new PlatformError(403,'O plano não permite esta ação. Consulte o responsável pela empresa.');
 return {empresaId:m.empresaId,member:m,access};
}
const text=(v,max=200)=>typeof v==='string'?v.slice(0,max):'';
const number=v=>Number.isFinite(Number(v))?Number(v):0;
export function productionItems(o){return Array.isArray(o.itens)?o.itens:Array.isArray(o.linhas)?o.linhas:Array.isArray(o.pecas)?o.pecas:Array.isArray(o.resumo)?o.resumo:[];}
function materialKey(item,index){return String(item.id||item.uid||item.key||`${item.especie||item.madeira||''}|${item.espessura||''}|${item.largura||''}|${item.comprimento||item.comp||''}|${item.quantidade||item.qtd||item.pecas||''}|${index}`);}
export function productionProjection(o,id){
 return {id,cliente:text(o.cliente||o.nomeCliente||o.clienteNome),dataEntrega:text(o.dataEntrega||o.entrega||o.dataPrevista,30),ordemFila:number(o.ordemFila||o.posicaoFila||o.ordem),urgencia:text(o.urgencia||'baixa',30),revision:number(o.atualizadoEm||o.criadoEm),producaoIniciadaEm:number(o.producaoIniciadaEm),producaoPausadaEm:number(o.producaoPausadaEm),producaoFinalizadaEm:number(o.producaoFinalizadaEm),producaoResponsavel:text(o.producaoResponsavel),observacaoProducao:text(o.observacaoProducao,2000),itens:productionItems(o).map((item,index)=>({index,madeira:text(item.especie||item.madeira),produto:text(item.produto||item.tipoLinear),tipoMedida:text(item.tipoMedida||item.tipoCadastro||'m3',20),quantidade:number(item.quantidade||item.qtd||item.pecas),pacotes:number(item.pacotes),espessura:number(item.espessura),largura:number(item.largura),comprimento:number(item.comprimento||item.comp),volume:number(item.volume),endireitamento:item.endireitamento===true,aplainamento:item.aplainamento===true,encaixe:item.encaixe===true,friso:item.friso===true,material:text(o.materiaisUsadosProducao?.[materialKey(item,index)],800)}))};
}
export async function listProduction(db,identity,now=Date.now()){
 const context=await productionContext(db,identity,undefined,false,now),snapshot=await db.collection(root(context.empresaId)).where('status','==','confirmado').limit(501).get();
 if(snapshot.docs.length>500)throw new PlatformError(409,'Há mais de 500 pedidos na fila. Peça ao administrador para revisar a fila.');
 const orders=snapshot.docs.map(d=>productionProjection(d.data(),d.id));orders.sort((a,b)=>a.dataEntrega.localeCompare(b.dataEntrega)||a.ordemFila-b.ordemFila);
 return {orders,canWrite:context.access.write&&employeeCan(context.member,'production',true)};
}
export async function updateProduction(db,identity,input,now=Date.now()){
 if(!validId(input.id)||!['start','pause','resume','finish','observation','material'].includes(input.action)||!Number.isSafeInteger(input.revision))throw new PlatformError(400,'Ação de produção inválida.');
 return db.runTransaction(async tx=>{
  const context=await productionContext(db,identity,ref=>tx.get(ref),true,now),ref=db.doc(root(context.empresaId)+'/'+input.id),snapshot=await tx.get(ref),o=snapshot.exists?snapshot.data():null;
  if(!o||o.status!=='confirmado')throw new PlatformError(409,'Pedido não está na fila de produção. Atualize a lista.');
  if(number(o.atualizadoEm||o.criadoEm)!==input.revision)throw new PlatformError(409,'O pedido foi atualizado por outra pessoa. Atualize a fila antes de salvar.');
  const patch={atualizadoEm:Math.max(now,number(o.atualizadoEm||o.criadoEm)+1)};
  if(['start','pause','resume','finish'].includes(input.action)){
   if(o.producaoFinalizadaEm)throw new PlatformError(409,'Produção já finalizada.');
   if(input.action==='start'){if(o.producaoIniciadaEm)throw new PlatformError(409,'Produção já iniciada.');Object.assign(patch,{producaoIniciadaEm:now,producaoPausadaEm:null,producaoStatus:'em_producao',producaoResponsavel:context.member.nome||identity.uid});}
   else if(!o.producaoIniciadaEm)throw new PlatformError(409,'Inicie a produção primeiro.');
   else if(input.action==='pause'){if(o.producaoPausadaEm)throw new PlatformError(409,'Produção já pausada.');Object.assign(patch,{producaoPausadaEm:now,producaoStatus:'pausado'});}
   else if(input.action==='resume'){if(!o.producaoPausadaEm)throw new PlatformError(409,'Produção não está pausada.');Object.assign(patch,{producaoPausadaEm:null,producaoRetomadaEm:now,producaoStatus:'em_producao'});}
   else{if(o.producaoPausadaEm)throw new PlatformError(409,'Retome a produção antes de finalizar.');Object.assign(patch,{producaoFinalizadaEm:now,producaoStatus:'pronto'});}
  }else if(input.action==='observation'){
   if(typeof input.text!=='string'||input.text.length>2000)throw new PlatformError(400,'Observação muito longa.');Object.assign(patch,{observacaoProducao:input.text.trim(),observacaoProducaoAtualizadaEm:now});
  }else{
   const items=productionItems(o);if(!Number.isInteger(input.index)||input.index<0||input.index>=items.length||typeof input.text!=='string'||input.text.length>800)throw new PlatformError(400,'Material inválido.');
   const materials=Object.assign(Object.create(null),o.materiaisUsadosProducao||{}),key=materialKey(items[input.index],input.index);if(input.text.trim())materials[key]=input.text.trim();else delete materials[key];patch.materiaisUsadosProducao=materials;
  }
  tx.update(ref,patch);tx.create(db.doc('plataforma_admin/audit/events/'+randomUUID()),{action:'production.'+input.action,uid:identity.uid,empresaId:context.empresaId,orderId:input.id,at:now});
  return {ok:true,order:productionProjection({...o,...patch},input.id)};
 });
}
