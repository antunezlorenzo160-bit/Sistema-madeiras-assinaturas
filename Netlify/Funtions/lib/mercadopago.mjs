import { PlatformError } from './platform.mjs';

// This release only creates test checkouts. Production activation is separate.
export async function testCheckout({ token, amountCents, title, reference, returnUrl, request = fetch }) {
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
    external_reference:reference,back_urls:{success:returnUrl,pending:returnUrl,failure:returnUrl},
    // No payment types are excluded: available methods are selected by Mercado Pago.
  });
  const url = token.startsWith('TEST-') ? preference.sandbox_init_point : preference.init_point;
  let parsed; try { parsed = new URL(url); } catch { throw new PlatformError(502,'O provedor não retornou um checkout de teste válido.'); }
  if (parsed.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*mercadopago\.(com|com\.br)$/.test(parsed.hostname)) throw new PlatformError(502,'Endereço do checkout inválido.');
  return {url:parsed.href,preferenceId:String(preference.id),sellerId:String(seller.id),mode:'test'};
}
