function acessoPlanoAtual(){return parent.__smAccessState?.()||{read:true,write:true,phase:'active'};}
function exigirEscritaPlano(){parent.__smExigirEscrita?.();}
window.__smPausarPorPlano=()=>{try{diagnosticoLeiturasV700.stopAll();encerrarObservadoresV428();cancelarPerfilEmpresaV424?.();}catch{}};
let ultimoAcessoPlano=null;
function atualizarAvisoPlano(){
 const access=acessoPlanoAtual();
 if(ultimoAcessoPlano&&!ultimoAcessoPlano.write&&access.write){try{abrirObservadoresV428();sincronizarOfflineOps().catch(()=>{});}catch{}}
 ultimoAcessoPlano=access;let banner=document.getElementById('billing-access-notice');
 if(!access.controlled||access.phase==='active'){banner?.remove();return;}
 if(!banner){banner=document.createElement('div');banner.id='billing-access-notice';banner.className='no-print';banner.setAttribute('role','status');banner.style.cssText='padding:10px;margin:8px;background:#f7eed6;color:#433315;border-radius:8px';document.querySelector('header')?.after(banner);}
 const text=access.phase==='grace'?'Plano vencido: você está nos 5 dias de tolerância.':'Plano vencido: somente consultas e exportações estão disponíveis por 30 dias após a tolerância.';
 banner.replaceChildren(document.createTextNode(text+' '));const plans=document.createElement('a');plans.href='/contratacao/';plans.target='_blank';plans.rel='noopener';plans.textContent='Configurações → Planos';banner.append(plans);
 if(!access.read)window.__smPausarPorPlano();
}
parent.addEventListener('sm-access-policy',atualizarAvisoPlano);
document.addEventListener('click',event=>{
 if(acessoPlanoAtual().write)return;
 const control=event.target.closest('button,[role="button"],input[type="submit"],[onclick]');if(!control)return;
 const text=String(control.textContent||control.value||'').trim(),inline=control.getAttribute('onclick')||'';
 const navigation=control.closest('header,#menuLateralV525,.tabs,.modo-medida,.bitola-tabs,.madeira-filtro-tabs')||control.matches('.estoque-tipo-btn,.planilha-estoque-btn,.estoque-tab-btn,.estoque-subtab-btn,.inicio-atalho-v464')||control.id==='mobileMenuToggle';
 const consultation=/copiar|gerar\s*pdf|imprimir|exportar/i.test(text+' '+inline)||/abrirPecasLinhaV224/.test(inline)||/^fechar( menu.*)?$/i.test(text)||/^voltar/i.test(text);
 if(navigation||consultation)return;
 event.preventDefault();event.stopImmediatePropagation();atualizarAvisoPlano();
},true);
document.addEventListener('submit',event=>{if(!acessoPlanoAtual().write){event.preventDefault();event.stopImmediatePropagation();atualizarAvisoPlano();}},true);
setTimeout(atualizarAvisoPlano,0);
