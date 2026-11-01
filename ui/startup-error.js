(() => {
 let firstFailure='';
 window.__smShowStartupFailure=(message,location='')=>{
  if(firstFailure)return;
  firstFailure=String(message||'Erro ao abrir o sistema').slice(0,700)+(location?'\n'+String(location).slice(0,180):'');
  const panel=document.createElement('section');panel.id='startup-error-detail';panel.setAttribute('role','alert');
  panel.style.cssText='display:block!important;position:fixed;z-index:2147483647;left:10px;right:10px;bottom:12px;max-height:65vh;overflow:auto;background:#172b20;color:#fff;border:2px solid #e6b84a;border-radius:12px;padding:16px;box-sizing:border-box;font:16px system-ui';
  const title=document.createElement('strong');title.textContent='Não foi possível abrir o sistema';
  const detail=document.createElement('pre');detail.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:14px monospace';detail.textContent=firstFailure;
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copiar erro';copy.onclick=async()=>{try{await navigator.clipboard.writeText(detail.textContent);copy.textContent='Erro copiado';}catch{copy.textContent='Tire um print desta mensagem';}};
  const close=document.createElement('button');close.type='button';close.textContent='Fechar aviso';close.onclick=()=>{panel.remove();firstFailure='';};
  panel.append(title,detail,copy,close);document.body.append(panel);
 };
})();

