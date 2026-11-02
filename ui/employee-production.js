let employeeProductionOrders=[],employeeProductionWritable=false,employeeProductionLoading=false;
const employeeProductionQueue=new Map();
function employeeProductionOrder(order){return {...order,status:'confirmado',atualizadoEm:order.revision,itens:order.itens.map(item=>({...item,key:item.key})),materiaisUsadosProducao:Object.fromEntries(order.itens.map(item=>[item.key,item.material||'']))};}
async function employeeProductionRequest(input){
 const user=parent.__v470Runtime()?.auth?.currentUser;if(user?.uid!==boundV456.uid)throw Error('Entre novamente com sua conta.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{const response=await fetch('/.netlify/functions/company-production',{method:input?'POST':'GET',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{}),signal:controller.signal});const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível atualizar a produção.');return result;}finally{clearTimeout(timer);}
}
async function employeeLoadProductionScreen(){
 if(employeeProductionLoading||!parent.__smEmployeeCan('production'))return;
 employeeProductionLoading=true;
 try{
  await Promise.all([...employeeProductionQueue.values()]);
  const result=await employeeProductionRequest();
  if(parent.__v470Runtime()?.auth?.currentUser?.uid!==boundV456.uid)throw Error('Conta alterada. Entre novamente.');employeeProductionOrders=result.orders.map(employeeProductionOrder);employeeProductionWritable=result.canWrite===true;
  const screen=construirTelaProducaoV627();if(!screen)return;screen.hidden=false;screen.classList.add('v628-aberta');screen.style.display='block';document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';document.body.style.overscrollBehavior='none';
  const refresh=document.createElement('button');refresh.type='button';refresh.className='btn';refresh.textContent='Atualizar fila';refresh.dataset.employeeProductionRefresh='true';refresh.onclick=employeeLoadProductionScreen;screen.firstElementChild.firstElementChild.append(refresh);
  renderTelaProducao();
 }catch(error){alert(error.message||'Não foi possível abrir a produção.');}finally{employeeProductionLoading=false;}
}
function employeeProductionControls(){
 if(parent.__smEmployeeMember()?.papel==='admin')return;
 const writable=employeeProductionWritable&&parent.__smEmployeeCan('production',true);
 document.querySelectorAll('#listaProducaoCompartilhada input,#listaProducaoCompartilhada textarea').forEach(input=>{input.readOnly=!writable;});
 document.querySelectorAll('#listaProducaoCompartilhada button').forEach(button=>{if(!writable)button.disabled=true;});
}
function employeeProductionChange(id,action,extra={}){
 if(!employeeProductionWritable||!parent.__smEmployeeCan('production',true))return Promise.reject(Error('Você tem acesso somente à consulta da produção.'));
 const previous=employeeProductionQueue.get(id)||Promise.resolve();
 const task=previous.catch(()=>{}).then(async()=>{
  const order=employeeProductionOrders.find(order=>String(order.id)===String(id));if(!order)throw Error('Atualize a fila de produção.');
  const result=await employeeProductionRequest({id:order.id,revision:order.revision,action,...extra});
  employeeProductionOrders=employeeProductionOrders.map(item=>item.id===order.id?employeeProductionOrder(result.order):item);
  return result.order;
 });
 employeeProductionQueue.set(id,task);task.finally(()=>{if(employeeProductionQueue.get(id)===task)employeeProductionQueue.delete(id);}).catch(()=>{});return task;
}
async function employeeProductionAction(id,action){
 try{const order=employeeProductionOrders.find(item=>String(item.id)===String(id));if(action==='toggle')action=!order?.producaoIniciadaEm?'start':order.producaoPausadaEm?'resume':'pause';await employeeProductionChange(id,action);renderTelaProducao();}catch(error){alert(error.message);}
}
async function employeeProductionMaterial(element){
 const order=employeeProductionOrders.find(item=>String(item.id)===String(element.dataset.prodPedido));
 const index=order?.itens.findIndex(item=>item.key===element.dataset.prodChave);if(index==null||index<0)return;
 const text=String(element.value||'').trim();if(text===(order.itens[index].material||''))return;
 try{await employeeProductionChange(order.id,'material',{index,text});}catch(error){alert('Material não salvo: '+error.message);}
}
async function employeeProductionObservation(element){
 if(!element)return;const id=String(element.dataset.obsPedido),state=estadoObservacaoProducao();clearTimeout(state.get(id)?.timer);
 const text=element.value.slice(0,2000).trim(),order=employeeProductionOrders.find(item=>String(item.id)===id);if(!order)return;
 if(text===String(order.observacaoProducao||'')){state.delete(id);statusObservacaoProducao(id,'Observação salva.');return;}
 try{await employeeProductionChange(id,'observation',{text});if(state.get(id)?.texto===element.value||state.get(id)?.texto===text)state.delete(id);statusObservacaoProducao(id,'Observação salva.');}catch(error){statusObservacaoProducao(id,'Não foi possível salvar: '+error.message);}
}
