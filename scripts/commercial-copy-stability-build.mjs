import {readFileSync} from 'node:fs';
export function applyCommercialCopyStabilityV837(app){
 if(app.includes('// COMMERCIAL_COPY_STABILITY_V837'))return app;
 const replace=(a,b)=>{if(!app.includes(a)||app.indexOf(a)!==app.lastIndexOf(a))throw Error('Commercial copy stability: anchor changed '+a.slice(0,80));app=app.replace(a,()=>b);};
 replace('  async function mostrarCopiaV408(){','// COMMERCIAL_COPY_STABILITY_V837\n'+readFileSync(new URL('../ui/commercial-copy-stability.js',import.meta.url),'utf8')+'\n  async function mostrarCopiaV408(){');
 replace("if(!estadoCargasV408.copia){if(!await orderDocExportV767(estadoCargasV408.gid))return;orderDocResetCopyV771(estadoCargasV408.gid);renderCarregamentosV392();}", "if(!estadoCargasV408.copia){const gid=estadoCargasV408.gid;if(!await orderDocExportV767(gid)||String(gid)!==String(estadoCargasV408.gid))return;orderDocResetCopyV771(gid);renderCarregamentosV392();}");
 replace('    const previewV834=captureRomaneioV834();','    const previewV834=captureRomaneioV834(),copyV837=captureCommercialCopyV837();');
 replace('    restoreRomaneioV834(previewV834);','    restoreRomaneioV834(previewV834);\n    restoreCommercialCopyV837(copyV837);');
 replace('lotePacotesEmCurso||currentRomaneioV834())return;','lotePacotesEmCurso||currentRomaneioV834()||currentCommercialCopyV837())return;');
 return app;
}
