import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const width = 1280;
const height = 720;
const outDir = path.join(process.cwd(), "public", "slides");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(paint) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x / width, y / height, x, y);
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function hash(x, y) {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const mix = (a, b, t) => a + (b - a) * t;
const rgb = (r, g, b) => [clamp(r), clamp(g), clamp(b)];
const grain = (x, y, amount) => (hash(x, y) - 0.5) * amount;

function ellipse(nx, ny, cx, cy, rx, ry) {
  const dx = (nx - cx) / rx;
  const dy = (ny - cy) / ry;
  return dx * dx + dy * dy;
}

function mix3(a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  return [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
}

const scenes = [
  function quietExchange(nx, ny, x, y) {
    let col = [206, 184, 162];
    const plate = ellipse(nx, ny, 0.5, 0.58, 0.4, 0.23);
    if (plate < 1) {
      col = mix3(col, [236, 222, 206], (1 - plate) * 0.95);
      if (plate > 0.78) col = mix3(col, [176, 148, 124], (plate - 0.78) / 0.22);
    }

    const shell = ellipse(nx, ny, 0.5, 0.5, 0.2, 0.26);
    if (shell < 1) {
      const ridge = 0.55 + 0.45 * Math.sin((nx - 0.5) * 70 + (ny - 0.5) * 8);
      const body = [42 + ridge * 36, 26 + ridge * 14, 20 + ridge * 8];
      const cover = Math.min(1, (1 - shell) * 1.4);
      col = mix3(col, body, cover);
      const lip = ellipse(nx, ny, 0.5, 0.4, 0.07, 0.035);
      if (lip < 1) col = mix3(col, [168, 122, 90], 1 - lip);
    }

    const shadow = Math.exp(-((nx - 0.5) ** 2) / 0.03 - ((ny - 0.7) ** 2) / 0.006);
    col = [col[0] - shadow * 34, col[1] - shadow * 28, col[2] - shadow * 22];
    const n = grain(x, y, 9);
    return rgb(col[0] + n, col[1] + n, col[2] + n);
  },

  function vesselStudy(nx, ny, x, y) {
    let col = [22 + ny * 10, 14 + ny * 6, 11 + ny * 4];
    const vase = ellipse(nx, ny, 0.5, 0.56, 0.16 + Math.sin(ny * 9) * 0.015, 0.34);
    if (vase < 1) {
      const light = Math.max(0, 1 - Math.abs(nx - 0.44) * 7);
      const clay = [92 + light * 70, 58 + light * 36, 40 + light * 18];
      col = mix3(col, clay, Math.min(1, (1 - vase) * 2));
      if (ny < 0.28 && vase < 0.45) col = mix3(col, [28, 18, 14], 0.85);
    }
    const foot = ellipse(nx, ny, 0.5, 0.86, 0.12, 0.02);
    if (foot < 1) col = mix3(col, [12, 8, 6], 0.7);
    const n = grain(x, y, 12);
    return rgb(col[0] + n, col[1] + n * 0.7, col[2] + n * 0.5);
  },

  function paperRoom(nx, ny, x, y) {
    const band = Math.abs(nx * 0.85 - ny * 0.2 - 0.22);
    const band2 = Math.abs(nx * 0.25 + ny - 0.78);
    let shade = 0;
    if (band < 0.08) shade += (1 - band / 0.08) * 0.22;
    if (band2 < 0.05) shade += (1 - band2 / 0.05) * 0.16;
    const light = Math.exp(-((nx - 0.3) ** 2) / 0.06 - ((ny - 0.22) ** 2) / 0.04);
    let r = 244 - shade * 80 + light * 8;
    let g = 241 - shade * 74 + light * 8;
    let b = 236 - shade * 68 + light * 6;
    const n = grain(x, y, 5);
    return rgb(r + n, g + n, b + n);
  },

  function lowTide(nx, ny, x, y) {
    const horizon = 0.42 + Math.sin(nx * 18) * 0.008;
    let r;
    let g;
    let b;
    if (ny < horizon) {
      const depth = (horizon - ny) / horizon;
      r = mix(48, 16, depth);
      g = mix(78, 36, depth);
      b = mix(86, 42, depth);
    } else {
      const wet = Math.min(1, (ny - horizon) / 0.08);
      r = mix(186, 214, wet);
      g = mix(168, 196, wet);
      b = mix(142, 166, wet);
      const foam = Math.exp(-((ny - horizon) ** 2) / 0.00035);
      r = mix(r, 236, foam);
      g = mix(g, 232, foam);
      b = mix(b, 224, foam);
    }
    const n = grain(x, y, 11);
    return rgb(r + n, g + n, b + n);
  },

  function amberField(nx, ny, x, y) {
    const dune = 0.58 + Math.sin(nx * 5.5) * 0.06 + Math.sin(nx * 13) * 0.015;
    let r;
    let g;
    let b;
    if (ny < dune) {
      const sky = ny / dune;
      r = mix(244, 214, sky);
      g = mix(196, 132, sky);
      b = mix(150, 72, sky);
    } else {
      const ground = (ny - dune) / (1 - dune);
      r = mix(196, 142, ground);
      g = mix(122, 78, ground);
      b = mix(64, 38, ground);
    }
    const sun = Math.exp(-((nx - 0.7) ** 2) / 0.01 - ((ny - 0.34) ** 2) / 0.008);
    r = mix(r, 255, sun);
    g = mix(g, 220, sun);
    b = mix(b, 160, sun);
    const n = grain(x, y, 8);
    return rgb(r + n, g + n, b + n * 0.6);
  },

  function nightOrchard(nx, ny, x, y) {
    let col = [14 + ny * 8, 32 + ny * 10, 26 + ny * 6];
    const blooms = [
      [0.5, 0.46, 0.18, 0.24],
      [0.38, 0.4, 0.1, 0.13],
      [0.63, 0.39, 0.11, 0.14],
      [0.42, 0.58, 0.12, 0.15],
      [0.6, 0.58, 0.12, 0.16],
    ];
    for (const [cx, cy, rx, ry] of blooms) {
      const d = ellipse(nx, ny, cx, cy, rx, ry);
      if (d < 1) col = mix3(col, [236, 228, 214], (1 - d) * 0.92);
    }
    const heart = ellipse(nx, ny, 0.5, 0.47, 0.035, 0.04);
    if (heart < 1) col = mix3(col, [176, 138, 58], 1 - heart);
    const n = grain(x, y, 10);
    return rgb(col[0] + n, col[1] + n, col[2] + n);
  },
];

fs.mkdirSync(outDir, { recursive: true });
scenes.forEach((paint, index) => {
  const name = `${String(index + 1).padStart(2, "0")}.png`;
  fs.writeFileSync(path.join(outDir, name), encodePng(paint));
  console.log(name);
});
