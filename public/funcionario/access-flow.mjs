// Existing membership is read from the server; invitation redemption is only for activation.
export async function resolveEmployeeEntry({user,token,empresaId,request=fetch,signal}){
 const idToken=await user.getIdToken(true),headers={Authorization:'Bearer '+idToken};
 const session=await request('/.netlify/functions/company-session',{headers,cache:'no-store',signal});
 const current=await session.json();
 if(session.ok){
  if(current.uid!==user.uid||current.member?.ativo!==true||!current.empresaId||current.member.empresaId!==current.empresaId)throw Error('Não foi possível confirmar seu vínculo. Entre novamente.');
  if(empresaId&&current.empresaId!==empresaId)throw Error('Esta conta já está vinculada a outra empresa. Entre pelo sistema ou consulte o administrador.');
  return {existing:true};
 }
 if(session.status!==403)throw Error(current.error||'Não foi possível confirmar seu acesso. Tente novamente.');
 if(!token||!empresaId)throw Error('Sua conta ainda não tem acesso ativo. Abra o convite completo enviado pelo administrador.');
 const response=await request('/.netlify/functions/company-employees',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'invite.redeem',token,empresaId}),signal});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível ativar seu acesso.');
 return {existing:false};
}
