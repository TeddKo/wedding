import type { PhotoExt } from "@wedding/shared";

const MAX_SEGMENTS = 512;

export function sniff(b: Uint8Array): PhotoExt | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  const t = (o: number, s: string) => [...s].every((c, i) => b[o + i] === c.charCodeAt(0));
  return t(0, "RIFF") && t(8, "WEBP") ? "webp" : null;
}

/** JPEG SOF0/1/2, WebP VP8/VP8L/VP8X 헤더에서 가로·세로 읽기(헤더만 해석, 세그먼트 순회 상한 적용). 실패 시 null */
export function dims(b: Uint8Array, ext: PhotoExt): [number, number] | null {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const ok = (w: number, h: number): [number, number] | null => (w >= 1 && h >= 1 ? [w, h] : null);
  if (ext === "jpg") {
    let i = 2;
    for (let n = 0; n < MAX_SEGMENTS && i + 9 <= b.length; n++) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1] ?? 0;
      if (m === 0xff) {
        i++;
        continue;
      }
      if (m === 0xc0 || m === 0xc1 || m === 0xc2) return ok(v.getUint16(i + 7), v.getUint16(i + 5));
      if (m === 0xda) return null;
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
        i += 2;
        continue;
      }
      i += 2 + v.getUint16(i + 2);
    }
    return null;
  }
  if (b.length < 30) return null;
  const tag = String.fromCharCode(...b.subarray(12, 16));
  if (tag === "VP8 ")
    return v.getUint8(23) === 0x9d && v.getUint8(24) === 0x01 && v.getUint8(25) === 0x2a
      ? ok(v.getUint16(26, true) & 0x3fff, v.getUint16(28, true) & 0x3fff)
      : null;
  if (tag === "VP8L") {
    if (v.getUint8(20) !== 0x2f) return null;
    const bits = v.getUint32(21, true);
    return ok((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  if (tag === "VP8X") {
    const le24 = (o: number) => v.getUint8(o) | (v.getUint8(o + 1) << 8) | (v.getUint8(o + 2) << 16);
    return ok(le24(24) + 1, le24(27) + 1);
  }
  return null;
}
