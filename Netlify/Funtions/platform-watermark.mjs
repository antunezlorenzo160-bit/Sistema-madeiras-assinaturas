import { authenticate, failure, json } from './lib/platform-auth.mjs';
export default async function handler(req) {
  if (req.method !== 'GET') return json(405,{error:'Método não permitido.'});
  try {
    const {db} = await authenticate(req,false);
    const snap = await db.doc('plataforma_admin/pdf_watermark').get();
    const data = snap.exists ? snap.data() : {widthMm:180,opacity:.04,image:''};
    return json(200,{widthMm:data.widthMm,opacity:data.opacity,image:data.image || ''});
  } catch(error) { return failure(error); }
}
