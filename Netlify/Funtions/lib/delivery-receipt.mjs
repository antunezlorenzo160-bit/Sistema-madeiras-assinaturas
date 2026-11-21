import {createHash} from 'node:crypto';
import {employeeCan} from '../../../public/employee-permissions.mjs';
import {resolveCompanyMemberRole} from './company-session.mjs';
import {billingAccessRef,billingAccessState} from './billing-access.mjs';
const canonicalV765=value=>Array.isArray(value)?value.map(canonicalV765):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonicalV765(value[key])])):value;
export const deliveryDigestV765=value=>createHash('sha256').update(JSON.stringify(canonicalV765(value))).digest('hex');
const text=v=>String(v||'').slice(0,180),number=v=>Number.isFinite(Number(v))?Number(v):0;
export function deliveryProjectionV765(order,company={}){
 const itens=(Array.isArray(order.itens)?order.itens:[]).map(x=>({madeira:text(x.madeira||x.especie),produto:text(x.produto),tipoMedida:text(x.tipoMedida||'m3'),quantidade:number(x.quantidade),pacotes:number(x.pacotes)||(x.contadoComoPacote===true?1:0),largura:number(x.largura),espessura:number(x.espessura),comprimento:number(x.comprimento),volume:number(x.volume),valor:number(x.valor),endireitamento:x.endireitamento===true,aplainamento:x.aplainamento===true,linearTotalV744:x.linearTotalV744===true}));
 if(itens.length>400)throw Error('Pedido acima do limite de conferência.');
 const subtotal=itens.reduce((s,x)=>s+x.valor,0),desconto=subtotal*number(order.desconto)/100;
 return {empresa:{nome:text(company.nome||company.razaoSocial),cnpj:text(company.cnpj)},cliente:text(order.cliente),dataEntrega:text(order.dataEntrega),itens,subtotal,desconto,total:subtotal-desconto};
}
export function createDeliveryReceiptV765({orderId,pedido,recipientName,signatureImage,signedAt}){
 const content={schemaVersion:1,orderId,pedido,recipientName,signatureImage,signedAt};
 if(Buffer.byteLength(JSON.stringify(content),'utf8')>600000)throw Error('Pedido muito grande para preservar o comprovante.');
 return {...content,hash:deliveryDigestV765(content)};
}
export function readDeliveryReceiptV765(invitation,currentOrder=null,currentCompany={}){
 if(invitation.status!=='signed')throw Error('O pedido ainda não foi assinado.');
 if(invitation.receiptV765){const {hash,...content}=invitation.receiptV765;if(hash!==deliveryDigestV765(content))throw Error('Não foi possível conferir o comprovante.');return {...content,hash,preservedAtSignature:true};}
 if(!currentOrder||currentOrder.assinaturaStatus!=='assinado'||typeof currentOrder.assinaturaImagem!=='string'||currentOrder.assinaturaImagem.length>250000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(currentOrder.assinaturaImagem))throw Error('Comprovante antigo sem assinatura disponível.');
 return {schemaVersion:0,orderId:invitation.orderId,pedido:deliveryProjectionV765(currentOrder,currentCompany),recipientName:text(invitation.signedName),signedAt:number(invitation.signedAt),signatureImage:currentOrder.assinaturaImagem,preservedAtSignature:false};
}
export async function deliveryReadContextV765(db,uid,read=ref=>ref.get(),now=Date.now()){
 const snap=await read(db.doc('membros/'+uid)),member=snap.exists?snap.data():null;
 if(member?.ativo!==true||!/^[-\w]{1,120}$/.test(member.empresaId||''))throw Error('Usuário sem empresa ativa.');
 const company=await read(db.doc('empresas/'+member.empresaId)),resolved=resolveCompanyMemberRole(member,company.exists?company.data():null,{uid});
 if(!employeeCan(resolved.member,'orders'))throw Error('Sua conta não tem acesso aos pedidos.');
 const policy=await read(billingAccessRef(db,member.empresaId)),access=billingAccessState(policy.exists?policy.data():null,now);if(!access.read)throw Error('O plano não permite consultar pedidos.');
 return {uid,empresaId:member.empresaId};
}
