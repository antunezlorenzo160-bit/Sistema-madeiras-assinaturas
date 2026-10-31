(() => {
 const code=document.getElementById('code'),copy=document.getElementById('copy'),select=document.getElementById('select'),status=document.getElementById('status');let source='';
 function selectAll(){code.focus();code.select();code.setSelectionRange(0,source.length);}
 fetch('/regras-acesso-planos.txt',{cache:'no-store'}).then(async response=>{
  if(!response.ok)throw Error();source=await response.text();
  if(!source.startsWith("rules_version = '2';")||!source.includes('EMPLOYEE_PERMISSIONS_V2')||!source.trimEnd().endsWith('}'))throw Error();
  code.value=source;copy.disabled=false;select.disabled=false;
  status.textContent='Código completo carregado: '+source.trimEnd().split('\n').length+' linhas. Use o botão Copiar código completo.';
 }).catch(()=>{status.textContent='Não foi possível carregar o código completo. Conecte à internet e atualize esta página.';});
 select.addEventListener('click',()=>{selectAll();status.textContent='Todo o código está selecionado. Escolha Copiar no menu do celular.';});
 copy.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(source);status.textContent='Código completo copiado. No Firebase, selecione todo o conteúdo do editor, cole no lugar e publique.';}
  catch{selectAll();let copied=false;try{copied=document.execCommand('copy');}catch{}status.textContent=copied?'Código completo copiado. Substitua todo o conteúdo do editor de regras no Firebase e publique.':'Todo o código está selecionado. Toque em Copiar no menu do celular e depois substitua o conteúdo no Firebase.';}
 });
})();
