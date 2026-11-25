import {readFileSync} from 'node:fs';
export function applyCompanyLogoSizeV835(app){
 if(app.includes('id="company-logo-size-v835"'))return app;
 const replace=(a,b)=>{if(!app.includes(a)||app.indexOf(a)!==app.lastIndexOf(a))throw Error('Company logo size: anchor changed '+a.slice(0,100));app=app.replace(a,()=>b);};
 replace('</head>','<script id="company-logo-size-v835">'+readFileSync(new URL('../ui/company-logo-size.js',import.meta.url),'utf8')+'</script></head>');
 replace('            <label>Prévia</label>',`            <label for="empresaLogoEscalaPdfV835">Tamanho da logo nos PDFs: <output id="empresaLogoEscalaValorV835">100%</output></label>
            <input id="empresaLogoEscalaPdfV835" type="range" min="50" max="250" step="10" value="100">
            <p class="note">Ajuste a prévia e salve a empresa para aplicar nos PDFs.</p>
            <label>Prévia</label>`);
 replace("   setPreview(e.logoDataUrl||'');", "   if($('empresaLogoEscalaPdfV835'))$('empresaLogoEscalaPdfV835').value=window.__smLogoPdfScaleV835(e.logoEscalaPdfV835);\n   setPreview(e.logoDataUrl||'');");
 replace("else{img.removeAttribute('src');img.hidden=true;vazio.hidden=false}}", "else{img.removeAttribute('src');img.hidden=true;vazio.hidden=false}window.__smLogoPdfPreviewV835();}");
 replace("   const arq=$('empresaLogoArquivo');", "   e.logoEscalaPdfV835=window.__smLogoPdfScaleV835($('empresaLogoEscalaPdfV835')?.value);\n   const arq=$('empresaLogoArquivo');");
 replace("'cep','logoDataUrl','criadoEm'", "'cep','logoDataUrl','logoEscalaPdfV835','criadoEm'");
 replace("  const o={};for(const k of dadosEmpresaV424)if(e[k]!==undefined)o[k]=e[k];", "  const o={};for(const k of dadosEmpresaV424)if(e[k]!==undefined)o[k]=e[k];\n  o.logoEscalaPdfV835=window.__smLogoPdfScaleV835(o.logoEscalaPdfV835);");
 replace("?'<img src=\"'+src+'\" alt=\"Logo da empresa\">':'';", "?'<img src=\"'+src+'\" alt=\"Logo da empresa\" style=\"'+window.__smLogoPdfStyleV835(e.logoEscalaPdfV835)+'\">':'';");
 return app;
}
