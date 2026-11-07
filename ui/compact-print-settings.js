setTimeout(()=>{
 const host=document.getElementById('configInterface');if(!host||document.getElementById('compactDetailsV712'))return;
 const label=document.createElement('label');label.className='no-print';
 const input=document.createElement('input');input.type='checkbox';input.id='compactDetailsV712';input.style.width='auto';input.checked=window.__v456Local.getItem('compact_pdf_details_v712')==='true';
 input.addEventListener('change',()=>window.__v456Local.setItem('compact_pdf_details_v712',String(input.checked)));
 label.append(input,document.createTextNode(' PDF detalhado: incluir área de face, metros lineares e peso em cada linha do carregamento e romaneio.'));
 const heading=document.createElement('h3');heading.textContent='PDFs compactos';const note=document.createElement('p');note.className='note';note.textContent='O modelo compacto mostra medidas e volume; no carregamento, conserva também os preços e valores. As métricas complementares ficam nos totais. Esta opção muda apenas a impressão neste aparelho.';
 host.append(heading,label,note);
},0);
