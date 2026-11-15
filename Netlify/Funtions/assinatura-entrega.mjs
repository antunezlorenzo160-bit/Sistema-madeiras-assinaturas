import {deliveryProjectionV765,deliveryDigestV765,createDeliveryReceiptV765,readDeliveryReceiptV765,deliveryReadContextV765} from './lib/delivery-receipt.mjs';
import { validateSignatureImage } from './assinatura-imagem.mjs';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const COLLECTION = 'sm2_entrega_assinaturas';
const TOKEN_INDEX = 'sm2_entrega_tokens';
const ORDER_COLLECTION = 'sm2_orcamentos_guardados';

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function services() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const secret = process.env.DELIVERY_SIGNATURE_SECRET;
  if (!raw || !secret || secret.length < 32) {
    throw new ApiError(503, 'Assinatura ainda não configurada no servidor.');
  }
  let serviceAccount;
  try { serviceAccount = JSON.parse(raw); }
  catch { throw new ApiError(503, 'A credencial segura do servidor está inválida.'); }
  if (serviceAccount.project_id !== 'estoque-madeiras-cc4d7') throw new ApiError(503, 'A credencial aponta para outro projeto Firebase.');
  if (!getApps().length) initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  return { auth: getAuth(), db: getFirestore(), key: createHash('sha256').update(secret).digest() };
}

function digest(value) { return createHash('sha256').update(value).digest('hex'); }
function seal(key, value) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
function unseal(key, value) {
  const raw = Buffer.from(value, 'base64url'), iv = raw.subarray(0, 12), tag = raw.subarray(12, 28), body = raw.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}
