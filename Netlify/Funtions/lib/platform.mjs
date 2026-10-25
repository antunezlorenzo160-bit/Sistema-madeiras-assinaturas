export const METHODS = Object.freeze(['pix', 'boleto', 'credit_card', 'debit_card', 'bank_transfer', 'wallet']);
export class PlatformError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function platformFailure(error, {ownerAuthorized=false}={}) {
  if (error instanceof PlatformError) return {status:error.status,body:{error:error.message}};
  const code=String(error.code ?? '').toLowerCase();
  let message='O servidor encontrou uma falha ao carregar a plataforma.',supportCode='PLATFORM_INTERNAL';
  if (['7','permission-denied','permission_denied'].includes(code)) {
    message='O servidor não tem permissão para acessar os dados da plataforma no Firebase. É preciso revisar a permissão da conta de serviço.';
    supportCode='FIRESTORE_PERMISSION_DENIED';
  } else if (['16','unauthenticated'].includes(code) || code.includes('invalid-credential') || code.includes('service-account')) {
    message='A credencial do servidor não foi aceita pelo Firebase. É preciso revisar a conta de serviço no Netlify.';
    supportCode='FIREBASE_SERVER_CREDENTIAL';
  } else if (['9','failed-precondition','failed_precondition'].includes(code)) {
    message='O Firebase informou que falta uma configuração do banco para carregar a plataforma.';
    supportCode='FIRESTORE_CONFIGURATION';
  } else if (['4','14','deadline-exceeded','unavailable'].includes(code)) {
    message='O servidor não conseguiu alcançar o Firebase. Tente novamente em alguns instantes.';
    supportCode='FIRESTORE_UNAVAILABLE';
  } else if (code.startsWith('app/')) {
    message='A inicialização do servidor Firebase falhou. É preciso revisar a configuração no Netlify.';
    supportCode='FIREBASE_INITIALIZATION';
  }
  const stages={configuration:'configuração do servidor',authentication:'verificação da conta',plans:'leitura dos planos',companies:'leitura das empresas',subscriptions:'leitura das assinaturas',watermark:'leitura da marca d’água',charges:'leitura das cobranças',operation:'gravação dos dados'};
  const stage=stages[error.stage];
  let diagnostic='';
  if(ownerAuthorized && supportCode==='PLATFORM_INTERNAL') {
    const raw=String(error.details || error.message || error.name || 'Erro sem detalhe');
    const safe=/private[_ -]?key|client_secret|access_token|refresh_token|-----BEGIN|assertion=/i.test(raw)
      ? 'Detalhe protegido. Verifique o registro da função no Netlify.'
      : raw.replace(/Bearer\s+\S+/gi,'Bearer [oculto]').replace(/[A-Za-z0-9_+\/-]{48,}={0,2}/g,'[oculto]').slice(0,260);
    const nativeCode=/^[A-Za-z0-9_./-]{1,64}$/.test(String(error.code??''))?String(error.code):'sem código';
    diagnostic=(error.name==='TypeError'?'TypeError / ':'')+nativeCode+': '+safe;
  }
  return {status:supportCode==='PLATFORM_INTERNAL'?500:503,body:{error:message+' Código: '+supportCode+(stage?' • '+stage:'')+(diagnostic?' • Diagnóstico: '+diagnostic:''),supportCode,...(stage?{stage}:{})}};
}
export function isPlatformAdmin(decoded, configuredUid, ownerEmail) {
  if (configuredUid) return decoded?.uid === configuredUid;
  return Boolean(ownerEmail && decoded?.email_verified === true &&
    typeof decoded.email === 'string' && decoded.email.toLowerCase() === ownerEmail.toLowerCase());
}
export function validatePlan(input) {
  if (typeof input?.name !== 'string' || !input.name.trim() || input.name.length > 100 ||
      !Number.isSafeInteger(input.amountCents) || input.amountCents < 0 || input.amountCents > 100000000 ||
      !['monthly', 'yearly'].includes(input.interval)) throw Error('Informe nome, valor e periodicidade válidos.');
  return { name: input.name.trim(), amountCents: input.amountCents, interval: input.interval, active: input.active !== false };
}
export function validateWatermark(input) {
  if (!Number.isFinite(input?.widthMm) || input.widthMm < 80 || input.widthMm > 190 ||
      !Number.isFinite(input.opacity) || input.opacity < .01 || input.opacity > .15) throw Error('Use tamanho de 80 a 190 mm e intensidade de 1 a 15%.');
  const image = input.image || '';
  if (image !== '') {
    if (typeof image !== 'string' || image.length > 350000 || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(image)) throw Error('Use imagem PNG ou JPEG de até 250 KB.');
    const bytes = Buffer.from(image.split(',')[1], 'base64');
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!(image.startsWith('data:image/png;') ? png : jpg)) throw Error('Arquivo de imagem inválido.');
  }
  return { widthMm: input.widthMm, opacity: input.opacity, image };
}
