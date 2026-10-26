async function enviarOperacaoOrcamentoV705(op){
  const reference=doc(db,op.nome,op.id);
  const sdk=parent.__v470Runtime().sdk;
  return sdk.runTransaction(db,async transaction=>{
    const read=diagnosticoLeiturasV700.wrapRead('verificacaoOperacaoPendente',ref=>transaction.get(ref));
    const previous=await read(reference);
    const reactivation=op.modo==='merge'&&op.obj?.excluido===false;
    // A delayed full record must not undo an exclusion from another device.
    // Explicit reopening of a saved budget is the existing merge:false-flag flow.
    if(previous.exists()&&previous.data().excluido===true&&op.obj?.excluido!==true&&!reactivation)return 'obsolete';
    const options=op.modo==='merge'?{merge:true}:undefined;
    const data=parent.__smDadosFirestoreV538(normalizarRegistroOrcamentoV703(reference,op.obj||{},options));
    if(options)transaction.set(reference,data,parent.__smDadosFirestoreV538(options));
    else transaction.set(reference,data);
    return 'written';
  });
}