function json(statusCode, body) {
  return new Response(JSON.stringify(body), { status: statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function bodyOf(req) { return req.json().catch(() => { throw new ApiError(400, 'Pedido inválido.'); }); }
function refs(db, empresaId, orderId) {
  const inviteId = digest(`${empresaId}:${orderId}`);
  return {
    inviteId,
    order: db.doc(`empresas/${empresaId}/dados/${ORDER_COLLECTION}/registros/${orderId}`),
    invitation: db.doc(`empresas/${empresaId}/dados/${COLLECTION}/registros/${inviteId}`),
  };
}
async function authorizedCompany(auth, db, req) {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, 'Entre no sistema para registrar a entrega.');
  let decoded;
  try { decoded = await auth.verifyIdToken(match[1]); }
  catch { throw new ApiError(401, 'A sessão do funcionário expirou. Entre novamente.'); }
  const member = await db.doc(`membros/${decoded.uid}`).get();
  const data = member.data();
  if (!member.exists || data?.ativo !== true || typeof data?.empresaId !== 'string') {
    throw new ApiError(403, 'Usuário sem vínculo ativo com uma empresa.');
  }
  return { uid: decoded.uid, empresaId: data.empresaId };
}
async function createInvite({ db, key, uid, empresaId, orderId, siteUrl }) {
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(orderId)) throw new ApiError(400, 'Identificador do pedido inválido.');
  const { inviteId, order, invitation } = refs(db, empresaId, orderId);
  if (!siteUrl || !/^https:\/\//.test(siteUrl)) throw new ApiError(503, 'Endereço do site não configurado no servidor.');
  const tokenIndexCollection = db.collection(TOKEN_INDEX);
  const now = Date.now();
  const result = await db.runTransaction(async tx => {
    const [orderSnap, inviteSnap] = await Promise.all([tx.get(order), tx.get(invitation)]);
    if (!orderSnap.exists) throw new ApiError(404, 'Pedido não encontrado na empresa vinculada.');
    const current = orderSnap.data();
    if (!['confirmado', 'entregue'].includes(current.status)) throw new ApiError(409, 'Só é possível registrar a entrega de um pedido confirmado.');
    if (current.assinaturaStatus === 'assinado') throw new ApiError(409, 'Este pedido já foi assinado.');
    if (inviteSnap.exists && inviteSnap.data().status === 'signed') throw new ApiError(409, 'Este pedido já foi assinado.');
    if (inviteSnap.exists && inviteSnap.data().status === 'pending') {
      const inv = inviteSnap.data();
      const token = unseal(key, inv.tokenCipher);
      const tokenRef = tokenIndexCollection.doc(digest(token));
      const tokenSnap = await tx.get(tokenRef);
      if (!tokenSnap.exists) tx.set(tokenRef, { empresaId, inviteId, status: 'pending', createdAt: now });
      if (current.status !== 'entregue' || current.assinaturaStatus !== 'pendente') {
        tx.update(order, { status: 'entregue', entregueEm: Number(current.entregueEm || now), assinaturaStatus: 'pendente', assinaturaConviteId: inviteId, atualizadoEm: now });
      }
      return { token, entregueEm: Number(current.entregueEm || now) };
    }
    const token = randomBytes(32).toString('base64url');
    const tokenRef = tokenIndexCollection.doc(digest(token));
    tx.create(invitation, {
      orderId, empresaId, status: 'pending',
      tokenCipher: seal(key, token), attempts: 0,
      createdAt: now, createdBy: uid,
    });
    tx.create(tokenRef, { empresaId, inviteId, status: 'pending', createdAt: now });
    tx.update(order, { status: 'entregue', entregueEm: now, assinaturaStatus: 'pendente', assinaturaConviteId: inviteId, atualizadoEm: now });
    return { token, entregueEm: now };
  });
  return { link: `${siteUrl}/?assinar=${encodeURIComponent(result.token)}`, entregueEm: result.entregueEm };
}
export async function signDelivery({ db, token, recipientName, signatureImage, previewHash }) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) throw new ApiError(404, 'Link inválido ou já utilizado.');
  if (typeof recipientName !== 'string' || recipientName.trim().length < 2 || recipientName.trim().length > 120) throw new ApiError(400, 'Informe seu nome completo.');
  try { validateSignatureImage(signatureImage); }
  catch (error) { throw new ApiError(400, error.message); }
  const tokenHash = digest(token);
  const tokenRef = db.doc(`${TOKEN_INDEX}/${tokenHash}`);
  const tokenSnap = await tokenRef.get();
  if (!tokenSnap.exists) throw new ApiError(404, 'Link inválido ou já utilizado.');
  if(tokenSnap.data().receiptOnly===true)throw new ApiError(409,'Este link é apenas para consultar o comprovante.');
  const { empresaId, inviteId } = tokenSnap.data();
  if (typeof empresaId !== 'string' || typeof inviteId !== 'string') throw new ApiError(404, 'Link inválido ou já utilizado.');
  const inviteRef = db.doc(`empresas/${empresaId}/dados/${COLLECTION}/registros/${inviteId}`);
  const inviteSeed = await inviteRef.get();
  if (!inviteSeed.exists || inviteSeed.data().empresaId !== empresaId || typeof inviteSeed.data().orderId !== 'string') throw new ApiError(404, 'Link inválido ou já utilizado.');
  const orderRef = db.doc(`empresas/${empresaId}/dados/${ORDER_COLLECTION}/registros/${inviteSeed.data().orderId}`);
  const now = Date.now();
  const outcome = await db.runTransaction(async tx => {
    const [tokenCheck, inviteSnap] = await Promise.all([tx.get(tokenRef), tx.get(inviteRef)]);
    if (!tokenCheck.exists || !inviteSnap.exists) return { error: new ApiError(404, 'Link inválido ou já utilizado.') };
    const inv = inviteSnap.data();
    if (inv.status === 'signed') return { alreadySigned: true };
    if (inv.status !== 'pending') return { error: new ApiError(404, 'Link inválido ou já utilizado.') };
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists || orderSnap.data().status !== 'entregue') return { error: new ApiError(409, 'O pedido não está marcado como entregue.') };
    const profile=await tx.get(db.doc(`empresas/${empresaId}/dados/sm2_empresas_perfis_dev/registros/${empresaId}`));
    const pedido=deliveryProjectionV765(orderSnap.data(),profile.exists?profile.data():{});
    if(previewHash!==undefined&&previewHash!==deliveryDigestV765(pedido))return {error:new ApiError(409,'O pedido mudou. Toque em Recarregar pedido e confira novamente antes de assinar.')};
    let receiptV765;try{receiptV765=createDeliveryReceiptV765({orderId:inv.orderId,pedido,recipientName:recipientName.trim(),signatureImage,signedAt:now});}catch(e){return {error:new ApiError(409,e.message)};}
    tx.update(inviteRef, { status: 'signed', signedName: recipientName.trim(), signedAt: now, updatedAt: now,receiptV765 });
    tx.update(orderRef, { assinaturaStatus: 'assinado', assinadoPor: recipientName.trim(), assinadoEm: now, assinaturaCodigoVerificado: false, assinaturaMetodo: 'link_nome_assinatura', assinaturaImagem: signatureImage, atualizadoEm: now });
    tx.update(tokenRef, { status: 'signed', signedAt: now });
    return { alreadySigned: false };
  });
  if (outcome.error) throw outcome.error;
  return { ok: true, alreadySigned: Boolean(outcome.alreadySigned) };
}

