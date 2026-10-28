import { PlatformError } from './platform.mjs';

// This release only creates test checkouts. Production activation is separate.
export async function testCheckout({ token, amountCents, title, reference, returnUrl, notificationUrl, request = fetch }) {
  if (!token) throw new PlatformError(503,'Configure as credenciais de teste do Mercado Pago no servidor.');
  async function call(path, body) {
    const response = await request('https://api.mercadopago.com' + path, {
      method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(body?{'X-Idempotency-Key':reference}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new PlatformError(502,'O Mercado Pago não confirmou a operação de teste. Confira a configuração no provedor.');
    return response.json();
  }
  const seller = await call('/users/me');
  const testSeller = Array.isArray(seller.tags) && seller.tags.includes('test_user');
  if (!token.startsWith('TEST-') && !testSeller) throw new PlatformError(409,'Esta prévia aceita somente credenciais ou vendedores de teste.');
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 100000000) throw new PlatformError(400,'Valor de cobrança inválido.');
  const preference = await call('/checkout/preferences', {
    items:[{id:reference,title,currency_id:'BRL',quantity:1,unit_price:amountCents/100}],
    ...(notificationUrl?{notification_url:notificationUrl}:{}),
    external_reference:reference,back_urls:{success:returnUrl,pending:returnUrl,failure:returnUrl},
    // No payment types are excluded: available methods are selected by Mercado Pago.
  });
  const url = token.startsWith('TEST-') ? preference.sandbox_init_point : preference.init_point;
  let parsed; try { parsed = new URL(url); } catch { throw new PlatformError(502,'O provedor não retornou um checkout de teste válido.'); }
  if (parsed.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*mercadopago\.(com|com\.br)$/.test(parsed.hostname)) throw new PlatformError(502,'Endereço do checkout inválido.');
  return {url:parsed.href,preferenceId:String(preference.id),sellerId:String(seller.id),mode:'test'};
}

// Owner-only diagnostic: return identifiers and callback, never credentials or buyer data.
export async function inspectTestCheckout({db,chargeId,token,request=fetch}){
 if(typeof chargeId!=='string'||!/^[-A-Za-z0-9_]{1,120}$/.test(chargeId))throw new PlatformError(400,'Checkout inválido.');
 const snap=await db.doc(`plataforma_admin/billing/charges/${chargeId}`).get();
 if(!snap.exists||snap.data().mode!=='test')throw new PlatformError(404,'Checkout de teste não encontrado.');
 const charge=snap.data();
 if(!token)throw new PlatformError(503,'Credencial de teste não configurada.');
 const call=async path=>{
  const r=await request('https://api.mercadopago.com'+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new PlatformError(502,'Não foi possível conferir a configuração no Mercado Pago.');
  return r.json();
 };
 const seller=await call('/users/me');
 const testSeller=Array.isArray(seller.tags)&&seller.tags.includes('test_user');
 if(!token.startsWith('TEST-')&&!testSeller)throw new PlatformError(409,'Somente ambiente de teste permitido.');
 if(String(seller.id)!==String(charge.sellerId))throw new PlatformError(409,'A credencial atual pertence a outro vendedor.');
 const preference=await call('/checkout/preferences/'+encodeURIComponent(charge.preferenceId));
 if(String(preference.collector_id)!==String(seller.id)||preference.external_reference!==chargeId)throw new PlatformError(409,'A preferência não corresponde ao checkout salvo.');
 const callback=typeof preference.notification_url==='string'?preference.notification_url:'';
 let callbackUrl='';try{const u=new URL(callback);callbackUrl=u.origin+u.pathname;}catch{}
 return {sellerId:String(seller.id),testSeller,applicationId:String(preference.client_id||''),preferenceId:String(charge.preferenceId),notificationUrl:callbackUrl,hasNotificationUrl:Boolean(callbackUrl),createdAt:charge.createdAt||null};
}
