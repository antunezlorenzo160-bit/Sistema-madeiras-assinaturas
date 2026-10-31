import {PlatformError} from './platform.mjs';
export async function companySession(db,identity){
 const snapshot=await db.doc('membros/'+identity.uid).get(),member=snapshot.exists?snapshot.data():null;
 if(member?.ativo!==true||typeof member.empresaId!=='string'||!/^[-\w]{1,120}$/.test(member.empresaId))throw new PlatformError(403,'Conta sem empresa ativa.');
 const company=await db.doc('empresas/'+member.empresaId).get(),data=company.exists?company.data():null;
 // Same owner precedence as Firestore responsavel(): explicit ownerUid, then legacy admin.
 const isCompanyOwner=data&&Object.hasOwn(data,'ownerUid')?data.ownerUid===identity.uid:member.papel==='admin';
 const roleContext={uid:identity.uid,empresaId:member.empresaId,isCompanyOwner,name:member.nome||identity.email||identity.uid,email:identity.email||member.email||''};
 return {uid:identity.uid,empresaId:member.empresaId,roleContext,member:{...member,nome:roleContext.name,email:roleContext.email,papel:isCompanyOwner?'admin':member.papel==='admin'?'employee':member.papel}};
}
