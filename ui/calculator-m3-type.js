function calcTypeRefreshV829(){
 const select=document.getElementById('calcTipoM3V829');if(!select)return '';
 const wood=madeiras.find(x=>String(x.id)===String($('calcMadeira').value)),id=String(wood?.id||''),thickness=Number($('espessura').value||0);
 const choices=m3TypeChoicesV829(normalizarBitolasCadastroV347(wood?.bitolas||[]),thickness);
 let selected=id===select.dataset.woodV829?select.value:'';select.dataset.woodV829=id;
 if(!choices.includes(selected))selected=choices.length===1?choices[0]:'';
 const signature=JSON.stringify([id,thickness,choices]);
 if(select.dataset.optionsV829!==signature){
  select.innerHTML='<option value="">'+(choices.length?'Selecione o tipo':thickness>0?'Tipo não cadastrado':'Informe a espessura')+'</option>'+choices.map(type=>'<option value="'+esc(type)+'">'+esc(type)+'</option>').join('');
  select.dataset.optionsV829=signature;
 }
 select.value=selected;select.disabled=!choices.length;
 return selected;
}
function calcTypeValidateV829(){
 const selected=calcTypeRefreshV829(),select=document.getElementById('calcTipoM3V829');
 return select&&!select.disabled&&!selected?'Selecione o tipo cadastrado para esta espessura.':'';
}
document.getElementById('calcTipoM3V829')?.addEventListener('change',()=>{if(modoMedida==='m3'||modoMedida==='m3fechado')atualizarPrecoBitolaCalculadora();});
