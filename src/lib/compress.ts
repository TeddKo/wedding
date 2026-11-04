const MAX = 2560;
const THUMB = 480;
const Q_WEBP = 0.82;
const Q_JPG = 0.85;
const FULL_SOFT = 2.5 * 1024 * 1024;
const FULL_HARD = 3 * 1024 * 1024;

export const UNSUPPORTED = "이 사진 형식은 지원되지 않아요. 다른 사진을 선택해 주세요.";
const TOO_LARGE = "이 사진은 너무 커서 처리할 수 없어요. 다른 사진을 선택해 주세요.";

export type Packed = { blob: Blob; type: string };
export type Compressed = { full: Packed; thumb: Packed; w: number; h: number; origSize: number };

let webpOk: boolean | null = null;
async function detectWebp() {
  if (webpOk !== null) return webpOk;
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const b = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.8));
  return (webpOk = b?.type === "image/webp");
}

async function encode(c: HTMLCanvasElement, q?: number): Promise<Packed> {
  const web = await detectWebp();
  const type = web ? "image/webp" : "image/jpeg";
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, type, q ?? (web ? Q_WEBP : Q_JPG)));
  if (!blob || blob.type !== type) throw new Error("encode");
  return { blob, type };
}

/** 긴 변을 long 으로 줄인다(확대 없음). 비율이 2배를 넘으면 절반씩 단계적으로 줄여 품질을 지킨다. */
function resize(bmp: ImageBitmap, long: number) {
  const s = Math.min(1, long / Math.max(bmp.width, bmp.height));
  const tw = Math.max(1, Math.round(bmp.width * s));
  const th = Math.max(1, Math.round(bmp.height * s));
  let w = bmp.width;
  let h = bmp.height;
  let src: CanvasImageSource = bmp;
  const draw = (tw: number, th: number) => {
    const c = document.createElement("canvas");
    c.width = tw;
    c.height = th;
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
    if (prev instanceof HTMLCanvasElement) prev.width = prev.height = 0;
  }
  const out = draw(tw, th);
  if (src instanceof HTMLCanvasElement) src.width = src.height = 0;
  return out;
}

/** EXIF 회전을 적용해 다시 인코딩하므로 EXIF/GPS 는 제거된다. 호출은 순차적으로 한다(호출자가 직렬화). */
export async function compress(file: File): Promise<Compressed> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(UNSUPPORTED);
  }
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
    return { full, thumb, w, h, origSize: file.size };
  } finally {
    bmp.close();
  }
}
