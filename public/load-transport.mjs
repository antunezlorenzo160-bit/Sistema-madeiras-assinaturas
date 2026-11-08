import {stockChartDate} from './stock-charts.mjs';
export const TRANSPORT_COSTS=Object.freeze({carrier:'Transportador contratado',fuel:'Combustível',tolls:'Pedágios',driver:'Motorista',maintenance:'Manutenção / pneus',other:'Outros gastos'});
export function transportCostKeys(mode){return mode==='own'?['fuel','tolls','driver','maintenance','other']:mode==='contracted'?['carrier','tolls','other']:[];}
export function normalizeLoadTransport(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['loadId','revision','mode','date','costs'].includes(k)))throw Error('Dados do transporte inválidos.');
 if(typeof input.loadId!=='string'||input.loadId.length<1||input.loadId.length>180||/[\u0000-\u001f]/.test(input.loadId)||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('Carregamento ou versão inválidos.');
 if(!['own','contracted','customer'].includes(input.mode)||typeof input.date!=='string'||stockChartDate(input.date)!==input.date)throw Error('Confira o transporte e a data da despesa.');
 if(!input.costs||typeof input.costs!=='object'||Array.isArray(input.costs)||Object.keys(input.costs).some(k=>!Object.hasOwn(TRANSPORT_COSTS,k)))throw Error('Confira os gastos do transporte.');
 const costs={},allowed=transportCostKeys(input.mode);let totalCents=0;
 for(const key of Object.keys(TRANSPORT_COSTS)){
  const value=input.costs[key];if(!Number.isSafeInteger(value)||value<0||value>100000000000||!allowed.includes(key)&&value!==0)throw Error('Informe somente os gastos reais deste tipo de transporte, com valores positivos.');
  costs[key]=value;totalCents+=value;
 }
 if(totalCents>100000000000)throw Error('Total de gastos acima do limite permitido.');
 return {loadId:input.loadId,revision:input.revision,mode:input.mode,date:input.date,costs,totalCents};
}
