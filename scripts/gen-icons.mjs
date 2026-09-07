// Gerador de ícones PWA sem dependências externas (usa apenas zlib nativo).
// Desenha a marca LegalizaBoard (duas barras arredondadas formando um "L")
// em branco sobre fundo vermelho da marca (#d93025) e grava PNGs.
// Uso: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0xd9, 0x30, 0x25]; // #d93025 — var(--primary)
const FG = [0xff, 0xff, 0xff];

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // scanlines com filtro 0 (none)
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Retorna true se o ponto (px,py) está dentro de um retângulo arredondado.
function insideRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

// Desenha a marca LegalizaBoard: duas barras arredondadas (haste vertical +
// pé horizontal) formando um "L", em branco sobre fundo vermelho.
// Mesma geometria usada no logotipo do topbar (viewBox lógico 100x100).
function drawMark(size) {
  const buf = Buffer.alloc(size * size * 4);
  const put = (x, y, col) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = col[0]; buf[i + 1] = col[1]; buf[i + 2] = col[2]; buf[i + 3] = 255;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(x, y, BG);

  const s = size / 100; // unidade relativa (canvas lógico 100x100)
  const bars = [
    { x: 14 * s, y: 8 * s, w: 30 * s, h: 84 * s, r: 9 * s },  // haste vertical
    { x: 54 * s, y: 62 * s, w: 30 * s, h: 30 * s, r: 9 * s }, // pé horizontal
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      for (const b of bars) {
        if (insideRoundedRect(x, y, b.x, b.y, b.w, b.h, b.r)) {
          put(x, y, FG);
          break;
        }
      }
    }
  }

  return buf;
}

mkdirSync('public', { recursive: true });
for (const size of [192, 512]) {
  const png = encodePNG(size, size, drawMark(size));
  writeFileSync(`public/pwa-${size}x${size}.png`, png);
  console.log(`public/pwa-${size}x${size}.png (${png.length} bytes)`);
}

// Ícone maskable 512 com margem de segurança (mesmo desenho, já centralizado)
writeFileSync('public/maskable-512x512.png', encodePNG(512, 512, drawMark(512)));
console.log('public/maskable-512x512.png');

// Favicon 64
writeFileSync('public/favicon-64.png', encodePNG(64, 64, drawMark(64)));
console.log('public/favicon-64.png');
