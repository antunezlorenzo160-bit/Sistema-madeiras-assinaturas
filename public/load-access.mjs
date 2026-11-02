export function loadActor(member,uid){
 if(!member||member.ativo!==true||typeof uid!=='string'||!uid)throw Error('Conta não confirmada.');
 return {uid,name:String(member.nome||member.email||uid)};
}
export function isLoadDraft(item){return item?.cargaStatus==='montagem'&&item?.cargaFechadaEm==null&&item?.cargaBaixadaEm==null&&!item?.cargaConferidaPor;}
export function loadContributors(items){return [...new Set((items||[]).filter(x=>x?.cargaCriadaPorUid&&x?.cargaCriadaPorNome).map(x=>String(x.cargaCriadaPorNome)))].join(', ')||'Autor não registrado na versão anterior';}
export const LOAD_ADMIN_FIELDS=Object.freeze(['dadosClienteCargaV407','dadosTransporteCargaV414','dadosFiscalCargaV559','financeiroOriginalV403','financeiroCopiaV403','copiaComercialPercentualV400','copiaComercialPercentualV399','copiaComercialAtualizadaEmV400','copiaComercialAtualizadaEmV399','cargaConferidaPor','cargaConferidaPorUid','cargaFechadaPor','cargaFechadaPorUid']);
export function employeeLoadWriteAllowed(current,next,actor,mode='set'){
 if(mode==='delete')return false;
 if(!next||!current&&!isLoadDraft(next))return false;
 if(!current)return next.cargaFluxoV388===true&&typeof next.grupoCargaId==='string'&&next.grupoCargaId.length>0&&next.cargaCriadaPorUid===actor.uid&&next.cargaCriadaPorNome===actor.name&&!LOAD_ADMIN_FIELDS.some(k=>Object.hasOwn(next,k));
 if(!isLoadDraft(current))return false;
 const merged=mode==='merge'?{...current,...next}:next;
 if(!isLoadDraft(merged))return false;
 const keys=new Set([...Object.keys(current),...Object.keys(merged)]);
 return [...keys].every(k=>['atualizadoEm','ocultoResumo'].includes(k)||JSON.stringify(current[k])===JSON.stringify(merged[k]));
}
