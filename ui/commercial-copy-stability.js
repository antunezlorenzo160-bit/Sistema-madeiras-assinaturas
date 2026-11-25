// V837: preserve the prepared commercial document across unrelated list updates.
const commercialCopyBusyV837=new Set();
function commercialCopySignatureV837(gid){return JSON.stringify([romaneioSignatureV834(gid),orderDocCopyViewSignatureV837(gid)]);}
function commercialCopyCardV837(){const card=document.querySelector('#v408-detalhe .v392-carga-card[data-v399-grupo]');return card&&String(card.getAttribute('data-v399-grupo'))===String(estadoCargasV408.gid)?card:null;}
function markCommercialCopyV837(){
 const card=commercialCopyCardV837();if(!card)return;
 const gid=String(estadoCargasV408.gid),signature=commercialCopySignatureV837(gid),form=card.querySelector('.v400-copia-box'),node=card.querySelector('.v400-documento-comercial');
 if(form)form.copyViewSignatureV837=signature;if(node){node.copyViewSignatureV837=signature;node.copyViewGroupV837=gid;}
}
function captureCommercialCopyV837(){
 const card=commercialCopyCardV837();if(!card)return null;
 const form=card.querySelector('.v400-copia-box'),node=card.querySelector('.v400-documento-comercial'),signature=node?.copyViewSignatureV837||form?.copyViewSignatureV837;
 return signature?{gid:String(estadoCargasV408.gid),signature,node}:null;
}
function currentCommercialCopyV837(){const saved=captureCommercialCopyV837();return !!estadoCargasV408.copia&&!!saved&&commercialCopySignatureV837(saved.gid)===saved.signature;}
function restoreCommercialCopyV837(saved){
 const card=commercialCopyCardV837();if(!card)return;const form=card.querySelector('.v400-copia-box');
 if(!form)return;
 const gid=String(estadoCargasV408.gid),signature=commercialCopySignatureV837(gid);
 if(estadoCargasV408.copia)form.copyViewSignatureV837=signature;
 if(!saved?.node||saved.gid!==gid||saved.signature!==signature)return;
 const index=form.id.match(/^copiaFormV400_(\d+)$/)?.[1],oldId=saved.node.id,newId=index!==undefined?idCopiaPainelV400(Number(index)):oldId;
 if(newId!==oldId){for(const button of saved.node.querySelectorAll('[onclick]'))button.setAttribute('onclick',button.getAttribute('onclick').split(oldId).join(newId));saved.node.id=newId;}
 if(!card.contains(saved.node))card.appendChild(saved.node);saved.node.hidden=!estadoCargasV408.copia;
}
async function runCommercialCopyV837(gid,action,mark){
 const key=String(gid||'');if(commercialCopyBusyV837.has(key)||window.__smPrintingV556)return;
 employeeRequireLoadAdmin();const company=empresaV456;commercialCopyBusyV837.add(key);
 const controls=[...(commercialCopyCardV837()?.querySelectorAll('button')||[])].filter(el=>/mostrarCopiaV408|gerarCopiaComercialV400|pdfCopiaComercialV400/.test(el.getAttribute('onclick')||'')).map(el=>({el,disabled:el.disabled,text:el.textContent}));
 try{
  for(const {el}of controls){el.disabled=true;el.textContent='Preparando…';}
  await action();if(mark&&company===empresaV456&&key===String(estadoCargasV408.gid))markCommercialCopyV837();
 }catch(error){alert(error.message||'Não foi possível preparar a cópia comercial.');}
 finally{commercialCopyBusyV837.delete(key);for(const {el,disabled,text}of controls)if(el.isConnected!==false){el.disabled=disabled;el.textContent=text;}}
}
const commercialCopyActionsV837={show:mostrarCopiaV408,generate:gerarCopiaComercialV400,pdf:pdfCopiaComercialV400};
mostrarCopiaV408=function(){const gid=estadoCargasV408.gid;return runCommercialCopyV837(gid,()=>commercialCopyActionsV837.show(),true);};
gerarCopiaComercialV400=function(gid,idx){return runCommercialCopyV837(gid,()=>commercialCopyActionsV837.generate(gid,idx),true);};
pdfCopiaComercialV400=function(id){const gid=document.getElementById(id)?.getAttribute('data-v405-gid')||estadoCargasV408.gid;return runCommercialCopyV837(gid,()=>commercialCopyActionsV837.pdf(id),false);};
