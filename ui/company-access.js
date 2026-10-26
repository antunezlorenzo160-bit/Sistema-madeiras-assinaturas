function acompanharAcessoEmpresaV707(){
  const reference=rawDocV456(db,'membros',boundV456.uid);
  return onSnapshot(reference,{includeMetadataChanges:true},snapshot=>{
    if(authV456.currentUser?.uid!==boundV456.uid||snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;
    if(!snapshot.exists()||snapshot.data().ativo!==true||snapshot.data().empresaId!==empresaV456){
      readyV456=false;
      parent.__v456Error('O acesso desta empresa foi suspenso ou alterado. Entre em contato com o administrador da plataforma.');return;
    }
    const notice=snapshot.data().avisoPlataforma;
    let box=document.getElementById('avisoPlataformaV707');
    if(notice?.kind!=='trial_end'||!/^\d{4}-\d{2}-\d{2}$/.test(notice.endDate||'')){box?.remove();return;}
    const header=document.querySelector('header');if(!header)return;
    if(!box){box=document.createElement('div');box.id='avisoPlataformaV707';box.setAttribute('role','status');box.className='no-print';
      box.style.cssText='margin-top:8px;padding:8px 10px;border-radius:6px;background:#f7eed6;color:#5c451c;font-size:12px;line-height:1.5;text-shadow:none';header.append(box);}
    const date=notice.endDate.split('-').reverse().join('/');
    box.textContent=Number(notice.endsAt)<=Date.now()?`O prazo informado para seu teste gratuito terminou em ${date}. Entre em contato com a plataforma para combinar a continuidade. Nenhuma cobrança é feita sem contratação.`:
      `Seu teste gratuito está previsto para terminar em ${date}. Entre em contato com a plataforma para combinar a continuidade. Nenhuma cobrança é feita sem contratação.`;
  },error=>{
    if(authV456.currentUser?.uid===boundV456.uid&&error?.code==='permission-denied'){
      readyV456=false;parent.__v456Error('Não foi possível validar seu acesso. Entre novamente no sistema.');
    }
  });
}