export async function previewDelivery({db,token}){
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{40,60}$/.test(token))throw new ApiError(404,'Link inválido ou já utilizado.');
 const index=await db.doc(`${TOKEN_INDEX}/${digest(token)}`).get();
 if(!index.exists)throw new ApiError(404,'Link inválido ou já utilizado.');
 const {empresaId,inviteId}=index.data();
 if(typeof empresaId!=='string'||typeof inviteId!=='string')throw new ApiError(404,'Link inválido.');
 const convite=await db.doc(`empresas/${empresaId}/dados/${COLLECTION}/registros/${inviteId}`).get();
 const inv=convite.data();
 if(!convite.exists||inv.empresaId!==empresaId||typeof inv.orderId!=='string'||!['pending','signed'].includes(inv.status))throw new ApiError(404,'Link inválido ou já utilizado.');
 if(index.data().receiptOnly===true&&inv.status!=='signed')throw new ApiError(404,'Comprovante indisponível.');
 if(inv.status==='signed'&&inv.receiptV765){let receipt;try{receipt=readDeliveryReceiptV765(inv);}catch(e){throw new ApiError(409,e.message);}return {pedido:receipt.pedido,receipt,alreadySigned:true};}
 const registro=await db.doc(`empresas/${empresaId}/dados/${ORDER_COLLECTION}/registros/${inv.orderId}`).get();
 if(!registro.exists||registro.data().status!=='entregue')throw new ApiError(409,'O pedido não está marcado como entregue.');
 const profile=await db.doc(`empresas/${empresaId}/dados/sm2_empresas_perfis_dev/registros/${empresaId}`).get(),company=profile.exists?profile.data():{};
 if(inv.status==='signed'){let receipt;try{receipt=readDeliveryReceiptV765(inv,registro.data(),company);}catch(e){throw new ApiError(409,e.message);}return {pedido:receipt.pedido,receipt,alreadySigned:true};}
 const pedido=deliveryProjectionV765(registro.data(),company);return {pedido,previewHash:deliveryDigestV765(pedido),alreadySigned:false};
}


export async function receiptLinkV765({db,key,uid,orderId,siteUrl}){
 if(!/^[A-Za-z0-9_-]{1,180}$/.test(orderId||''))throw new ApiError(400,'Pedido inválido.');
 const initial=await deliveryReadContextV765(db,uid).catch(e=>{throw new ApiError(403,e.message);});
 const result=await db.runTransaction(async tx=>{
  const context=await deliveryReadContextV765(db,uid,r=>tx.get(r)).catch(e=>{throw new ApiError(403,e.message);});if(context.empresaId!==initial.empresaId)throw new ApiError(409,'A empresa mudou. Entre novamente.');
  const {invitation}=refs(db,context.empresaId,orderId),snap=await tx.get(invitation),inv=snap.exists?snap.data():null;
  if(!inv||inv.empresaId!==context.empresaId||inv.orderId!==orderId||inv.status!=='signed')throw new ApiError(409,'O pedido ainda não tem confirmação de assinatura.');
  let token=null;
  // Old invitations can have an absent cipher or a cipher from an earlier secret.
  // Keep all existing links untouched; a replacement can only read a signed receipt.
  for(const cipher of [inv.receiptTokenCipherV766,inv.tokenCipher]){
   let candidate;try{candidate=unseal(key,cipher);}catch{continue;}
   if(!/^[A-Za-z0-9_-]{40,60}$/.test(candidate))continue;
   const index=await tx.get(db.doc(`${TOKEN_INDEX}/${digest(candidate)}`));
   if(index.exists&&index.data().empresaId===context.empresaId&&index.data().inviteId===snap.id){token=candidate;break;}
  }
  if(!token){
   try{if(inv.receiptV765)readDeliveryReceiptV765(inv);else{
    const order=await tx.get(db.doc(`empresas/${context.empresaId}/dados/${ORDER_COLLECTION}/registros/${orderId}`));
    if(!order.exists||order.data().status!=='entregue')throw Error('Pedido assinado não disponível para conferência.');
    readDeliveryReceiptV765(inv,order.data());
   }}catch(e){throw new ApiError(409,e.message);}
   token=randomBytes(32).toString('base64url');
   tx.create(db.doc(`${TOKEN_INDEX}/${digest(token)}`),{empresaId:context.empresaId,inviteId:snap.id,status:'signed',receiptOnly:true,createdAt:Date.now(),createdBy:uid});
   tx.update(invitation,{receiptTokenCipherV766:seal(key,token)});
  }
  return {...context,link:siteUrl+'/?assinar='+encodeURIComponent(token)};
 });
 const fresh=await deliveryReadContextV765(db,uid).catch(e=>{throw new ApiError(403,e.message);});if(fresh.empresaId!==result.empresaId)throw new ApiError(409,'A empresa mudou.');return result;
}

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'Método não permitido.' });
  try {
    const input = await bodyOf(req);
    const { auth, db, key } = services();
    if (input.action === 'create') {
      const member = await authorizedCompany(auth, db, req);
      if (typeof input.orderId !== 'string') throw new ApiError(400, 'Pedido inválido.');
      return json(200, await createInvite({ db, key, uid: member.uid, empresaId: member.empresaId, orderId: input.orderId, siteUrl: new URL(req.url).origin }));
    }
    if(input.action==='receipt-link'){const member=await authorizedCompany(auth,db,req);return json(200,await receiptLinkV765({db,key,uid:member.uid,orderId:input.orderId,siteUrl:new URL(req.url).origin}));}
    if(input.action==='preview')return json(200,await previewDelivery({db,token:input.token}));
    if (input.action === 'sign') {
      return json(200, await signDelivery({ db, token: input.token, recipientName: input.recipientName, signatureImage: input.signatureImage,previewHash:input.previewHash }));
    }
    throw new ApiError(400, 'Ação inválida.');
  } catch (error) {
    const status = Number(error?.status) || 500;
    return json(status, { error: status === 500 ? 'Falha ao processar a assinatura. Tente novamente.' : error.message });
  }
}
