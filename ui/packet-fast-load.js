// Fast assembly only: never deduct stock or duplicate a production-linked row.
function copiarPacotesCargaV780(maximum){
 if(destinoSelecionado()!=='carga'||modoMedida!=='m2'||!contadorPacotesLigado||producaoCalcPendente)return 0;
 const seed=lancamentos.at(-1);
 if(!seed||seed.tipoMedida!=='m2'||!seed.contadoComoPacote||seed.cargaFluxoV388!==true||seed.cargaStatus!=='montagem'||seed.cargaBaixadaEm||seed.producaoPendenteV388)return 0;
 const serialized=JSON.stringify(seed);let count=0;
 for(let index=0;index<Math.min(maximum,499);index++){
  const row=JSON.parse(serialized);row.id=crypto.randomUUID();row.atualizadoEm=Date.now();
  enfileirarOffline(COL.cargas,row.id,row,'set');
  carregamentos.push(row);lancamentos.push({...row});contadorPacotes++;count++;
 }
 return count;
}
