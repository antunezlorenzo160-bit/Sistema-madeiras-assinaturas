import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function buildCompanyOnboarding(input=new URL('../public/index.html',import.meta.url)){
 const file=input instanceof URL?input:pathToFileURL(resolve(input));
 let html=readFileSync(file,'utf8');
 if(html.includes('// COMPANY_ONBOARDING_V702'))return;
 const key='const TEMPLATE=',start=html.indexOf(key)+key.length;
 let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let app=JSON.parse(html.slice(start,end)),outer=html.slice(end);
 function replace(text,before,after){if(!text.includes(before)||text.indexOf(before)!==text.lastIndexOf(before))throw Error('Trecho de acesso mudou: '+before.slice(0,70));return text.replace(before,()=>after);}
 app=replace(app,"if(!ctx||ctx.empresaId!=='mdeiras-oeste-pkwj3e')throw Error('Contexto de empresa ausente.');","if(!ctx||typeof ctx.uid!=='string'||typeof ctx.empresaId!=='string'||!/^[-A-Za-z0-9_]{1,120}$/.test(ctx.empresaId))throw Error('Contexto de empresa ausente.');");
 app=replace(app,"nome:profile.nome||'Mdeiras Oeste — simulação'","nome:profile.nome||'Minha empresa'");
 outer=replace(outer,"const expected={DurgNdPxYEVeMkaVeGhfDQeNDTF3:'mdeiras-oeste-pkwj3e'};",`// COMPANY_ONBOARDING_V702
const expected=Object.create(null);
function empresaValidaV702(value){return typeof value==='string'&&/^[-A-Za-z0-9_]{1,120}$/.test(value);}`);
 outer=replace(outer,"const empresaId=expected[uid];if(!empresaId||auth.currentUser?.uid!==uid)throw Error('Sessão não disponível para esta empresa.');", "if(auth.currentUser?.uid!==uid)throw Error('Sessão não disponível para esta empresa.');");
 outer=replace(outer,"if(registro?.bloqueado===true)throw Error('Acesso precisa ser validado novamente com internet.');", "if(registro?.bloqueado===true)throw Error('Acesso precisa ser validado novamente com internet.');\n if(registro?.uid!==uid||registro?.ativo!==true||!empresaValidaV702(registro?.empresaId))throw Error('Abra com internet para confirmar sua empresa neste aparelho.');\n const empresaId=registro.empresaId;expected[uid]=empresaId;");
 outer=replace(outer,"  const empresaId=expected[uid];\n  if(!empresaId)throw Error('Conta fora deste ensaio.');\n  await lerVinculoOffline(uid);", "  await lerVinculoOffline(uid);");
 outer=replace(outer,"  await exigeNegado(sdk.doc(probeDb,'empresas','mdeiras-oeste-pkwj3e','dados','sm2_madeiras','registros','verificacao_v462'),'dados da empresa sem login');\n  const empresaId=expected[uid];\n  if(!empresaId)throw Error('Conta fora deste ensaio.');\n  const m=await sdk.getDocFromServer(sdk.doc(db,'membros',uid));\n  if(!m.exists()||m.data().ativo!==true||m.data().empresaId!==empresaId)throw Error('Vínculo ausente, inativo ou diferente do esperado.');\n  await exigeNegado(sdk.doc(db,'empresas','maderas-oeste-q7igv5','dados','sm2_madeiras','registros','verificacao_v462'),'empresa diferente');", `  const m=await sdk.getDocFromServer(sdk.doc(db,'membros',uid));
  if(!m.exists()||m.data().ativo!==true||!empresaValidaV702(m.data().empresaId))throw Error('Vínculo ausente ou inativo. Conclua o cadastro pelo convite.');
  const empresaId=m.data().empresaId;expected[uid]=empresaId;
  await exigeNegado(sdk.doc(probeDb,'empresas',empresaId,'dados','sm2_madeiras','registros','verificacao_v462'),'dados da empresa sem login');
  const outraEmpresa=empresaId==='mdeiras-oeste-pkwj3e'?'maderas-oeste-q7igv5':'mdeiras-oeste-pkwj3e';
  await exigeNegado(sdk.doc(db,'empresas',outraEmpresa,'dados','sm2_madeiras','registros','verificacao_v462'),'empresa diferente');`);
 html=html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+outer;writeFileSync(file,html);
 console.log('Abertura por vínculo ativo da empresa, com validações de isolamento preservadas.');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)buildCompanyOnboarding(process.argv[2]);
