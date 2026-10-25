export const METHODS = Object.freeze(['pix', 'boleto', 'credit_card', 'debit_card', 'bank_transfer', 'wallet']);
export class PlatformError extends Error {
  constructor(status, message) { super(message); this.status = status; }
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
