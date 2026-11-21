// V760: rearrange the existing desktop report nodes; do not clone forms or replace handlers.
(()=>{
 const desktop=matchMedia('(min-width:1100px)');let state=null,printing=false;
 function restore(){
  if(!state)return;
  for(const {node,anchor,open}of state.nodes){anchor.replaceWith(node);if(open!==undefined)node.open=open;}
  for(const wrapper of state.wrappers)wrapper.remove();state=null;
 }
 function apply(){
  if(printing||!desktop.matches){restore();return;}if(state)return;
  const panel=document.getElementById('financePanelV722'),numbers=document.getElementById('finNumbersV722'),checks=document.getElementById('finSaleChecksV735'),graph=document.getElementById('finChartV722')?.closest('details'),other=document.getElementById('finOtherTotalsV735'),policy=document.getElementById('finMinimumPolicyV726'),opening=document.getElementById('finOpeningBoxV732');
  if(!panel||!numbers||!checks||!graph||!other||!policy||!opening)return;
  const nodes=[],wrappers=[];
  function move(node,target){const anchor=document.createComment('dashboard-original-position');node.before(anchor);nodes.push({node,anchor,open:node.tagName==='DETAILS'?node.open:undefined});target.append(node);}
  const chartGrid=document.createElement('div');chartGrid.className='dashboard-charts-v760';chartGrid.setAttribute('aria-label','Visão geral do período');numbers.insertBefore(chartGrid,checks);wrappers.push(chartGrid);
  move(graph,chartGrid);move(other,chartGrid);graph.open=true;other.open=true;
  const card=policy.parentElement,settings=document.createElement('details');settings.className='dashboard-settings-v760';const title=document.createElement('summary');title.textContent='Configurações e explicações do resultado';settings.append(title);card.append(settings);wrappers.push(settings);
  // Explanations remain available after the overview; all financial warnings stay in place.
  for(const note of [...card.children].filter(node=>node.classList.contains('note')&&!node.id))move(note,settings);
  const trips=[...panel.children].find(node=>node.tagName==='P'&&node.classList.contains('note')&&node.classList.contains('no-print'));if(trips)move(trips,settings);
  move(policy,settings);move(opening,settings);
  state={nodes,wrappers};
 }
 globalThis.addEventListener?.('beforeprint',()=>{printing=true;restore();});
 globalThis.addEventListener?.('afterprint',()=>{printing=false;apply();});
 desktop.addEventListener('change',apply);setTimeout(apply,0);
})();
