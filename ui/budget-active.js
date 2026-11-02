let orcamentoFiltradoV704=false;
async function prepararOrcamentoAtivoV704(){
  if(!FILTRO_ORCAMENTO_V704||!conexaoOnline())return;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
    const user=parent.__v470Runtime().auth.currentUser;
    if(user?.uid!==boundV456.uid)return;
    const token=await user.getIdToken();
    const response=await fetch('/.netlify/functions/budget-schema',{method:'POST',headers:{Authorization:'Bearer '+token},signal:controller.signal});
    if(!response.ok)return;
    const result=await response.json();
    orcamentoFiltradoV704=result.ready===true&&parent.__v470Runtime().auth.currentUser?.uid===boundV456.uid;
  }catch{
    // If preparation fails, retain the full query so legacy active rows remain visible.
    orcamentoFiltradoV704=false;
  }finally{clearTimeout(timer);}
}
function consultaColecaoAtivaV704(nome){
  const reference=collection(db,nome);
  if(nome!==COL.orcamento||!orcamentoFiltradoV704)return reference;
  const sdk=parent.__v470Runtime().sdk;
  const filtered=sdk.query(reference,sdk.where('excluido','==',false));
  return diagnosticoLeiturasV700.identify(filtered,reference.path);
}
