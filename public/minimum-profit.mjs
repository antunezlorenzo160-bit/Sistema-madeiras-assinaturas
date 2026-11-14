// Company-wide minimum gain on wood cost. This only evaluates; it never changes prices.
export function normalizeMinimumProfitPolicy(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Configuração do lucro mínimo inválida.');
 const revision=value.revision??0,minimumBasisPoints=value.minimumBasisPoints??null;
 if(!Number.isSafeInteger(revision)||revision<0)throw Error('Versão da configuração inválida.');
 if(minimumBasisPoints!==null&&(!Number.isSafeInteger(minimumBasisPoints)||minimumBasisPoints<0||minimumBasisPoints>100000))throw Error('Informe um percentual de 0 a 1000%, com até duas casas decimais.');
 return {minimumBasisPoints,revision};
}
export function minimumProfitPercentInput(value){
 const text=String(value??'').trim();if(!text)return null;
 if(!/^\d+(?:[.,]\d{1,2})?$/.test(text))throw Error('Informe somente a porcentagem, com até duas casas decimais.');
 const [whole,decimal='']=text.replace(',','.').split('.'),points=Number(whole)*100+Number(decimal.padEnd(2,'0'));
 return normalizeMinimumProfitPolicy({minimumBasisPoints:points}).minimumBasisPoints;
}
export function expectedMinimumProfit(costCents,points){
 if(!Number.isSafeInteger(costCents)||costCents<0)throw Error('Custo inválido para avaliar o mínimo.');
 normalizeMinimumProfitPolicy({minimumBasisPoints:points});if(points===null)return null;
 const result=Number((BigInt(costCents)*BigInt(points)+9999n)/10000n);if(!Number.isSafeInteger(result)||!Number.isSafeInteger(costCents+result))throw Error('Limite de cálculo do mínimo atingido.');return result;
}
export function evaluateMinimumProfit(entry,rawPolicy){
 const policy=normalizeMinimumProfitPolicy(rawPolicy);if(policy.minimumBasisPoints===null)return {status:'disabled'};
 if(entry.type!=='sale'||!['active','pending-review'].includes(entry.status))return {status:'ignored'};
 if(entry.status==='pending-review')return {status:'pending-review'};
 if(entry.costCents===null||entry.costCents===undefined)return {status:'pending-cost'};
 if(!Number.isSafeInteger(entry.amountCents)||entry.amountCents<0)throw Error('Venda inválida para avaliar o mínimo.');
 const split=entry.source?.type==='load-sale'?entry.source:null;
 if(split&&(split.pendingServiceLines>0||split.serviceCents===null))return {status:'pending-service'};
 const woodCents=split?.woodCents??entry.amountCents;
 if(!Number.isSafeInteger(woodCents)||woodCents<0||woodCents>entry.amountCents)throw Error('Separação da venda inválida para avaliar o mínimo.');
 const requiredCents=expectedMinimumProfit(entry.costCents,policy.minimumBasisPoints),grossCents=woodCents-entry.costCents;
 return {status:grossCents<requiredCents?'below':'met',requiredCents,grossCents,minimumSaleCents:entry.costCents+requiredCents,shortfallCents:Math.max(0,requiredCents-grossCents),actualPercent:entry.costCents>0?grossCents/entry.costCents*100:null};
}
export function assessMinimumProfitPeriod(entries,total,rawPolicy){
 const policy=normalizeMinimumProfitPolicy(rawPolicy),result={enabled:policy.minimumBasisPoints!==null,saleCount:0,belowCount:0,pendingCount:0,requiredCents:0,periodBelow:null,shortfallCents:null,serviceCents:0};if(!result.enabled)return result;
 for(const entry of entries){const assessment=evaluateMinimumProfit(entry,policy);if(assessment.status==='disabled'||assessment.status==='ignored')continue;result.saleCount++;if(entry.source?.type==='load-sale'&&Number.isSafeInteger(entry.source.serviceCents))result.serviceCents+=entry.source.serviceCents;if(assessment.status.startsWith('pending-'))result.pendingCount++;else{result.requiredCents+=assessment.requiredCents;if(assessment.status==='below')result.belowCount++;}}
 if(!Number.isSafeInteger(result.requiredCents))throw Error('Limite de cálculo do mínimo atingido.');
 if(result.pendingCount||total.result===null){result.requiredCents=null;return result;}
 if(result.saleCount){const woodResult=total.result-result.serviceCents;result.periodBelow=woodResult<result.requiredCents;result.shortfallCents=Math.max(0,result.requiredCents-woodResult);}return result;
}
