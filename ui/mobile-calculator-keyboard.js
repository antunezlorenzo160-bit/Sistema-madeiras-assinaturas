// Keep native input focus during in-place calculator actions. Never force a closed keyboard open.
(() => {
 const media=window.matchMedia('(max-width:760px) and (pointer:coarse)');
 const calc=document.getElementById('calculadora'),main=document.querySelector('body > main');if(!calc||!main)return;
 let viewport=window.visualViewport,frame=null;try{if(window.parent!==window&&window.parent.visualViewport){viewport=window.parent.visualViewport;frame=window.frameElement;}}catch{}
 let baseline=0,visible=false,dismissed=false,armed=false,generation=0,launchGeneration=-1,editVersion=0,launchEditVersion=0,launchField=null,launchValue=null,lastFocused=null,raf=0,checkField=false;
 const active=()=>media.matches&&calc.classList.contains('active')&&!document.body.classList.contains('mobile-menu-open');
 const editable=el=>!!el&&calc.contains(el)&&el.tagName==='INPUT'&&!el.disabled&&!el.readOnly&&!['checkbox','radio','button','submit','hidden','file','range','color'].includes(el.type);
 function release(){dismissed=true;armed=false;generation++;}
 function bounds(){
  let top=0,height=window.innerHeight;
  if(viewport&&(!viewport.scale||viewport.scale<1.05)){
   const frameTop=frame?.getBoundingClientRect().top||0;top=Math.max(0,(viewport.offsetTop||0)-frameTop);
   height=Math.min(window.innerHeight-top,viewport.height||window.innerHeight);
  }
  return {top,height:Math.max(120,Math.round(height))};
 }
 function keepFieldVisible(box){
  const field=document.activeElement;if(!editable(field)||dismissed)return;
  const region=main.getBoundingClientRect(),rect=field.getBoundingClientRect(),top=Math.max(region.top,box.top)+10,bottom=Math.min(region.bottom,box.top+box.height)-12;
  if(rect.top<top)main.scrollTop-=top-rect.top;else if(rect.bottom>bottom)main.scrollTop+=rect.bottom-bottom;
 }
 function update(){
  raf=0;const enabled=active();document.body.classList.toggle('calc-mobile-v733',enabled);
  if(!enabled){document.body.style.removeProperty('--calc-visible-height-v733');document.body.style.removeProperty('--calc-visible-top-v733');visible=false;checkField=false;return;}
  const box=bounds();baseline=Math.max(baseline,box.height);
  const next=baseline-box.height>Math.max(100,baseline*.18);
  if(visible&&!next)release(); // Android's hide arrow often leaves the input focused.
  const justOpened=!visible&&next;visible=next;
  document.body.style.setProperty('--calc-visible-height-v733',box.height+'px');document.body.style.setProperty('--calc-visible-top-v733',box.top+'px');
  if(checkField||justOpened)keepFieldVisible(box);checkField=false;
 }
 function schedule(reveal=false){checkField||=reveal;if(!raf)raf=requestAnimationFrame(update);}
 window.__smCalcKeyboardV733={
  beginLaunch(){if(active()){launchGeneration=generation;launchEditVersion=editVersion;launchField=document.activeElement;launchValue=launchField?.value;}},
  canResetAfterLaunch(){return !media.matches||editVersion===launchEditVersion;},
  canRestoreFocus(field){
   if(!media.matches)return true;
   if(!active()||dismissed||!armed||!editable(field)||generation!==launchGeneration&&document.activeElement!==field)return false;
   return true;
  }
 };
 document.addEventListener('pointerdown',event=>{
  if(!active())return;
  if(editable(event.target)){armed=true;dismissed=false;generation++;}
  else if(!calc.contains(event.target)||event.target.closest?.('select,dialog,[role="dialog"],[aria-modal="true"]'))release();
 },true);
 // Cancel mouse focus transfer only after a tap: touch dragging remains native and scrollable.
 document.addEventListener('mousedown',event=>{
  if(!active()||dismissed||!armed||!editable(document.activeElement))return;
  const control=event.target.closest?.('#btnLancar,#btnLimparCampos,.destinos-lancamento label,#cargaEstoqueEscolha label,#transferenciaInlineV257 label,#servicosM3Lancamento label,#btnVerdeOuCorrigirV260');
  const background=calc.contains(event.target)&&!event.target.closest?.('input,textarea,select,button,a,label,summary,[tabindex],[role="button"],[role="dialog"]');
  if((control||background)&&event.cancelable){event.preventDefault();if(control?.id==='btnLancar'||control?.id==='btnLimparCampos')launchGeneration=generation;}
 },true);
 document.addEventListener('focusin',event=>{if(active()&&editable(event.target)){if(event.target!==lastFocused){generation++;lastFocused=event.target;}schedule(true);}},true);
 document.addEventListener('focusout',event=>{if(active()&&editable(event.target)&&!editable(event.relatedTarget))release();},true);
 document.addEventListener('input',event=>{if(active()&&editable(event.target)&&event.isTrusted){if(event.target!==launchField||event.target.value!==launchValue)editVersion++;if(!dismissed)armed=true;}},true);
 document.addEventListener('keydown',event=>{
  if(!active()||!editable(event.target))return;
  if(event.key==='Escape'){release();return;}
  // Pacotes used to blur on Enter. Keep editing instead of closing the native keyboard.
  if(event.target.id==='pacotesAdicionar'&&event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 viewport?.addEventListener('resize',()=>{if(visible&&baseline-bounds().height<=Math.max(100,baseline*.18))release();schedule();});viewport?.addEventListener('scroll',()=>schedule());
 window.addEventListener('resize',()=>schedule());
 window.addEventListener('orientationchange',()=>{baseline=0;visible=false;release();schedule();});
 if(media.addEventListener)media.addEventListener('change',()=>{baseline=0;schedule();});
 new MutationObserver(()=>{if(!active()){release();}schedule();}).observe(calc,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
 schedule();
})();
