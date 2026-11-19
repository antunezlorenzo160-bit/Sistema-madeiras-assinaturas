// HISTORY_PAINT_V802 — keep all records; skip rendering offscreen table blocks.
// Measure once while idle, before containment, so the scroll range stays stable.
function startHistoryPaintV802(doc,view){
 const host=doc.getElementById('historicoPlanilhasEstoque');
 if(!host||!view.CSS?.supports?.('content-visibility','auto')||!view.CSS.supports('contain-intrinsic-block-size','auto 100px'))return null;
 const marker='history-paint-v802',heightProperty='--history-content-height-v802';
 let timer=null,idle=null,pending=true,lastScroll=0,lastWidth=view.innerWidth,printing=false,destroyed=false;
 const active=()=>!printing&&!destroyed&&view.matchMedia('(max-width:760px)').matches&&doc.body.classList.contains('historico-topo-v507');
 function blocks(){return [...host.querySelectorAll('.comprimento-bloco')];}
 function reset(){for(const block of blocks()){block.classList.remove(marker);block.style.removeProperty(heightProperty);}pending=true;}
 function cancel(){if(timer!==null){view.clearTimeout(timer);timer=null;}if(idle!==null){view.cancelIdleCallback?.(idle);idle=null;}}
 function measure(){
  idle=null;if(!active())return;
  if(Date.now()-lastScroll<180){schedule();return;}
  const unmeasured=blocks().filter(block=>!block.classList.contains(marker));
  // Batch every layout read before changing any style. Never measure on scroll.
  const measured=unmeasured.map(block=>{
   const rect=block.getBoundingClientRect(),style=view.getComputedStyle(block);
   const number=key=>parseFloat(style[key])||0;
   const height=rect.height-number('paddingTop')-number('paddingBottom')-number('borderTopWidth')-number('borderBottomWidth');
   return {block,height};
  });
  for(const {block,height}of measured)if(Number.isFinite(height)&&height>0){block.style.setProperty(heightProperty,height+'px');block.classList.add(marker);}
  pending=false;
 }
 function schedule(){
  if(!pending||!active())return;
  if(timer!==null)view.clearTimeout(timer);
  if(idle!==null){view.cancelIdleCallback?.(idle);idle=null;}
  timer=view.setTimeout(()=>{timer=null;if(!active())return;if(view.requestIdleCallback)idle=view.requestIdleCallback(measure,{timeout:800});else measure();},200);
 }
 function scrolled(event){
  if(!active())return;
  const target=event.target;
  if(target!==doc&&target!==doc.documentElement&&!target?.matches?.('body>main')&&!(target?.nodeType&&host.contains(target)))return;
  lastScroll=Date.now();if(pending)schedule();
 }
 function resized(){if(view.innerWidth===lastWidth)return;lastWidth=view.innerWidth;cancel();reset();schedule();}
 function beforePrint(){printing=true;cancel();reset();}
 function afterPrint(){printing=false;schedule();}
 function beforeExport(event){if(!event.target?.closest?.('.export-actions button'))return;cancel();reset();schedule();}
 const Observer=view.MutationObserver;
 const changes=new Observer(()=>{pending=true;schedule();});changes.observe(host,{childList:true});
 const navigation=new Observer(()=>{if(!active()){cancel();return;}pending=true;schedule();});navigation.observe(doc.body,{attributes:true,attributeFilter:['class']});
 doc.addEventListener('scroll',scrolled,{capture:true,passive:true});
 host.addEventListener('click',beforeExport,true);
 view.addEventListener('resize',resized,{passive:true});view.addEventListener('beforeprint',beforePrint);view.addEventListener('afterprint',afterPrint);
 schedule();
 return {refresh(){pending=true;schedule();},destroy(){destroyed=true;cancel();reset();changes.disconnect();navigation.disconnect();doc.removeEventListener('scroll',scrolled,true);host.removeEventListener('click',beforeExport,true);view.removeEventListener('resize',resized);view.removeEventListener('beforeprint',beforePrint);view.removeEventListener('afterprint',afterPrint);}};
}
