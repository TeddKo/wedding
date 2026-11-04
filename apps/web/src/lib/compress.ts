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

/** 긴 변을 long 으로 축소(확대 없음). 비율이 2배를 넘으면 절반씩 단계적으로 줄여 품질 보존. */
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

const HEIC_BRANDS = ["heic", "heix", "hevc", "heim", "heis", "hevm", "hevs", "mif1", "msf1"];

export async function isHeicFile(f: File) {
  if (/^image\/hei[cf]/i.test(f.type)) return true;
  const b = new Uint8Array(await f.slice(4, 12).arrayBuffer());
  const t = String.fromCharCode(...b);
  return t.startsWith("ftyp") && HEIC_BRANDS.includes(t.slice(4));
}

const viaBitmap = (f: Blob) => createImageBitmap(f, { imageOrientation: "from-image" });

/** Safari 등은 <img> 로는 HEIC 를 그릴 수 있음. <img> 는 EXIF 회전을 자동 적용. */
async function viaImg(f: Blob) {
  const url = URL.createObjectURL(f);
  try {
    const im = new Image();
    im.src = url;
    await im.decode();
    return await createImageBitmap(im);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** createImageBitmap → <img> → (HEIC 만) heic-to 지연 로드 순으로 디코드. 디코더 청크는 HEIC 일 때만 다운로드. */
async function decode(f: File): Promise<ImageBitmap> {
  try {
    return await viaBitmap(f);
  } catch {}
  try {
    return await viaImg(f);
  } catch {}
  if (await isHeicFile(f)) {
    try {
      const { heicTo } = await import("heic-to");
      return await viaBitmap(await heicTo({ blob: f, type: "image/jpeg", quality: 0.95 }));
    } catch {}
  }
  throw new Error(UNSUPPORTED);
}

/** 압축·미리보기가 한 번에 하나씩만 디코드하도록 잇는 직렬 큐(메모리 보호). 미리보기(hi)는 대기 중인 압축보다 먼저 실행. */
type Job = { hi: boolean; go: () => void };
const queue: Job[] = [];
let running = false;
const next = () => {
  if (running) return;
  const j = queue.shift();
  if (!j) return;
  running = true;
  j.go();
};
const serial = <T>(fn: () => Promise<T>, hi = false): Promise<T> =>
  new Promise<T>((res, rej) => {
    const go = () =>
      fn().then(res, rej).finally(() => {
        running = false;
        next();
      });
    const at = hi ? queue.findIndex((j) => !j.hi) : -1;
    queue.splice(at < 0 ? queue.length : at, 0, { hi, go });
    next();
  });

/** HEIC 디코더(heic-to 청크·WASM)를 워커에서 미리 받아 둠. 페이지당 1회, 실패는 무시. */
let warmed = false;
export function warm() {
  if (warmed || !workerOk()) return;
  warmed = true;
  try {
    getWorker().postMessage({ warm: true });
  } catch {}
}

/** EXIF 회전을 적용해 다시 인코딩하므로 EXIF/GPS 는 제거됨. */
export function compress(file: File): Promise<Compressed> {
  return serial(async () => {
    if (workerOk()) {
      const m = await viaWorker(file);
      if (m) {
        if (m.err !== undefined) throw new Error(m.err);
        return m.ok!;
      }
    }
    return compressMain(file);
  });
}

/** 긴 변 size 의 중앙 정사각 JPEG 미리보기. HEIC 도 compress 와 같은 디코드 체인으로 처리. */
export function preview(file: File, size = 112, stale?: () => boolean): Promise<Blob> {
  return serial(async () => {
    if (stale?.()) throw new Error("stale");
    if (workerOk()) {
      const m = await viaWorker(file, size);
      if (m) {
        if (m.err !== undefined) throw new Error(m.err);
        return m.blob!;
      }
    }
    return previewMain(file, size);
  }, true);
}

const workerOk = () =>
  typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof OffscreenCanvas.prototype.convertToBlob === "function" && !workerDead;

let worker: Worker | undefined;
let workerDead = false;
let seq = 0;
type Msg = { id: number; ok?: Compressed; blob?: Blob; err?: string; needMain?: true };
let pending: { id: number; res: (m: Msg) => void; rej: (e: Error) => void } | null = null;

function getWorker() {
  if (worker) return worker;
  const w = new Worker(new URL("./compress.worker.ts", import.meta.url), { type: "module" });
  w.onmessage = (e: MessageEvent<Msg>) => pending?.id === e.data.id && pending.res(e.data);
  w.onerror = () => {
    workerDead = true;
    worker = undefined;
    pending?.rej(new Error("worker"));
  };
  return (worker = w);
}

const call = (msg: object, id: number, transfer: Transferable[] = []) =>
  new Promise<Msg>((res, rej) => {
    pending = { id, res, rej };
    getWorker().postMessage({ id, ...msg }, transfer);
  });

/** prev 가 있으면 미리보기 모드. 워커가 죽으면 null(호출자가 메인 스레드로 대체). */
async function viaWorker(file: File, prev?: number): Promise<Msg | null> {
  const id = ++seq;
  try {
    let m = await call({ file, prev }, id);
    if (m.needMain) {
      let bmp: ImageBitmap;
      try {
        bmp = await viaImg(file);
      } catch {
        throw new Error(UNSUPPORTED);
      }
      m = await call({ bitmap: bmp, size: file.size, prev }, id, [bmp]);
    }
    return m;
  } catch (e) {
    if (e instanceof Error && e.message === "worker") return null;
    throw e;
  } finally {
    pending = null;
  }
}

async function previewMain(file: File, size: number): Promise<Blob> {
  const bmp = await decode(file);
  try {
    const s = Math.min(bmp.width, bmp.height);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    c.getContext("2d")?.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.7));
    c.width = c.height = 0;
    if (!blob) throw new Error("encode");
    return blob;
  } finally {
    bmp.close();
  }
}

async function compressMain(file: File): Promise<Compressed> {
  const bmp = await decode(file);
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
