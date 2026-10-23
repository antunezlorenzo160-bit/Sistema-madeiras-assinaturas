// Cubagem cilíndrica pelo diâmetro da ponta fina, sem arredondamento intermediário.
export function volumeToras(diametroCm, comprimentoM, quantidade = 1) {
  if (![diametroCm, comprimentoM, quantidade].every(v => typeof v === 'number' && Number.isFinite(v) && v > 0) || !Number.isSafeInteger(quantidade)) {
    throw new RangeError('Informe diâmetro e comprimento positivos e quantidade inteira de toras.');
  }
  const unitario = Math.PI * (diametroCm / 100) ** 2 / 4 * comprimentoM;
  const total = unitario * quantidade;
  if (!Number.isFinite(total) || unitario === 0) throw new RangeError('Medidas fora do limite de cálculo.');
  return { unitario, total };
}

export function iniciarCubagemToras({ document: doc = document, storage, copiar, pdf }) {
  const abrir = doc.getElementById('btnCubagemToras');
  if (!abrir || doc.getElementById('cubagemToras')) return;
  const dialog = doc.createElement('dialog');
  dialog.id = 'cubagemToras';
  dialog.className = 'card';
  dialog.setAttribute('aria-labelledby', 'tituloCubagemToras');
  dialog.style.cssText = 'box-sizing:border-box;width:min(680px,96vw);max-height:92dvh;overflow:auto;padding:18px;border:1px solid #888;border-radius:14px;background:var(--card,#fff);color:var(--text,#111)';
  dialog.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><h2 id="tituloCubagemToras">Cubagem de toras</h2><button type="button" class="btn btn-secondary" data-fechar aria-label="Fechar cubagem de toras">Fechar</button></div>
    <p>Diâmetro + comprimento. Volume cilíndrico, sem desconto de casca.</p>
    <form id="formToras">
      <label for="toraMaoObra">Mão de obra (opcional)</label><input id="toraMaoObra" maxlength="100" autocomplete="off">
      <label for="toraCliente">Nome do cliente (opcional)</label><input id="toraCliente" maxlength="100" autocomplete="name">
      <label for="toraEspecie">Espécie / identificação (opcional)</label><input id="toraEspecie" maxlength="100" autocomplete="off">
      <div class="grid3">
        <div><label for="toraDiametro">Diâmetro (cm)</label><input id="toraDiametro" type="number" min="0.01" step="any" inputmode="decimal" required></div>
        <div><label for="toraComprimento">Comprimento (m)</label><input id="toraComprimento" type="number" min="0.01" step="any" inputmode="decimal" required></div>
        <div><label for="toraQuantidade">Quantidade de toras</label><input id="toraQuantidade" type="number" min="1" step="1" inputmode="numeric" value="1" required></div>
      </div>
      <p id="toraPreview" role="status" aria-live="polite">Informe as medidas.</p>
      <button class="btn btn-primary" type="submit">Adicionar à lista</button>
    </form>
    <p id="toraAviso" role="status">Lista salva somente neste dispositivo. Não movimenta estoque ou pedidos.</p>
    <div class="export-actions"><button type="button" class="btn btn-secondary" data-copiar>Copiar lista</button><button type="button" class="btn btn-primary" data-pdf>Gerar PDF</button><button type="button" class="btn btn-secondary" data-limpar>Limpar lista</button></div>
    <div id="torasExport"><h3>Resumo da cubagem de toras</h3><p>Método: cilindro pelo diâmetro, sem desconto de casca.</p><p>Volume = π × (diâmetro em metros)² ÷ 4 × comprimento × quantidade.</p><div id="torasLinhas"></div><p id="torasTotal"></p></div>`;
  doc.body.appendChild(dialog);
  const el = id => dialog.querySelector('#' + id);
  // O modal está fora de <main>. Copiar a aparência dos controles reais
  // também respeita temas cujos seletores são limitados ao conteúdo principal.
  const copiarEstilo = (origem, destino, propriedades) => {
    if (!origem) return;
    const estilo = doc.defaultView.getComputedStyle(origem);
    for (const propriedade of propriedades) destino.style.setProperty(propriedade, estilo.getPropertyValue(propriedade));
  };
  function aplicarTema() {
    const card = doc.querySelector('#calculadora .card');
    const fonte = ['font-family', 'font-size', 'font-weight', 'line-height', 'color'];
    copiarEstilo(card, dialog, [...fonte, 'background-color', 'background-image', 'border-color', 'border-style', 'border-width', 'border-radius', 'box-shadow']);
    dialog.querySelectorAll('input').forEach(input => {
      copiarEstilo(doc.getElementById('largura'), input, [...fonte, 'background-color', 'background-image', 'border-color', 'border-style', 'border-width', 'border-radius', 'padding']);
      input.style.width = '100%'; input.style.boxSizing = 'border-box';
    });
    dialog.querySelectorAll('label').forEach(label => {
      copiarEstilo(doc.querySelector('label[for="largura"]') || doc.querySelector('#calculadora label'), label, fonte);
      label.style.display = 'block'; label.style.marginTop = '10px'; label.style.marginBottom = '4px';
    });
    dialog.querySelectorAll('button').forEach(button => {
      const origem = button.classList.contains('btn-primary') ? doc.getElementById('btnLancar') : doc.querySelector('#calculadora .btn-secondary');
      copiarEstilo(origem, button, [...fonte, 'background-color', 'background-image', 'border-color', 'border-style', 'border-width', 'border-radius', 'padding', 'box-shadow']);
      button.style.cursor = 'pointer';
    });
    dialog.querySelectorAll('#torasLinhas th, #torasLinhas td').forEach(bloco => {
      const origem = card && doc.defaultView.getComputedStyle(card);
      if (origem) bloco.style.borderColor = origem.borderColor;
    });
  }
  const estiloToras = doc.createElement('style');
  estiloToras.textContent = '@media print{#torasExport .toras-tabela-wrap{overflow:visible!important}#torasExport tr{break-inside:avoid}}#cubagemToras .export-actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}#cubagemToras .grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}#cubagemToras input{min-width:0}#cubagemToras::backdrop{background:rgb(0 0 0 / 55%)}@media(max-width:600px){#cubagemToras .grid3{grid-template-columns:1fr}}';
  doc.head.appendChild(estiloToras);
  let temaPendente = false;
  const observarTema = new doc.defaultView.MutationObserver(() => {
    if (temaPendente) return;
    temaPendente = true;
    doc.defaultView.requestAnimationFrame(() => { temaPendente = false; aplicarTema(); });
  });
  for (const elemento of [doc.documentElement, doc.body]) observarTema.observe(elemento, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-tema'] });

  const fmt = (v, casas = 4) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const key = 'cubagem_toras_ponta_fina_v1';
  let linhas = [];
  try {
    const salvas = JSON.parse(storage.getItem(key) || '[]');
    if (Array.isArray(salvas)) linhas = salvas.filter(l => {
      try { volumeToras(l.diametro, l.comprimento, l.quantidade); return typeof l.especie === 'string'; } catch { return false; }
    });
  } catch { el('toraAviso').textContent = 'Não foi possível recuperar a lista deste dispositivo.'; }
  function salvar() {
    try {
      storage.setItem(key, JSON.stringify(linhas));
      el('toraAviso').textContent = storage.durable === false ? 'Armazenamento indisponível. Exporte a lista antes de fechar o sistema.' : 'Lista salva somente neste dispositivo. Não movimenta estoque ou pedidos.';
    } catch { el('toraAviso').textContent = 'Não foi possível salvar. Exporte a lista antes de fechar o sistema.'; }
  }
  function render() {
    const host = el('torasLinhas'); host.replaceChildren();
    const wrap = doc.createElement('div'); wrap.className = 'toras-tabela-wrap'; wrap.style.overflowX = 'auto';
    const tabela = doc.createElement('table'); tabela.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;line-height:1.4';
    tabela.setAttribute('aria-label', 'Resumo dos lançamentos de toras');
    const cabecalho = tabela.createTHead().insertRow();
    for (const [indice, texto] of ['Espécie', 'Qtd.', 'Diâmetro (cm)', 'Comp. (m)', 'm³/tora', 'm³ total', 'Ação'].entries()) {
      const th = doc.createElement('th'); th.scope = 'col'; th.textContent = texto;
      th.style.cssText = 'padding:7px 5px;border-bottom:1px solid;text-align:'+ (indice ? 'right' : 'left');
      if (indice === 6) th.className = 'no-print';
      cabecalho.appendChild(th);
    }
    const corpo = tabela.createTBody(); wrap.appendChild(tabela); host.appendChild(wrap);
    let total = 0, quantidade = 0;
    linhas.forEach((l, indice) => {
      const { unitario, total: volume } = volumeToras(l.diametro, l.comprimento, l.quantidade);
      total += volume; quantidade += l.quantidade;
      const tr = doc.createElement('tr');
      const valores = [l.especie || 'Espécie não informada', String(l.quantidade), fmt(l.diametro, 2), fmt(l.comprimento, 2), fmt(unitario), fmt(volume)];
      valores.forEach((valor, coluna) => {
        const td = doc.createElement('td'); td.textContent = valor;
        td.style.cssText = 'padding:7px 5px;border-bottom:1px solid;'+(coluna ? 'text-align:right;white-space:nowrap' : 'min-width:85px;overflow-wrap:anywhere');
        tr.appendChild(td);
      });
      const acoes = doc.createElement('td'); acoes.className = 'no-print';
      const remover = doc.createElement('button'); remover.type = 'button'; remover.className = 'btn btn-secondary no-print'; remover.textContent = 'Remover'; remover.setAttribute('aria-label', 'Remover grupo ' + (indice + 1));
      remover.onclick = () => { linhas.splice(indice, 1); salvar(); render(); }; acoes.appendChild(remover); tr.appendChild(acoes); corpo.appendChild(tr);
      const detalhes = [['Mão de obra', l.maoObra], ['Cliente', l.cliente]].filter(([, valor]) => typeof valor === 'string' && valor.trim());
      if (detalhes.length) {
        const nota = doc.createElement('tr'); const td = doc.createElement('td'); td.colSpan = 6;
        td.style.cssText = 'padding:4px 5px 10px;border-bottom:1px solid;overflow-wrap:anywhere';
        td.textContent = detalhes.map(([rotulo, valor]) => rotulo + ': ' + valor).join(' • '); nota.appendChild(td); corpo.appendChild(nota);
      }
    });
    aplicarTema();
    el('torasTotal').textContent = 'Total: ' + quantidade + (quantidade === 1 ? ' tora • ' : ' toras • ') + fmt(total) + ' m³';
  }
  function ler() { return [Number(el('toraDiametro').value), Number(el('toraComprimento').value), Number(el('toraQuantidade').value)]; }
  function preview() {
    try { const v = volumeToras(...ler()); el('toraPreview').textContent = 'Por tora: ' + fmt(v.unitario) + ' m³ • Total: ' + fmt(v.total) + ' m³'; }
    catch { el('toraPreview').textContent = 'Informe diâmetro e comprimento positivos e quantidade inteira.'; }
  }
  el('formToras').addEventListener('input', preview);
  el('formToras').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const [diametro, comprimento, quantidade] = ler(); volumeToras(diametro, comprimento, quantidade);
      linhas.push({ maoObra: el('toraMaoObra').value.trim(), cliente: el('toraCliente').value.trim(), especie: el('toraEspecie').value.trim(), diametro, comprimento, quantidade }); salvar(); render();
      el('toraDiametro').value = ''; preview(); el('toraDiametro').focus();
    } catch (e) { el('toraPreview').textContent = e.message; }
  });
  abrir.addEventListener('click', () => { aplicarTema(); dialog.showModal(); el('toraDiametro').focus(); });
  dialog.querySelector('[data-fechar]').onclick = () => dialog.close();
  dialog.querySelector('[data-copiar]').onclick = async () => {
    if (!linhas.length) { el('toraAviso').textContent = 'Adicione uma tora à lista primeiro.'; return; }
    // Na mensagem, a espécie fica acima da tabela para caber no celular.
    const resumo = doc.createElement('div');
    const titulo = doc.createElement('h3'); titulo.textContent = 'Cubagem de toras'; resumo.appendChild(titulo);
    for (const l of linhas) {
      const h = doc.createElement('h4'); h.textContent = l.especie || 'Espécie não informada'; resumo.appendChild(h);
      for (const [rotulo, valor] of [['Mão de obra', l.maoObra], ['Cliente', l.cliente]]) {
        if (typeof valor === 'string' && valor.trim()) { const p = doc.createElement('div'); p.textContent = rotulo + ': ' + valor; resumo.appendChild(p); }
      }
      const v = volumeToras(l.diametro, l.comprimento, l.quantidade);
      const tabela = doc.createElement('table');
      for (const valores of [['Qtd', 'D.cm', 'C.m', 'm³/tora', 'm³ total'], [String(l.quantidade), fmt(l.diametro, 2), fmt(l.comprimento, 2), fmt(v.unitario), fmt(v.total)]]) {
        const tr = tabela.insertRow(); for (const valor of valores) tr.insertCell().textContent = valor;
      }
      resumo.appendChild(tabela);
    }
    const total = doc.createElement('p'); total.textContent = el('torasTotal').textContent; resumo.appendChild(total);
    await copiar(resumo);
  };
  dialog.querySelector('[data-pdf]').onclick = () => {
    if (!linhas.length) { el('toraAviso').textContent = 'Adicione uma tora à lista primeiro.'; return; }
    // O gerador clona o resumo antes de imprimir; retirar o modal da camada
    // superior permite que a área de impressão apareça no Chrome/Android.
    pdf('torasExport', 'Cubagem de toras');
    dialog.close();
    doc.defaultView.addEventListener('afterprint', () => { if (dialog.isConnected && !dialog.open) dialog.showModal(); }, { once: true });
  };
  dialog.querySelector('[data-limpar]').onclick = () => {
    if (linhas.length && doc.defaultView.confirm('Apagar a lista de cubagem de toras deste dispositivo?')) { linhas = []; salvar(); render(); }
  };
  render();
}
