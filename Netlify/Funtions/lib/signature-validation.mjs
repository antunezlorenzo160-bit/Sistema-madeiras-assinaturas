export function validateSignature(signature) {
  if (!signature || signature.width !== 600 || signature.height !== 240 ||
      !Array.isArray(signature.strokes) || signature.strokes.length < 1 || signature.strokes.length > 100) {
    throw new Error('Desenhe sua assinatura antes de confirmar.');
  }
  let count = 0, distance = 0;
  const strokes = signature.strokes.map(stroke => {
    if (!Array.isArray(stroke) || stroke.length < 2 || (count += stroke.length) > 4000) throw new Error('Assinatura inválida. Limpe e assine novamente.');
    return stroke.map((point, i) => {
      if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isInteger) ||
          point[0] < 0 || point[0] > 600 || point[1] < 0 || point[1] > 240) throw new Error('Assinatura inválida. Limpe e assine novamente.');
      if (i) distance += Math.hypot(point[0] - stroke[i - 1][0], point[1] - stroke[i - 1][1]);
      return [point[0], point[1]];
    });
  });
  if (distance < 20) throw new Error('Desenhe sua assinatura antes de confirmar.');
  // Firestore does not support nested arrays. Each stroke is a map with a flat coordinate array.
  return { version: 1, width: 600, height: 240, strokes: strokes.map(points => ({ points: points.flat() })) };
}
