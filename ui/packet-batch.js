async function adicionarPacotesDigitados(){
 if(adicionandoPacotesDigitados)return;
 const texto=entradaPacotes.value.trim(),numero=Number(texto);
 if(!texto)return;
 if(!Number.isSafeInteger(numero)||numero<1){alert('Informe uma quantidade inteira e positiva de pacotes.');return;}
 if(modoMedida!=='m2'||!contadorPacotesLigado){alert('Ligue o contador de pacotes para adicionar.');return;}
 conferirMedidaContadorPacotes();
 const botao=$('btnLancar'),rotulo=botao.textContent;
 const controls=[...document.querySelectorAll('#calculadora input,#calculadora select,#calculadora button')].map(el=>({el,disabled:el.disabled}));
 adicionandoPacotesDigitados=true;lotePacotesEmCurso=true;
 for(const {el}of controls)el.disabled=true;
 botao.disabled=true;botao.textContent='Lançando 0 de '+numero+'…';
 let concluidos=0,falha=null;
 try{
  for(let i=0;i<numero;i++){
   const antes=contadorPacotes;await lancar();if(contadorPacotes<=antes)break;
   concluidos++;
   if(concluidos%10===0){
    persistirBlocoPacotes();
    botao.textContent='Lançando '+concluidos+' de '+numero+'…';
    await new Promise(resolve=>setTimeout(resolve,0));
   }else if(concluidos%2===0)await new Promise(resolve=>setTimeout(resolve,0));
   if(document.hidden)break;
  }
 }catch(error){falha=error;}
 finally{
  // Always release the UI, including when a local persistence checkpoint fails.
  try{persistirBlocoPacotes();}catch(error){falha=error;}
  finally{
   lotePacotesEmCurso=false;adicionandoPacotesDigitados=false;
   for(const {el,disabled}of controls)el.disabled=disabled;
   botao.textContent=rotulo;
   entradaPacotes.value=concluidos===numero?'':String(numero-concluidos);
  }
 }
 // Repaint once after the saved batch, rather than once per package.
 if(falha){alert('O lote foi interrompido após '+concluidos+' pacote(s). Não repita o lote inteiro. Confira o resumo e preserve esta página. Falha ao salvar: '+String(falha?.message||falha));return;}
 calcPreview();atualizarTelasAposLancamento(destinoSelecionado());atualizarPainelPacotes();
 if(concluidos<numero)atualizarStatusSync('aguarda',concluidos+' de '+numero+' pacote(s) lançados; confira a quantidade restante antes de continuar');
 sincronizarOfflineOps().catch(()=>{});
}
