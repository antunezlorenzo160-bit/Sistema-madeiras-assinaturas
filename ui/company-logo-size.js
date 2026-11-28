// V835: company logo sizing only; the homepage and platform watermark are independent.
(() => {
 const scale=value=>{const n=Number(value);return Number.isFinite(n)&&n>=50&&n<=250?Math.round(n):100;};
 window.__smLogoPdfScaleV835=scale;
 window.__smLogoPdfStyleV835=value=>{
  const factor=scale(value)/100,width=Number((24*factor).toFixed(2)),height=Number((13*factor).toFixed(2));
  return 'width:'+width+'mm!important;height:'+height+'mm!important;max-width:'+width+'mm!important;max-height:'+height+'mm!important;object-fit:contain!important;flex:0 0 auto!important';
 };
 function preview(){
  const slider=document.getElementById('empresaLogoEscalaPdfV835'),value=scale(slider?.value),output=document.getElementById('empresaLogoEscalaValorV835'),img=document.getElementById('empresaLogoPreview');
  if(output)output.textContent=value+'%';
  if(img){img.style.width=Number((240*value/100).toFixed(1))+'px';img.style.height=Number((130*value/100).toFixed(1))+'px';img.style.maxWidth='100%';img.style.maxHeight='none';img.style.objectFit='contain';}
 }
 window.__smLogoPdfPreviewV835=preview;
 document.addEventListener('input',event=>{if(event.target?.id==='empresaLogoEscalaPdfV835')preview();});
})();
