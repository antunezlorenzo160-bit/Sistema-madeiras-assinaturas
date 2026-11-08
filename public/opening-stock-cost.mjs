// An explicit valuation of old wood, never a default purchase or a new expense.
export function normalizeOpeningStockCost(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Custo do estoque antigo inválido.');
 const unitCents=input.unitCents??null,cutoffAt=input.cutoffAt??null,revision=input.revision??0;
 if(unitCents!==null&&(!Number.isSafeInteger(unitCents)||unitCents<=0||unitCents>100000000000))throw Error('Informe um custo por m³ maior que zero.');
 if(!Number.isSafeInteger(revision)||revision<0||cutoffAt!==null&&(!Number.isSafeInteger(cutoffAt)||cutoffAt<=0)||revision>0&&cutoffAt===null)throw Error('Versão do custo antigo inválida.');
 return {unitCents,cutoffAt,revision};
}
