// Genera icons/icon-192.png e icons/icon-512.png sin dependencias: fondo verde azulado
// a sangre (sirve como "maskable") con tres barras blancas crecientes y una moneda.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const TABLA = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = TABLA[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
function bloque(tipo, datos) {
  const len = Buffer.alloc(4); len.writeUInt32BE(datos.length);
  const td = Buffer.concat([Buffer.from(tipo), datos]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function icono(tam) {
  const px = Buffer.alloc(tam * (tam * 4 + 1));
  const u = tam / 100; // unidades de un lienzo de 100×100
  const enRect = (x, y, x0, y0, x1, y1, r) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
  const barras = [[26, 58, 36, 74], [44, 46, 54, 74], [62, 32, 72, 74]];
  for (let j = 0; j < tam; j++) {
    px[j * (tam * 4 + 1)] = 0;
    for (let i = 0; i < tam; i++) {
      const x = (i + 0.5) / u, y = (j + 0.5) / u;
      let c = [15, 118, 110];
      if (barras.some(([x0, y0, x1, y1]) => enRect(x, y, x0, y0, x1, y1, 2.5))) c = [255, 255, 255];
      const dc = Math.hypot(x - 38, y - 32);
      if (dc <= 8) c = dc <= 5.5 ? [252, 211, 77] : [245, 158, 11];
      const o = j * (tam * 4 + 1) + 1 + i * 4;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tam, 0); ihdr.writeUInt32BE(tam, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloque('IHDR', ihdr), bloque('IDAT', deflateSync(px)), bloque('IEND', Buffer.alloc(0)),
  ]);
}

const dir = new URL('../icons/', import.meta.url);
mkdirSync(dir, { recursive: true });
for (const t of [192, 512]) writeFileSync(new URL(`icon-${t}.png`, dir), icono(t));
console.log('iconos generados');
