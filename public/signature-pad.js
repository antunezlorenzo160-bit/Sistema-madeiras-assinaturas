// Coordinates use a fixed space so rotating a phone preserves the signature.
export function setupSignaturePad(canvas, clearButton) {
  const ctx = canvas.getContext('2d');
  const strokes = [];
  let active = null, pointerId = null;
  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#152d22'; ctx.lineWidth = 2.5;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const stroke of strokes) {
      ctx.beginPath(); ctx.moveTo(...stroke[0]);
      for (const point of stroke.slice(1)) ctx.lineTo(...point);
      ctx.stroke();
    }
  }
  function point(ev) {
    const rect = canvas.getBoundingClientRect();
    return [Math.round(Math.max(0, Math.min(600, (ev.clientX - rect.left) * 600 / rect.width))),
      Math.round(Math.max(0, Math.min(240, (ev.clientY - rect.top) * 240 / rect.height)))];
  }
  canvas.addEventListener('pointerdown', ev => {
    if (pointerId !== null || ev.button !== 0 || clearButton.disabled || strokes.length >= 100) return;
    ev.preventDefault(); pointerId = ev.pointerId;
    active = [point(ev)]; strokes.push(active); canvas.setPointerCapture(pointerId);
  });
  canvas.addEventListener('pointermove', ev => {
    if (ev.pointerId !== pointerId || !active) return;
    ev.preventDefault();
    if (strokes.reduce((n, s) => n + s.length, 0) >= 4000) return;
    const next = point(ev), last = active[active.length - 1];
    if (next[0] === last[0] && next[1] === last[1]) return;
    active.push(next); redraw();
  });
  function finish(ev) {
    if (ev.pointerId !== pointerId) return;
    if (active?.length < 2) strokes.pop();
    active = null; pointerId = null; redraw();
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, finish);
  clearButton.addEventListener('click', () => { strokes.length = 0; active = null; pointerId = null; redraw(); });
  return () => {
    const complete = strokes.filter(s => s.length >= 2);
    const distance = complete.reduce((sum, s) => sum + s.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - s[i][0], p[1] - s[i][1]), 0), 0);
    if (distance < 20) throw new Error('Desenhe sua assinatura antes de confirmar.');
    return { width: 600, height: 240, strokes: complete };
  };
}
