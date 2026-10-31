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
function employeeRead(fn){return (ref,...args)=>employeeReadAllowed(ref)?fn(ref,...args):Promise.resolve(employeeEmptySnapshot());}
function employeeSnapshot(fn){return (ref,...args)=>{if(employeeReadAllowed(ref))return fn(ref,...args);const callback=args.find(x=>typeof x==='function');let stopped=false;queueMicrotask(()=>{if(!stopped)callback?.(employeeEmptySnapshot());});return ()=>{stopped=true;};};}
function employeeAreaForTab(tab){return ({clientes:'clients',cadastro:'catalog',calculadora:'calculator',orcamento:'budgets',estoque:'stock',historico:'stock',movimentacoes:'stock',pedidos:'orders',carregamentos:'loads',producao:'production',servicos:'services',cubagemToras:'services'})[tab]||null;}
function employeeNavigationRoute(control){return control?.dataset?.pcnav||control?.dataset?.tab||control?.dataset?.inicioDestino||control?.dataset?.lateralDestino||null;}
function employeeTabAllowed(tab){if(tab==='orcamento')return ['budgets','orders','loads'].some(area=>parent.__smEmployeeCan(area));if(['inicio','sair'].includes(tab))return true;const area=employeeAreaForTab(tab);return area?parent.__smEmployeeCan(area):parent.__smEmployeeMember()?.papel==='admin';}
function employeeNavigationAllowed(control){
 const route=employeeNavigationRoute(control);
 if(route==='orcamento'&&(control.dataset?.inicioDestino||control.dataset?.lateralDestino))return parent.__smEmployeeCan('budgets');
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
 const sub={atual:'budgets',guardados:'orders',entregas:'orders',carregamentos:'loads'};
 for(const [id,area] of Object.entries({orcAtualPainel:'budgets',orcGuardadosPainel:'orders',orcEntregasPainel:'orders',orcCarregamentosPainelV392:'loads'}))document.getElementById(id)?.classList.toggle('employee-denied',!parent.__smEmployeeCan(area));
 document.querySelectorAll('.orc-subtab-btn').forEach(b=>b.classList.toggle('employee-denied',!parent.__smEmployeeCan(sub[b.dataset.orcsub])));
 if(document.querySelector('main>section.tab.active')?.id==='orcamento'&&!parent.__smEmployeeCan(sub[typeof orcSubaba==='string'?orcSubaba:'atual'])){const first=Object.keys(sub).find(k=>parent.__smEmployeeCan(sub[k]));if(first)abrirSubabaOrcamento(first);}
}
function employeeDestinationAllowed(write=false){
 if(!parent.__smEmployeeCan('calculator',write))return false;
 const area=({orcamento:'budgets',carga:'loads',estoque1:'stock',estoque2:'stock',transferencia:'stock',plaina:'stock'})[destinoSelecionado()];
 return !!area&&parent.__smEmployeeCan(area,write);
}
function employeeUpdateUI(){
 employeeRefreshPanels();
 const owner=parent.__smEmployeeMember()?.papel==='admin';
 document.querySelectorAll('[data-pcnav],[data-tab],[data-inicio-destino],[data-lateral-destino]').forEach(el=>{const tab=employeeNavigationRoute(el);el.classList.toggle('employee-denied',!employeeNavigationAllowed(el));});
 document.querySelectorAll('main>section.tab').forEach(el=>el.classList.toggle('employee-denied',!employeeTabAllowed(el.id)));
 document.querySelectorAll('input[name="destinoLancamento"]').forEach(input=>{const area=({orcamento:'budgets',carga:'loads',estoque1:'stock',estoque2:'stock',transferencia:'stock',plaina:'stock'})[input.value];const allowed=parent.__smEmployeeCan('calculator')&&parent.__smEmployeeCan(area);input.disabled=!allowed;input.closest('label')?.classList.toggle('employee-denied',!allowed);if(input.checked&&!allowed){const first=[...document.querySelectorAll('input[name="destinoLancamento"]')].find(x=>!x.disabled);if(first){first.checked=true;first.dispatchEvent(new Event('change',{bubbles:true}));}}});
 const old=document.getElementById('tbUsuariosEmpresa');if(old)old.closest('.gestao-usuarios-card')?.classList.add('employee-denied');
 document.getElementById('usrAtualTeste')?.closest('label')?.classList.add('employee-denied');
 if(owner&&!document.getElementById('employee-management-link')){
  const host=document.getElementById('gestaoEmpresaCard')||document.getElementById('configInterface');
  if(host){const link=document.createElement('a');link.id='employee-management-link';link.href='/equipe/';link.target='_blank';link.rel='noopener';link.className='btn btn-primary';link.textContent='Funcionários e permissões';host.prepend(link);}
 }
 for(const [hostId,buttonId] of [['inicio','employee-production-home'],['menuLateralV525','employee-production-menu']]){
  const host=document.getElementById(hostId);if(host&&!document.getElementById(buttonId)){const b=document.createElement('button');b.id=buttonId;b.type='button';b.className='inicio-atalho-v464';b.dataset.inicioDestino='producao';b.textContent='Produção';b.onclick=employeeOpenProduction;(host.querySelector('.inicio-grid-v464')||host).append(b);}
  document.getElementById(buttonId)?.classList.toggle('employee-denied',!parent.__smEmployeeCan('production'));
 }
 if(!owner){
  document.querySelectorAll('[onclick*="abrirTelaProducao"],#btnConfigMobileV425,#btnCadastroEmpresaMobileV425').forEach(el=>el.classList.toggle('employee-denied',el.id.startsWith('btnConfig')||el.id==='btnCadastroEmpresaMobileV425'||!parent.__smEmployeeCan('production')));
  document.querySelectorAll('#btnAbrirToras,#btnCubagemToras,#abrirCubagemToras').forEach(el=>el.classList.toggle('employee-denied',!parent.__smEmployeeCan('services')));
  const active=document.querySelector('main>section.tab.active');if(active&&!employeeTabAllowed(active.id))pcAtivarAba('inicio');
 }
}
function employeeActionAllowed(target){
 if(parent.__smEmployeeMember()?.papel==='admin')return true;
 const control=target?.closest?.('button,[role="button"],input[type="submit"],[onclick],a');if(!control)return true;
 const tab=employeeNavigationRoute(control);
 if(tab)return employeeNavigationAllowed(control);
 if(control.id==='sairInicioV492')return true;
 if(control.dataset?.orcsub)return parent.__smEmployeeCan(({atual:'budgets',guardados:'orders',entregas:'orders',carregamentos:'loads'})[control.dataset.orcsub]);
 if(control.closest('header,#menuLateralV525')&&/sair|início|inicio|menu/i.test(control.textContent||''))return true;
 if(control.id==='mobileMenuToggle'||control.id==='mobileMenuClose')return true;
 const inline=control.getAttribute('onclick')||'',text=String(control.textContent||'').trim();
 if(control.id==='btnCubagemToras')return parent.__smEmployeeCan('services');
 if(/abrirTelaProducao/.test(inline))return parent.__smEmployeeCan('production');
 if(control.closest('.tabs,.modo-medida,.bitola-tabs,.madeira-filtro-tabs')||control.matches('.estoque-tipo-btn,.planilha-estoque-btn,.estoque-tab-btn,.estoque-subtab-btn'))return true;
 const section=control.closest('section.tab'),dialog=control.closest('#cubagemToras,#telaProducaoCompartilhada');
 const area=dialog?.id==='cubagemToras'?'services':dialog?'production':employeePanelArea(control);
 if(!area)return false;
 if(!parent.__smEmployeeCan(area))return false;
 if(/copiar|gerar\s*pdf|imprimir|exportar/.test(text.toLowerCase())||/^fechar|^voltar/.test(text.toLowerCase())||/abrirPecasLinhaV224/.test(inline))return true;
 if(area==='calculator')return employeeDestinationAllowed(true);
 return parent.__smEmployeeCan(area,true);
}
document.addEventListener('click',event=>{if(employeeActionAllowed(event.target)){queueMicrotask(employeeRefreshPanels);return;}event.preventDefault();event.stopImmediatePropagation();alert('Seu administrador não liberou esta ação para sua conta.');},true);
document.addEventListener('submit',event=>{if(employeeActionAllowed(event.submitter||event.target.querySelector('button[type="submit"],button')) )return;event.preventDefault();event.stopImmediatePropagation();alert('Você tem acesso somente à consulta nesta área.');},true);
const employeeStyle=document.createElement('style');employeeStyle.textContent='.employee-denied{display:none!important}';document.head.append(employeeStyle);
window.addEventListener('load',employeeUpdateUI);
setTimeout(employeeUpdateUI,0);
