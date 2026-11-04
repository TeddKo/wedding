export const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
export const raw = (...v: number[]) => Uint8Array.from(v);
export const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const u16 = (v: number) => raw(v >> 8, v & 255);
const le16 = (v: number) => raw(v & 255, v >> 8);
const le24 = (v: number) => raw(v & 255, (v >> 8) & 255, (v >> 16) & 255);
const le32 = (v: number) => raw(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
const zeros = (n: number) => new Uint8Array(n);
const pad = (head: Uint8Array, n: number) => concat(head, new Uint8Array(Math.max(0, n - head.length)).fill(7));

export const jpg = (n: number, w = 1000, h = 800) =>
  pad(concat(raw(0xff, 0xd8, 0xff, 0xc0, 0, 17, 8), u16(h), u16(w), raw(3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1)), n);
export const riff = (chunk: Uint8Array, n: number) => pad(concat(ascii("RIFF"), zeros(4), ascii("WEBP"), chunk), n);
export const webp = (n: number, w = 1000, h = 800) => riff(concat(ascii("VP8 "), zeros(4), raw(0, 0, 0, 0x9d, 0x01, 0x2a), le16(w), le16(h)), n);
export const webpL = (n: number, w: number, h: number) => riff(concat(ascii("VP8L"), zeros(4), raw(0x2f), le32((w - 1) | ((h - 1) << 14))), n);
export const webpX = (n: number, w: number, h: number) => riff(concat(ascii("VP8X"), zeros(4), zeros(4), le24(w - 1), le24(h - 1)), n);
