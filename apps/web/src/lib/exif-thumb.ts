/** EXIF 방향값별 CSS 변환. 내장 썸네일은 회전 전 센서 방향이라 표시 시 보정 */
const ROT: Record<number, string> = {
  2: "scaleX(-1)",
  3: "rotate(180deg)",
  4: "scaleY(-1)",
  5: "rotate(90deg) scaleX(-1)",
  6: "rotate(90deg)",
  7: "rotate(-90deg) scaleX(-1)",
  8: "rotate(-90deg)",
};

/**
 * JPEG EXIF(APP1) 내장 썸네일 추출. 파일 앞 128KB 만 읽고 전체 디코드 없음.
 * 내장 썸네일이 없거나(HEIC·PNG·스크린샷 등) 형식이 어긋나면 null.
 */
export async function exifThumb(f: File): Promise<{ blob: Blob; rot: string } | null> {
  const v = new DataView(await f.slice(0, 131072).arrayBuffer());
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
  let o = 2;
  while (o + 10 < v.byteLength) {
    const m = v.getUint16(o);
    if ((m & 0xff00) !== 0xff00 || m === 0xffda) return null;
    if (m === 0xffe1 && v.getUint32(o + 4) === 0x45786966) return ifd(v, o + 10, f);
    o += 2 + v.getUint16(o + 2);
  }
  return null;
}

function ifd(v: DataView, t: number, f: File) {
  try {
    const le = v.getUint16(t) === 0x4949;
    const u16 = (p: number) => v.getUint16(t + p, le);
    const u32 = (p: number) => v.getUint32(t + p, le);
    const tags = (p: number) => {
      const out = new Map<number, number>();
      const n = u16(p);
      for (let i = 0; i < n; i++) {
        const e = p + 2 + i * 12;
        out.set(u16(e), u16(e + 2) === 3 ? u16(e + 8) : u32(e + 8));
      }
      return { out, next: u32(p + 2 + n * 12) };
    };
    const ifd0 = tags(u32(4));
    if (!ifd0.next) return null;
    const ifd1 = tags(ifd0.next).out;
    const off = ifd1.get(0x0201);
    const len = ifd1.get(0x0202);
    if (!off || !len || len > 65536) return null;
    return { blob: f.slice(t + off, t + off + len, "image/jpeg"), rot: ROT[ifd0.out.get(0x0112) ?? 1] ?? "" };
  } catch {
    return null;
  }
}
