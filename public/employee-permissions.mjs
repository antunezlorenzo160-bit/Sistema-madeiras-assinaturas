export const EMPLOYEE_AREAS=Object.freeze({clients:'Clientes',catalog:'Cadastro de madeiras',calculator:'Calculadora',budgets:'Orçamentos',orders:'Pedidos',production:'Produção',stock:'Estoque e histórico',loads:'Carregamentos em montagem',services:'Serviços e toras'});
export function expandEmployeePermissions(input={},version=2){
 const result={...input};
 if(version===1){result.orders={...(input.budgets||{})};result.production={...(input.budgets||{})};}
 return result;
}
export function normalizePermissions(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(EMPLOYEE_AREAS,k)))throw Error('Permissões inválidas.');
 const result={};
 for(const area of Object.keys(EMPLOYEE_AREAS)){
  const p=input[area]||{};
  if(typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['read','write'].includes(k))||['read','write'].some(k=>p[k]!==undefined&&typeof p[k]!=='boolean'))throw Error('Permissões inválidas.');
  result[area]={read:p.read===true||p.write===true,write:p.write===true};
 }
 // Catalog reads needed for calculation are internal, not permission to open its page.
 if(result.calculator.read)result.services.read=true;
 return result;
}
export function permissionPreset(role='Venda'){
 const p={};const allow=(area,write=false)=>p[area]={read:true,write};
 if(role==='Venda'){allow('calculator',true);allow('clients',true);allow('budgets',true);allow('orders',true);}
 else if(role==='Estoque'){allow('calculator',true);allow('stock',true);allow('loads',true);}
 else if(role==='Produção')allow('production',true);
 return normalizePermissions(p);
}
export function employeeCan(member,area,write=false){
 if(member?.ativo!==true)return false;
 if(member.papel==='admin')return true;
 if(![1,2].includes(member.permissionsVersion)||!Object.hasOwn(EMPLOYEE_AREAS,area))return false;
 const key=member.permissionsVersion===1&&['orders','production'].includes(area)?'budgets':area;
 const p=member.permissoes?.[key];return p?.read===true&&(!write||p.write===true);
}
export function employeeCollectionArea(name){return ({sm2_clientes:'clients',sm2_madeiras:'catalog',sm2_estoque1:'stock',sm2_estoque2:'stock',sm2_movimentos:'stock',sm2_carregamentos:'loads',sm2_orcamento_itens:'budgets',sm2_orcamentos_guardados:'orders',sm2_servicos:'services',sm2_resumos_calculadora:'calculator'})[name]||null;}
export function employeeCollectionCan(member,name,write=false){
 if(member?.ativo!==true)return false;
 if(name==='sm2_empresas_perfis_dev')return !write||member.papel==='admin';
 if(name==='sm2_sync_status')return !write||member.papel==='admin';
 if(name==='sm2_madeiras'&&!write)return ['catalog','calculator','budgets','orders','stock','loads'].some(area=>employeeCan(member,area));
 return employeeCan(member,employeeCollectionArea(name),write);
}
