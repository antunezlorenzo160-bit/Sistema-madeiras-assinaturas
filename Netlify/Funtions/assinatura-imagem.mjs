import { inflateSync } from 'node:zlib';

// Limits keep the image and the order comfortably below Firestore's 1 MiB limit.
export function validateSignatureImage(value) {
  const invalid = () => { throw new Error('Envie uma assinatura PNG válida, desenhada na área indicada.'); };
  if (typeof value !== 'string' || value.length > 250000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) invalid();
  const png = Buffer.from(value.slice(22), 'base64');
  if (png.length < 45 || !png.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) invalid();
  let width, height, channels, ended = false, offset = 8;
  const parts = [];
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8);
    if (length > png.length - offset - 12) invalid();
    const data = png.subarray(offset + 8, offset + 8 + length);
    // Reject corrupt chunks as well as fake PNG headers.
    let crc = 0xffffffff;
    for (const byte of png.subarray(offset + 4, offset + 8 + length)) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    if (((crc ^ 0xffffffff) >>> 0) !== png.readUInt32BE(offset + 8 + length)) invalid();
    if (offset === 8 && type !== 'IHDR') invalid();
    if (type === 'IHDR') {
      if (width !== undefined || length !== 13) invalid();
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0;
      if (width < 100 || width > 1200 || height < 50 || height > 600 || data[8] !== 8 || !channels || data[10] || data[11] || data[12]) invalid();
    } else if (type === 'IDAT') parts.push(data);
    else if (type === 'IEND') { if (length) invalid(); ended = true; offset += 12; break; }
    else if (type[0] === type[0].toUpperCase() && type !== 'PLTE') invalid();
    offset += length + 12;
  }
  if (!ended || offset !== png.length || !parts.length) invalid();
  const stride = width * channels, expected = (stride + 1) * height;
  let raw;
  try { raw = inflateSync(Buffer.concat(parts), { maxOutputLength: expected }); } catch { invalid(); }
  if (raw.length !== expected) invalid();
  let previous = Buffer.alloc(stride), ink = 0;
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], row = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    if (filter > 4) invalid();
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x-channels] : 0, b = previous[x], c = x >= channels ? previous[x-channels] : 0;
      row[x] = (row[x] + (filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a+b)/2) : filter === 4 ? paeth(a,b,c) : 0)) & 255;
    }
    for (let x = 0; x < stride; x += channels) {
      if ((channels === 3 || row[x+3] > 100) && Math.min(row[x],row[x+1],row[x+2]) < 200) ink++;
    }
    previous = row;
  }
  if (ink < 20) throw new Error('Desenhe sua assinatura antes de confirmar.');
}
