function employeePath(ref){return String(ref?.path||ref?._query?.path?.canonicalString?.()||'');}
function employeeReadAllowed(ref){
 const parts=employeePath(ref).split('/');
 if(parts[0]==='membros')return parts[1]===boundV456.uid;
 if(parts[0]!=='empresas'||parts[1]!==empresaV456)return false;
 if(parts[2]==='acesso')return true;
 return parts[2]==='dados'&&parent.__smEmployeeCollectionCan(parts[3]);
}
function employeeAssertWrite(ref){
 const parts=employeePath(ref).split('/');
 if(parts[0]!=='empresas'||parts[1]!==empresaV456||parts[2]!=='dados'||!parent.__smEmployeeCollectionCan(parts[3],true))throw Object.assign(Error('Você não tem permissão para alterar esta área.'),{code:'permission-denied'});
}
function employeeEmptySnapshot(){return {docs:[],size:0,empty:true,metadata:{fromCache:false,hasPendingWrites:false},exists:()=>false,data:()=>undefined,docChanges:()=>[]};}
function employeeRead(fn){return (ref,...args)=>employeeReadAllowed(ref)?Promise.resolve(fn(employeeScopedReadReference(ref),...args)).then(snapshot=>employeeSanitizeLoadRead(ref,snapshot)):Promise.resolve(employeeEmptySnapshot());}
function employeeSnapshot(fn){return (ref,...args)=>{if(employeeReadAllowed(ref))return fn(employeeScopedReadReference(ref),...args);const callback=args.find(x=>typeof x==='function');let stopped=false;queueMicrotask(()=>{if(!stopped)callback?.(employeeEmptySnapshot());});return ()=>{stopped=true;};};}
function employeeAreaForTab(tab){return ({clientes:'clients',cadastro:'catalog',calculadora:'calculator',orcamento:'budgets',estoque:'stock',historico:'stock',movimentacoes:'stock',pedidos:'orders',carregamentos:'loads',producao:'production',servicos:'services',cubagemToras:'services'})[tab]||null;}
function employeeNavigationRoute(control){return control?.dataset?.pcnav||control?.dataset?.tab||control?.dataset?.inicioDestino||control?.dataset?.lateralDestino||null;}
function employeeTabAllowed(tab){if(tab==='orcamento')return ['budgets','orders','loads'].some(area=>parent.__smEmployeeCan(area));if(['inicio','sair'].includes(tab))return true;const area=employeeAreaForTab(tab);return area?parent.__smEmployeeCan(area):parent.__smEmployeeMember()?.papel==='admin';}
function employeeNavigationAllowed(control){
 const route=employeeNavigationRoute(control);
 if(route==='orcamento')return parent.__smEmployeeCan('budgets');
 return employeeTabAllowed(route);
}
function employeePanelArea(element){
 if(element?.closest?.('#orcGuardadosPainel,#orcEntregasPainel'))return 'orders';
 if(element?.closest?.('#orcCarregamentosPainelV392'))return 'loads';
 if(element?.closest?.('#orcAtualPainel'))return 'budgets';
 return employeeAreaForTab(element?.closest?.('section.tab')?.id);
}
function employeeOpenProduction(){if(parent.__smEmployeeCan('production'))parent.location.assign('/producao/');}
function employeeRefreshPanels(){
 employeeLoadControls();
 const sub={atual:'budgets',guardados:'orders',entregas:'orders',carregamentos:'loads'};
 for(const [id,area] of Object.entries({orcAtualPainel:'budgets',orcGuardadosPainel:'orders',orcEntregasPainel:'orders',orcCarregamentosPainelV392:'loads'})){const element=document.getElementById(id);if(element)employeeSetNavigationHidden(element,!parent.__smEmployeeCan(area));}
 document.querySelectorAll('.orc-subtab-btn').forEach(b=>employeeSetNavigationHidden(b,!parent.__smEmployeeCan(sub[b.dataset.orcsub])));
 if(document.querySelector('main>section.tab.active')?.id==='orcamento'&&!parent.__smEmployeeCan(sub[typeof orcSubaba==='string'?orcSubaba:'atual'])){const first=Object.keys(sub).find(k=>parent.__smEmployeeCan(sub[k]));if(first)abrirSubabaOrcamento(first);}
}
function employeeDestinationAllowed(write=false){
 if(!parent.__smEmployeeCan('calculator',write))return false;
 const area=({orcamento:'budgets',carga:'loads',estoque1:'stock',estoque2:'stock',transferencia:'stock',plaina:'stock'})[destinoSelecionado()];
 return !!area&&parent.__smEmployeeCan(area,write);
}
function employeeShowAccountStatus(){
 const runtime=parent.__v470Runtime?.(),user=runtime?.auth?.currentUser,member=parent.__smEmployeeMember();
 const name=user?.uid===boundV456.uid?(user.email||member?.nome||boundV456.uid):(member?.email||member?.nome||boundV456.uid);
 const admin=member?.papel==='admin';
 const hasAccess=['clients','catalog','calculator','budgets','orders','production','stock','loads','services'].some(area=>parent.__smEmployeeCan(area));
 const role=admin?'Administrador da empresa':hasAccess?'Funcionário':'Sem permissões nesta empresa';
 for(const [host,id] of [[document.getElementById('menuLateralV525'),'employee-menu-account'],[document.querySelector('#inicio .card'),'employee-account-status']]){
  if(!host)continue;
  let panel=document.getElementById(id);
  if(!panel){panel=document.createElement('div');panel.id=id;panel.setAttribute('role','status');panel.style.cssText='display:block!important;padding:10px 12px;margin:8px 0;border-radius:8px;background:#183e2c;color:#fff;font-size:13px;line-height:1.5;overflow-wrap:anywhere;text-shadow:none';host.prepend(panel);}
  const text='Conta: '+name+'\nPerfil: '+role+'\nVersão do acesso: 7';
  panel.style.whiteSpace='pre-line';if(panel.textContent!==text)panel.textContent=text;
 }
}
function employeeUpdateUI(){
 employeeRefreshPanels();
 const owner=parent.__smEmployeeMember()?.papel==='admin';
 employeeShowAccountStatus();
 employeeUpdateNavigationVisibility();
 employeeUpdateDestinationVisibility();
 const old=document.getElementById('tbUsuariosEmpresa');if(old){const card=old.closest('.gestao-usuarios-card');if(card)employeeSetNavigationHidden(card,true);}
 const previewRole=document.getElementById('usrAtualTeste')?.closest('label');if(previewRole)employeeSetNavigationHidden(previewRole,true);
 if(owner&&!document.getElementById('employee-management-link')){
  const host=document.getElementById('gestaoEmpresaCard')||document.getElementById('configInterface');
  if(host){const link=document.createElement('a');link.id='employee-management-link';link.href='/equipe/';link.target='_blank';link.rel='noopener';link.className='btn btn-primary';link.textContent='Funcionários e permissões';host.prepend(link);}
 }
 for(const [hostId,buttonId] of [['inicio','employee-production-home'],['menuLateralV525','employee-production-menu']]){
  const host=document.getElementById(hostId);if(!host)continue;
  const candidates=[...host.querySelectorAll('[data-inicio-destino="producao"],[data-lateral-destino="producao"]')];
  let productionButton=document.getElementById(buttonId)||candidates[0];
  if(!productionButton){productionButton=document.createElement('button');productionButton.type='button';productionButton.className='inicio-atalho-v464';productionButton.dataset.inicioDestino='producao';productionButton.textContent='Produção';(host.querySelector('.inicio-grid-v464')||host).append(productionButton);}
  productionButton.id=buttonId;productionButton.onclick=employeeOpenProduction;
  for(const duplicate of candidates)if(duplicate!==productionButton)duplicate.remove();
  employeeSetNavigationHidden(productionButton,!parent.__smEmployeeCan('production'));
 }
 if(!owner){
  document.querySelectorAll('[onclick*="abrirTelaProducao"],#btnConfigMobileV425,#btnCadastroEmpresaMobileV425').forEach(el=>employeeSetNavigationHidden(el,el.id.startsWith('btnConfig')||el.id==='btnCadastroEmpresaMobileV425'||!parent.__smEmployeeCan('production')));
  document.querySelectorAll('#btnAbrirToras,#btnCubagemToras,#abrirCubagemToras').forEach(el=>employeeSetNavigationHidden(el,!parent.__smEmployeeCan('services')));
  const active=document.querySelector('main>section.tab.active');if(active&&!employeeTabAllowed(active.id))pcAtivarAba('inicio');
 }
}
function employeeActionAllowed(target){
 if(parent.__smEmployeeMember()?.papel==='admin')return true;
 const control=target?.closest?.('button,[role="button"],input[type="submit"],[onclick],a');if(!control)return true;
 const tab=employeeNavigationRoute(control);
 if(tab)return employeeNavigationAllowed(control);
 if(control.id==='sairInicioV492')return true;
 if(control.dataset?.employeeContinueLoad)return parent.__smEmployeeCan('loads',true)&&parent.__smEmployeeCan('calculator',true);
 if(typeof destinoSelecionado==='function'&&destinoSelecionado()==='carga'&&(control.id==='btnPacoteMenos'||control.id==='btnVerdeOuCorrigirV260'&&control.dataset?.modo==='corrigir'))return false;
 if(['btnGuardarResumoCalc','btnNovoResumoCalc','btnLimparLancamentos','btnApagarSomenteResumoCarga'].includes(control.id)&&typeof destinoSelecionado==='function'&&destinoSelecionado()==='carga')return false;
 if(control.dataset?.orcsub)return parent.__smEmployeeCan(({atual:'budgets',guardados:'orders',entregas:'orders',carregamentos:'loads'})[control.dataset.orcsub]);
 if(control.closest('header,#menuLateralV525')&&/sair|início|inicio|menu/i.test(control.textContent||''))return true;
 if(control.id==='mobileMenuToggle'||control.id==='mobileMenuClose')return true;
 const inline=control.getAttribute('onclick')||'',text=String(control.textContent||'').trim();
 if(/^(fechar|cancelar|voltar)$/i.test(text)&&control.closest('dialog,[role="dialog"],.modal'))return true;
 if(control.id==='btnCubagemToras')return parent.__smEmployeeCan('services');
 if(/abrirTelaProducao/.test(inline))return parent.__smEmployeeCan('production');
 if(control.closest('.tabs,.modo-medida,.bitola-tabs,.madeira-filtro-tabs')||control.matches('.estoque-tipo-btn,.planilha-estoque-btn,.estoque-tab-btn,.estoque-subtab-btn'))return true;
 const section=control.closest('section.tab'),dialog=control.closest('#cubagemToras,#telaProducaoCompartilhada');
 const area=dialog?.id==='cubagemToras'?'services':dialog?'production':employeePanelArea(control);
 if(!area)return false;
 if(!parent.__smEmployeeCan(area))return false;
 if(area==='loads')return false;
 if(area==='calculator'&&typeof destinoSelecionado==='function'&&destinoSelecionado()==='carga'&&/abrirPecasLinhaV224/.test(inline))return false;
 if(area==='calculator'&&typeof destinoSelecionado==='function'&&destinoSelecionado()==='carga'&&/copiar|gerar\s*pdf|imprimir|exportar/.test(text.toLowerCase()))return false;
 if(/copiar|gerar\s*pdf|imprimir|exportar/.test(text.toLowerCase())||/^fechar|^voltar/.test(text.toLowerCase())||/abrirPecasLinhaV224/.test(inline))return true;
 if(area==='calculator')return employeeDestinationAllowed(true);
 return parent.__smEmployeeCan(area,true);
}
document.addEventListener('click',event=>{if(employeeActionAllowed(event.target)){employeeScheduleVisibility();return;}event.preventDefault();event.stopImmediatePropagation();alert('Seu administrador não liberou esta ação para sua conta.');},true);
document.addEventListener('submit',event=>{if(employeeActionAllowed(event.submitter||event.target.querySelector('button[type="submit"],button')) )return;event.preventDefault();event.stopImmediatePropagation();alert('Você tem acesso somente à consulta nesta área.');},true);
const employeeStyle=document.createElement('style');employeeStyle.textContent='.employee-denied,.employee-load-admin-hidden{display:none!important}';document.head.append(employeeStyle);
function employeeSetNavigationHidden(element,hidden){
 if(hidden){
  if(!element.dataset.employeeDisplayBeforeHide)element.dataset.employeeDisplayBeforeHide=JSON.stringify({value:element.style.getPropertyValue('display'),priority:element.style.getPropertyPriority('display')});
  if(element.style.getPropertyValue('display')!=='none'||element.style.getPropertyPriority('display')!=='important')element.style.setProperty('display','none','important');
 }else if(element.dataset.employeeDisplayBeforeHide){
  let saved={};try{saved=JSON.parse(element.dataset.employeeDisplayBeforeHide);}catch{}
  if(saved.value)element.style.setProperty('display',saved.value,saved.priority||'');else element.style.removeProperty('display');
  delete element.dataset.employeeDisplayBeforeHide;
 }
 if(element.classList.contains('employee-denied')!==hidden)element.classList.toggle('employee-denied',hidden);
 if(!hidden&&element.classList.contains('permissao-oculta'))element.classList.remove('permissao-oculta');
}
function employeeUpdateNavigationVisibility(){
 document.querySelectorAll('[data-pcnav],[data-tab],[data-inicio-destino],[data-lateral-destino]').forEach(control=>employeeSetNavigationHidden(control,!employeeNavigationAllowed(control)));
 document.querySelectorAll('main>section.tab').forEach(section=>employeeSetNavigationHidden(section,!employeeTabAllowed(section.id)));
}
function employeeUpdateDestinationVisibility(){
 const inputs=[...document.querySelectorAll('input[name="destinoLancamento"]')];
 const allowed=inputs.filter(input=>{
  const area=({orcamento:'budgets',carga:'loads',estoque1:'stock',estoque2:'stock',transferencia:'stock',plaina:'stock'})[input.value];
  const permitted=parent.__smEmployeeCan('calculator')&&parent.__smEmployeeCan(area);
  input.disabled=!permitted;
  const label=input.closest('label');if(label)employeeSetNavigationHidden(label,!permitted);
  return permitted;
 });
 // Determine every permission before replacing a denied selection.
 if(inputs.some(input=>input.checked&&!allowed.includes(input))){
  inputs.forEach(input=>input.checked=false);
  if(allowed.length){allowed[0].checked=true;allowed[0].dispatchEvent(new Event('change',{bubbles:true}));}
 }
}
let employeeVisibilityScheduled=false;
function employeeScheduleVisibility(){
 if(employeeVisibilityScheduled)return;
 employeeVisibilityScheduled=true;
 queueMicrotask(()=>{employeeVisibilityScheduled=false;employeeUpdateUI();});
}
// Menus and cloned home shortcuts are created after authentication and rebuilt later.
// Observe route metadata and added elements, not the visibility classes we change.
if(typeof MutationObserver!=='undefined'&&document.documentElement){
 const observer=new MutationObserver(records=>{
  if(records.some(record=>record.type==='attributes'?record.attributeName!=='style'||record.target.classList.contains('employee-denied')&&(record.target.style.getPropertyValue('display')!=='none'||record.target.style.getPropertyPriority('display')!=='important'):[...record.addedNodes].some(node=>node.nodeType===1)))employeeScheduleVisibility();
 });
 observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','data-pcnav','data-tab','data-inicio-destino','data-lateral-destino','data-orcsub']});
}
document.addEventListener('change',event=>{if(event.target?.matches?.('input[name="destinoLancamento"]'))employeeScheduleVisibility();});
document.addEventListener('DOMContentLoaded',employeeScheduleVisibility,{once:true});
window.addEventListener('load',employeeScheduleVisibility);
setTimeout(employeeScheduleVisibility,0);
