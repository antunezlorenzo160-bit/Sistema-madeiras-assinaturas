function employeeLoadActor(){const member=parent.__smEmployeeMember(),actor=loadActor(member,boundV456.uid);if(member?.papel==='admin'&&actor.name===actor.uid){const user=parent.__v470Runtime()?.auth?.currentUser;actor.name=user?.displayName||user?.email||'Administrador da empresa';}return actor;}
function employeeRequireLoadAdmin(){if(parent.__smEmployeeMember()?.papel!=='admin')throw Error('Esta ação do carregamento é exclusiva do administrador.');}
function employeeRequireLoadDraftWrite(){if(!parent.__smEmployeeCan('loads',true))throw Error('Seu administrador não liberou a montagem de carregamentos.');}
function employeeLoadRecord(id){return (typeof carregamentos==='undefined'?[]:carregamentos).find(item=>String(item.id)===String(id));}
function employeeCheckLoadWrite(ref,data,mode='set'){
 if(parent.__smEmployeeMember()?.papel==='admin')return;
 const path=employeePath(ref).split('/');if(path[3]!=='sm2_carregamentos')return;
 employeeRequireLoadDraftWrite();
 if(!employeeLoadWriteAllowed(employeeLoadRecord(path[5]),data,employeeLoadActor(),mode))throw Error('Funcionários podem apenas montar, guardar e continuar carregamentos. As demais ações são do administrador.');
}
function employeeScopedReadReference(ref){
 if(parent.__smEmployeeMember()?.papel==='admin'||ref?.type!=='collection')return ref;
 const path=employeePath(ref).split('/');if(path[3]!=='sm2_carregamentos')return ref;
 const sdk=parent.__v470Runtime().sdk;
 return sdk.query(ref,sdk.where('cargaStatus','==','montagem'));
}
function employeeSanitizeLoadRead(ref,snapshot){
 if(parent.__smEmployeeMember()?.papel==='admin'||employeePath(ref).split('/')[3]!=='sm2_carregamentos')return snapshot;
 if(typeof snapshot.exists==='function'&&snapshot.exists()&&!isLoadDraft(snapshot.data()))return employeeEmptySnapshot();
 return snapshot;
}
function renderEmployeeLoadDrafts(host){
 if(!parent.__smEmployeeCan('loads')){host.replaceChildren();return;}
 const groups=new Map();
 for(const item of carregamentos.filter(isLoadDraft)){const id=String(item.grupoCargaId||'');if(!id)continue;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(item);}
 host.replaceChildren();
 const intro=host.parentElement?.querySelector('.v392-cabecalho .muted');if(intro)intro.textContent='Carregamentos em montagem — guardar e continuar.';
 const note=document.createElement('p');note.textContent='Carregamentos em montagem. Você pode guardar pela calculadora e continuar uma montagem abaixo. Conferência, baixa e documentos são exclusivos do administrador.';host.append(note);
 if(!groups.size){const empty=document.createElement('p');empty.textContent='Nenhum carregamento em montagem.';host.append(empty);return;}
 for(const [id,items] of groups){
  const card=document.createElement('div');card.className='card';const title=document.createElement('h3');title.textContent=String(items[0].compradorDestino||items[0].nomeOrigemDestino||'Carregamento em montagem');
  const totals=new Map();for(const item of items){const unit=item.tipoMedida==='m2'?'m²':item.tipoMedida==='linear'?'m':'m³';totals.set(unit,(totals.get(unit)||0)+Number(item.volume||0));}
  const volume=document.createElement('p');volume.textContent=[...totals].map(([u,v])=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:u==='m³'?4:2,maximumFractionDigits:u==='m³'?4:2})+' '+u).join(' · ');
  const by=document.createElement('p');by.textContent='Carregado por: '+loadContributors(items);
  card.append(title,volume,by);
  if(parent.__smEmployeeCan('loads',true)&&parent.__smEmployeeCan('calculator',true)){const button=document.createElement('button');button.type='button';button.className='btn btn-primary';button.textContent='Continuar carregamento';button.dataset.employeeContinueLoad=id;button.onclick=()=>window.continuarCarregamentoV397(id);card.append(button);}
  host.append(card);
 }
}
function employeeLoadControls(){
 if(parent.__smEmployeeMember()?.papel==='admin')return;
 const carga=typeof destinoSelecionado==='function'&&destinoSelecionado()==='carga';
 for(const id of ['btnGuardarResumoCalc','btnNovoResumoCalc','btnLimparLancamentos','btnApagarSomenteResumoCarga'])document.getElementById(id)?.classList.toggle('employee-load-admin-hidden',carga);
 const exportArea=document.querySelector('#resumoCalculadoraExport > .export-actions');exportArea?.classList.toggle('employee-load-admin-hidden',carga);
 for(const id of ['btnPacoteMenos','btnVerdeOuCorrigirV260']){const button=document.getElementById(id);button?.classList.toggle('employee-load-admin-hidden',carga&&(id==='btnPacoteMenos'||button.dataset.modo==='corrigir'));}
 const pending=document.getElementById('painelCargasConferenciaV388');pending?.classList.add('employee-load-admin-hidden');
}
