// V748: user-requested desktop fit, presentation only; no storage or business-data writes.
(()=>{
 const desktop=matchMedia('(min-width:1100px)'),scaled=new Map();
 let enabled=true,printing=false,frame=0,button;
 const remember=el=>{if(!scaled.has(el))scaled.set(el,{zoom:el.style.zoom,width:el.style.width,height:el.style.height});};
 const clear=()=>{for(const [el,old] of scaled)Object.assign(el.style,old);scaled.clear();};
 function fit(){
  frame=0;clear();
  const active=desktop.matches&&enabled&&!printing;
  document.body.classList.toggle('desktop-fit-v748',active);
  if(button){button.hidden=!desktop.matches||printing;button.textContent=enabled?'Tamanho normal':'Ajustar à tela';button.setAttribute('aria-pressed',String(enabled));}
  if(!active)return;
  const main=document.querySelector('main'),tab=main?.querySelector('.tab.active');if(!tab)return;
  const header=document.querySelector('header'),top=Math.max(0,header?.getBoundingClientRect().bottom||0,main.getBoundingClientRect().top);
  const availableHeight=Math.max(40,window.innerHeight-top-46),availableWidth=Math.max(40,main.clientWidth-24);
  remember(tab);let scale=1;
  // Recheck after reflow: zoom changes wrapping and may reveal wide tables.
  for(let i=0;i<4;i++){
   tab.style.zoom=String(scale);
   const box=tab.getBoundingClientRect(),height=Math.max(box.height,tab.scrollHeight*scale),width=Math.max(box.width,tab.scrollWidth*scale);
   const next=Math.min(scale,scale*availableHeight/Math.max(1,height),scale*availableWidth/Math.max(1,width));
   if(next>=scale-.0001)break;
   scale=Math.max(.0001,Math.floor(next*10000)/10000);
  }
  tab.style.zoom=String(scale);
  if(button)button.textContent='Tamanho normal · '+Number((scale*100).toFixed(1))+'%';
  const nav=document.getElementById('menuLateralV525');
  if(nav&&nav.clientHeight){
   const ratio=Math.min(1,(window.innerHeight-12)/Math.max(1,nav.scrollHeight));
   if(ratio<1){remember(nav);nav.style.width=(nav.getBoundingClientRect().width/ratio)+'px';nav.style.height=(window.innerHeight/ratio)+'px';nav.style.zoom=String(ratio);}
  }
  main.scrollTop=0;
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(fit);}
 function mount(){
  button=document.createElement('button');button.id='desktopFitV748';button.type='button';button.className='no-print';button.title='Alternar entre encaixar a tela inteira e o tamanho normal';
  button.addEventListener('click',()=>{enabled=!enabled;schedule();});document.body.append(button);
  const main=document.querySelector('main');
  if(main)new MutationObserver(schedule).observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','open']});
  document.addEventListener('toggle',schedule,true);document.addEventListener('change',schedule,true);
  window.addEventListener('resize',schedule);desktop.addEventListener('change',schedule);
  window.addEventListener('beforeprint',()=>{printing=true;clear();document.body.classList.remove('desktop-fit-v748');});
  window.addEventListener('afterprint',()=>{printing=false;schedule();});
  document.fonts?.ready.then(schedule);schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
