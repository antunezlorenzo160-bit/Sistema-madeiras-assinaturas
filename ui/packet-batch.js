async function adicionarPacotesDigitados(){
 if(adicionandoPacotesDigitados||window.__smPacketPersistencePendingV778)return;
 const texto=entradaPacotes.value.trim(),numero=Number(texto);
 if(!texto)return;
 if(!Number.isSafeInteger(numero)||numero<1){alert('Informe uma quantidade inteira e positiva de pacotes.');return;}
 if(modoMedida!=='m2'||!contadorPacotesLigado){alert('Ligue o contador de pacotes para adicionar.');return;}
 conferirMedidaContadorPacotes();
 const botao=$('btnLancar'),rotulo=botao.textContent;
 const controls=[...document.querySelectorAll('#calculadora input,#calculadora select,#calculadora button')].map(el=>({el,disabled:el.disabled}));
 adicionandoPacotesDigitados=true;lotePacotesEmCurso=true;window.__smPacketBatchActiveV779=true;
 for(const {el}of controls)el.disabled=true;
 botao.disabled=true;botao.textContent='Lançando 0 de '+numero+'…';
 let concluidos=0,ultimoSalvo=0,falha=null;
 try{
  for(let i=0;i<numero;i++){
   const antes=contadorPacotes;await lancar();if(contadorPacotes<=antes)break;
   concluidos++;
   const beforeCopies=contadorPacotes;let copied=0;
   try{copied=copiarPacotesCargaV780(numero-concluidos);}
   finally{const added=Math.max(0,contadorPacotes-beforeCopies);concluidos+=added;i+=added;}
   if(copied>0||concluidos%10===0){
    botao.textContent='Salvando '+concluidos+' de '+numero+'…';
    await persistirBlocoPacotes();ultimoSalvo=concluidos;
    botao.textContent='Lançando '+concluidos+' de '+numero+'…';
    await new Promise(resolve=>setTimeout(resolve,0));
   }else if(concluidos%2===0)await new Promise(resolve=>setTimeout(resolve,0));
   if(document.hidden)break;
  }
 }catch(error){falha=error;}
 finally{
  // Always release the UI, including when a local persistence checkpoint fails.
  try{if(concluidos>ultimoSalvo||falha)await persistirBlocoPacotes();}catch(error){falha=error;}
  finally{
   lotePacotesEmCurso=false;adicionandoPacotesDigitados=false;window.__smPacketBatchActiveV779=false;
   for(const {el,disabled}of controls)el.disabled=disabled;
   botao.textContent=rotulo;
   entradaPacotes.value=concluidos===numero?'':String(numero-concluidos);
  }
 }
 // Repaint once after the saved batch, rather than once per package.
 if(falha){packetPersistenceFailureV778();alert('O lote foi interrompido após '+concluidos+' pacote(s). Não repita o lote inteiro. Confira o resumo e preserve esta página. Falha ao salvar: '+String(falha?.message||falha));return;}
 calcPreview();atualizarTelasAposLancamento(destinoSelecionado());atualizarPainelPacotes();
 if(concluidos<numero)atualizarStatusSync('aguarda',concluidos+' de '+numero+' pacote(s) lançados; confira a quantidade restante antes de continuar');
 else if(concluidos>0)atualizarStatusSync('aguarda',concluidos+' pacote(s) salvos neste aparelho • envio pendente de confirmação');
 sincronizarOfflineOps().catch(()=>{});
}
function packetPersistenceFailureV778(){
 window.__smPacketPersistencePendingV778=true;
 $('btnLancar').disabled=true;
 let retry=document.getElementById('packetRetrySaveV778');
 if(!retry){retry=document.createElement('button');retry.id='packetRetrySaveV778';retry.type='button';retry.className='btn btn-secondary';retry.textContent='Tentar salvar sem lançar novamente';$('btnLancar').after(retry);}
 retry.onclick=async()=>{
  if(lotePacotesEmCurso)return;
  lotePacotesEmCurso=true;window.__smPacketBatchActiveV779=true;
  try{
   await persistirBlocoPacotes();
   window.__smPacketPersistencePendingV778=false;retry.remove();$('btnLancar').disabled=false;
   atualizarStatusSync('aguarda','Lote salvo no aparelho; confira o resumo antes de continuar');
  }catch(error){alert('Os dados ainda não puderam ser salvos. Preserve esta página. '+String(error?.message||error));}
  finally{lotePacotesEmCurso=false;window.__smPacketBatchActiveV779=false;}
  if(!window.__smPacketPersistencePendingV778){calcPreview();atualizarTelasAposLancamento(destinoSelecionado());atualizarPainelPacotes();sincronizarOfflineOps().catch(()=>{});}
 };
}
