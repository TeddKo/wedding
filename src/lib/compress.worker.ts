/* 압축 워커: 디코드·리사이즈·인코딩을 메인 스레드 밖에서 한다. 규칙은 compress.ts 와 같다. */
const MAX = 2560;
const THUMB = 480;
const Q_WEBP = 0.82;
const Q_JPG = 0.85;
const FULL_SOFT = 2.5 * 1024 * 1024;
const FULL_HARD = 3 * 1024 * 1024;
const TOO_LARGE = "이 사진은 너무 커서 처리할 수 없어요. 다른 사진을 선택해 주세요.";
const HEIC_BRANDS = ["heic", "heix", "hevc", "heim", "heis", "hevm", "hevs", "mif1", "msf1"];

type Packed = { blob: Blob; type: string };
type In = { id: number; file: File } | { id: number; bitmap: ImageBitmap; size: number };
const ctx = self as unknown as { postMessage(m: unknown, t?: Transferable[]): void; onmessage: ((e: MessageEvent<In>) => void) | null };

let webpOk = true;
async function encode(c: OffscreenCanvas, q?: number): Promise<Packed> {
  if (webpOk) {
    const blob = await c.convertToBlob({ type: "image/webp", quality: q ?? Q_WEBP });
    if (blob.type === "image/webp") return { blob, type: blob.type };
    webpOk = false;
  }
  const blob = await c.convertToBlob({ type: "image/jpeg", quality: q ?? Q_JPG });
  if (blob.type !== "image/jpeg") throw new Error("encode");
  return { blob, type: blob.type };
}

function resize(bmp: ImageBitmap, long: number) {
  const s = Math.min(1, long / Math.max(bmp.width, bmp.height));
  const tw = Math.max(1, Math.round(bmp.width * s));
  const th = Math.max(1, Math.round(bmp.height * s));
  let w = bmp.width;
  let h = bmp.height;
  let src: ImageBitmap | OffscreenCanvas = bmp;
  const draw = (tw: number, th: number) => {
    const c = new OffscreenCanvas(tw, th);
    const x = c.getContext("2d", { colorSpace: "srgb" });
    if (!x) throw new Error(TOO_LARGE);
    x.imageSmoothingQuality = "high";
    x.drawImage(src, 0, 0, tw, th);
    return c;
  };
  while (w / 2 >= tw) {
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    const prev = src;
    src = draw(w, h);
    if (prev instanceof OffscreenCanvas) prev.width = prev.height = 0;
  }
  const out = draw(tw, th);
  if (src instanceof OffscreenCanvas) src.width = src.height = 0;
  return out;
}

async function isHeicFile(f: File) {
  if (/^image\/hei[cf]/i.test(f.type)) return true;
  const t = String.fromCharCode(...new Uint8Array(await f.slice(4, 12).arrayBuffer()));
  return t.startsWith("ftyp") && HEIC_BRANDS.includes(t.slice(4));
}

const viaBitmap = (f: Blob) => createImageBitmap(f, { imageOrientation: "from-image" });

/** createImageBitmap → (HEIC 만) heic-to 지연 로드. null 이면 메인 스레드 <img> 디코드가 마지막 수단이다. */
async function decode(f: File): Promise<ImageBitmap | null> {
  try {
    return await viaBitmap(f);
  } catch {}
  if (await isHeicFile(f)) {
    try {
      const { heicTo } = await import("heic-to");
      return (await heicTo({ blob: f, type: "bitmap" })) as ImageBitmap;
    } catch {}
  }
  return null;
}

async function pack(bmp: ImageBitmap, origSize: number) {
  try {
    const big = resize(bmp, MAX);
    const w = big.width;
    const h = big.height;
    let full = await encode(big);
    for (const q of [0.75, 0.6]) {
      if (full.blob.size <= FULL_SOFT) break;
      full = await encode(big, q);
    }
    big.width = big.height = 0;
    if (full.blob.size > FULL_HARD) throw new Error("size");
    const small = resize(bmp, THUMB);
    const thumb = await encode(small, 0.7);
    small.width = small.height = 0;
    return { full, thumb, w, h, origSize };
  } finally {
    bmp.close();
  }
}

ctx.onmessage = async (e) => {
  const m = e.data;
  try {
    if ("bitmap" in m) return ctx.postMessage({ id: m.id, ok: await pack(m.bitmap, m.size) });
    const bmp = await decode(m.file);
    if (!bmp) return ctx.postMessage({ id: m.id, needMain: true });
    ctx.postMessage({ id: m.id, ok: await pack(bmp, m.file.size) });
  } catch (err) {
    ctx.postMessage({ id: m.id, err: err instanceof Error ? err.message : String(err) });
  }
};
