export function calcularParcelasPromissoria(percentuais,total){
  if(!Array.isArray(percentuais)||percentuais.length<2||percentuais.length>12||!Number.isSafeInteger(total)||total<=0)
    throw new Error('Informe de 2 a 12 parcelas.');
  const partes=percentuais.map(valor=>{
    const texto=String(valor).trim().replace(',','.');
    if(!/^\d{1,3}(?:\.\d{1,2})?$/.test(texto))throw new Error('Informe percentuais positivos, com até duas casas decimais.');
    return Math.round(Number(texto)*100);
  });
  if(partes.some(valor=>valor<=0)||partes.reduce((soma,valor)=>soma+valor,0)!==10000)
    throw new Error('Os percentuais das parcelas devem somar 100%.');
  const numerador=partes.map(parte=>BigInt(total)*BigInt(parte));
  const centavos=numerador.map(valor=>Number(valor/10000n));
  const ordem=numerador.map((valor,index)=>({index,resto:Number(valor%10000n)})).sort((a,b)=>b.resto-a.resto);
  const sobra=total-centavos.reduce((soma,valor)=>soma+valor,0);
  for(let i=0;i<sobra;i++)centavos[ordem[i].index]++;
  if(centavos.some(valor=>valor<=0))throw new Error('Cada parcela deve ter pelo menos um centavo.');
  return centavos;
}
