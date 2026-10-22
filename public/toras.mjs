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
  dialog.setAttribute('aria-labelledby', 'tituloCubagemToras');
  dialog.style.cssText = 'box-sizing:border-box;width:min(680px,96vw);max-height:92dvh;overflow:auto;padding:18px;border:1px solid #888;border-radius:14px;background:var(--card,#fff);color:var(--text,#111)';
  dialog.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><h2 id="tituloCubagemToras">Cubagem de toras</h2><button type="button" data-fechar aria-label="Fechar cubagem de toras">Fechar</button></div>
    <p>Diâmetro da ponta fina + comprimento. Volume cilíndrico, sem desconto de casca.</p>
    <form id="formToras">
      <label for="toraMaoObra">Mão de obra (opcional)</label><input id="toraMaoObra" maxlength="100" autocomplete="off">
      <label for="toraCliente">Nome do cliente (opcional)</label><input id="toraCliente" maxlength="100" autocomplete="name">
      <label for="toraEspecie">Espécie / identificação (opcional)</label><input id="toraEspecie" maxlength="100" autocomplete="off">
      <div class="grid3">
        <div><label for="toraDiametro">Diâmetro da ponta fina (cm)</label><input id="toraDiametro" type="number" min="0.01" step="any" inputmode="decimal" required></div>
        <div><label for="toraComprimento">Comprimento (m)</label><input id="toraComprimento" type="number" min="0.01" step="any" inputmode="decimal" required></div>
        <div><label for="toraQuantidade">Quantidade de toras</label><input id="toraQuantidade" type="number" min="1" step="1" inputmode="numeric" value="1" required></div>
      </div>
      <p id="toraPreview" role="status" aria-live="polite">Informe as medidas.</p>
      <button class="btn btn-primary" type="submit">Adicionar à lista</button>
    </form>
    <p id="toraAviso" role="status">Lista salva somente neste dispositivo. Não movimenta estoque ou pedidos.</p>
    <div class="export-actions"><button type="button" data-copiar>Copiar lista</button><button type="button" data-pdf>Gerar PDF</button><button type="button" data-limpar>Limpar lista</button></div>
    <div id="torasExport"><h3>Resumo da cubagem de toras</h3><p>Método: cilindro pelo diâmetro da ponta fina, sem desconto de casca.</p><p>Volume = π × (diâmetro em metros)² ÷ 4 × comprimento × quantidade.</p><div id="torasLinhas"></div><p id="torasTotal"></p></div>`;
  doc.body.appendChild(dialog);
  const el = id => dialog.querySelector('#' + id);
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
    let total = 0, quantidade = 0;
    linhas.forEach((l, indice) => {
      const { unitario, total: volume } = volumeToras(l.diametro, l.comprimento, l.quantidade);
      total += volume; quantidade += l.quantidade;
      const bloco = doc.createElement('div'); bloco.style.cssText = 'padding:10px 0;border-bottom:1px solid #888;break-inside:avoid';
      const titulo = doc.createElement('strong'); titulo.textContent = (indice + 1) + '. ' + (l.especie || 'Espécie não informada'); bloco.appendChild(titulo);
      for (const [rotulo, valor] of [['Mão de obra', l.maoObra], ['Cliente', l.cliente]]) {
        if (typeof valor === 'string' && valor.trim()) {
          const detalhe = doc.createElement('div'); detalhe.textContent = rotulo + ': ' + valor; bloco.appendChild(detalhe);
        }
      }
      for (const texto of ['Ponta fina: ' + fmt(l.diametro, 2) + ' cm • Comprimento: ' + fmt(l.comprimento, 2) + ' m', 'Quantidade: ' + l.quantidade + (l.quantidade === 1 ? ' tora' : ' toras'), 'Volume por tora: ' + fmt(unitario) + ' m³', 'Volume do grupo: ' + fmt(volume) + ' m³']) {
        const p = doc.createElement('div'); p.textContent = texto; bloco.appendChild(p);
      }
      const remover = doc.createElement('button'); remover.type = 'button'; remover.className = 'no-print'; remover.textContent = 'Remover'; remover.setAttribute('aria-label', 'Remover grupo ' + (indice + 1));
      remover.onclick = () => { linhas.splice(indice, 1); salvar(); render(); }; bloco.appendChild(remover); host.appendChild(bloco);
    });
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
  abrir.addEventListener('click', () => { dialog.showModal(); el('toraDiametro').focus(); });
  dialog.querySelector('[data-fechar]').onclick = () => dialog.close();
  dialog.querySelector('[data-copiar]').onclick = () => linhas.length ? copiar('torasExport') : el('toraAviso').textContent = 'Adicione uma tora à lista primeiro.';
  dialog.querySelector('[data-pdf]').onclick = () => {
    if (!linhas.length) { el('toraAviso').textContent = 'Adicione uma tora à lista primeiro.'; return; }
    // O gerador clona o resumo antes de imprimir; retirar o modal da camada
    // superior permite que a área de impressão apareça no Chrome/Android.
    pdf('torasExport', 'Cubagem de toras — ponta fina');
    dialog.close();
    doc.defaultView.addEventListener('afterprint', () => { if (dialog.isConnected && !dialog.open) dialog.showModal(); }, { once: true });
  };
  dialog.querySelector('[data-limpar]').onclick = () => {
    if (linhas.length && doc.defaultView.confirm('Apagar a lista de cubagem de toras deste dispositivo?')) { linhas = []; salvar(); render(); }
  };
  render();
}
