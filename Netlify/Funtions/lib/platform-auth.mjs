import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { isPlatformAdmin, PlatformError } from './platform.mjs';
import { OWNER_EMAIL } from './platform-owner.mjs';

export { PlatformError };
export function json(status, data) {
  return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
export async function authenticate(req, admin = true) {
  const match = (req.headers.get('authorization') || '').match(/^Bearer (.+)$/i);
  if (!match) throw new PlatformError(401,'Entre com sua conta para continuar.');
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new PlatformError(503,'O servidor da plataforma ainda não foi configurado.');
  let account;
  try { account = JSON.parse(raw); } catch { throw new PlatformError(503,'Configuração do servidor inválida.'); }
  if (account.project_id !== 'estoque-madeiras-cc4d7') throw new PlatformError(503,'Projeto do servidor inválido.');
  if (!getApps().length) initializeApp({credential:cert(account),projectId:account.project_id});
  let decoded;
  try { decoded = await getAuth().verifyIdToken(match[1], true); } catch { throw new PlatformError(401,'Sua sessão expirou. Entre novamente.'); }
  const owner = isPlatformAdmin(decoded,process.env.PLATFORM_ADMIN_UID,OWNER_EMAIL);
  if (admin && !owner && decoded.email?.toLowerCase() === OWNER_EMAIL && decoded.email_verified !== true) throw new PlatformError(403,'Confirme o e-mail da sua conta Firebase para acessar a plataforma.');
  if (admin && !owner) throw new PlatformError(403,'Esta área é exclusiva do proprietário da plataforma.');
  const db = getFirestore();
  if (!admin && !owner) {
    const member = await db.doc(`membros/${decoded.uid}`).get();
    if (!member.exists || member.data().ativo !== true || typeof member.data().empresaId !== 'string') throw new PlatformError(403,'Conta sem empresa ativa.');
  }
  return {db,uid:decoded.uid};
}
export function failure(error) { return json(error.status || 500,{error:error.status ? error.message : 'Não foi possível concluir a operação.'}); }
