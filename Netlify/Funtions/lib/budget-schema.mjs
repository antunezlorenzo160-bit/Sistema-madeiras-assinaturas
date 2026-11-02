export async function prepareBudgetSchema(db,empresaId,uid,now=Date.now(),{readOnly=false}={}){
  const base=`empresas/${empresaId}/dados/`,marker=db.doc(base+'sm2_sync_status/registros/orcamento_schema_v704');
  const previous=await marker.get();
  if(previous.exists&&previous.data().version===1)return {ready:true,migrated:0};
  if(readOnly)return {ready:false,migrated:0,readOnly:true};
  const collection=db.collection(base+'sm2_orcamento_itens/registros');
  const all=await collection.get();
  const candidates=all.docs.filter(doc=>{const data=doc.data();return data.excluido!==true&&data.excluido!==false;});
  let migrated=0;
  // Re-read each candidate transactionally: another device may exclude it
  // after the initial scan. Only add the flag; never replace a full record.
  for(let offset=0;offset<candidates.length;offset+=10){
    const results=await Promise.all(candidates.slice(offset,offset+10).map(candidate=>db.runTransaction(async tx=>{
      const latest=await tx.get(candidate.ref);
      if(!latest.exists||latest.data().excluido===true||latest.data().excluido===false)return false;
      tx.update(candidate.ref,{excluido:false});return true;
    })));
    migrated+=results.filter(Boolean).length;
  }
  await marker.set({version:1,preparedAt:now,preparedBy:uid,migrated});
  return {ready:true,migrated};
}
