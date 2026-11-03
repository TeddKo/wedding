/** 낙하 파티클 엔진: 고정 캔버스 1장, 파티클 0개면 rAF 정지. */

export interface FallOptions {
  sprites: HTMLImageElement[];
  /** px/s^2 */
  gravity: number;
  /** 0~1, 초당 속도 감쇠 계수 */
  drag: number;
  /** 좌우 흔들림 진폭(px)과 주파수(Hz) */
  sway: { amp: number; hz: number };
  /** 회전 속도 범위(deg/s) */
  spin: [number, number];
  /** 스프라이트 크기 범위(px) */
  size: [number, number];
  /** 수명 마지막 비율 동안 알파 페이드(0~1) */
  alphaTail: number;
  /** 기본 알파(기본 1) */
  alpha?: number;
}

/** 분사 단위 물리·스프라이트 덮어쓰기 */
export interface Kind extends Partial<Omit<FallOptions, "alpha">> {
  alpha?: number;
  /** 수명(s) */
  life?: number;
}

export interface SpawnOpts {
  /** 초기 속도(px/s) */
  vx?: number;
  vy?: number;
  /** 초기 속도 무작위 폭(±) */
  spreadX?: number;
  spreadY?: number;
  /** 이 분사만 물리·스프라이트 덮어쓰기 */
  kind?: Kind;
}

export interface Fall {
  /** 캔버스 상단 영역에서 n 개 낙하 시작. region.x/y 는 [min,max] px(캔버스 좌표, 기본 x 전폭, y [-200,-40]) */
  burst(n: number, region?: { x?: [number, number]; y?: [number, number] }): void;
  /** 뷰포트 좌표(clientX/Y)에서 n 개 분사 */
  spawnAt(x: number, y: number, n: number, opts?: SpawnOpts): void;
  /** 캔버스/루프/리스너 제거 */
  destroy(): void;
}

const MAX = 40;
const MAX_DPR = 2;
const MAX_W = 440;

type K = Required<Omit<FallOptions, "alpha">> & { alpha: number; life: number };

interface P {
  x: number; y: number; vx: number; vy: number; rot: number; vr: number;
  size: number; img: HTMLImageElement; phase: number; age: number; k: K;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** SVG 문자열을 Image 로 래스터화(로드 완료 후 resolve) */
export function svgToImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("svgToImage failed"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export function createFall(o: FallOptions): Fall {
  const noop: Fall = { burst() {}, spawnAt() {}, destroy() {} };
  if (typeof window === "undefined" || !o.sprites.length) return noop;
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  if (mq.matches) return noop;

  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let parts: P[] = [];
  let raf = 0;
  let last = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let dead = false;
  const base: K = { ...o, alpha: o.alpha ?? 1, life: 4 };

  const resize = () => {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    w = Math.min(innerWidth, MAX_W);
    h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  };

  const ensure = () => {
    if (canvas || dead) return;
    canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:fixed;top:0;left:50%;transform:translateX(-50%);pointer-events:none;z-index:var(--z-fx,40)";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    addEventListener("resize", resize);
  };

  const stopLoop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  };

  const release = () => {
    stopLoop();
    if (canvas) {
      removeEventListener("resize", resize);
      canvas.remove();
      canvas = null;
      ctx = null;
    }
  };

  const tick = (t: number) => {
    raf = 0;
    if (!ctx || !canvas) return;
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
    last = t;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const keep: P[] = [];
    for (const p of parts) {
      p.age += dt;
      p.vy += p.k.gravity * dt;
      const d = Math.max(0, 1 - p.k.drag * dt * 60);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const x = p.x + Math.sin(p.phase + p.age * p.k.sway.hz * Math.PI * 2) * p.k.sway.amp;
      if (p.age > p.k.life || p.y > h + p.size) continue;
      const f = p.age / p.k.life;
      const a = p.k.alpha * (f > 1 - p.k.alphaTail ? Math.max(0, (1 - f) / p.k.alphaTail) : 1);
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
      keep.push(p);
    }
    parts = keep;
    if (parts.length && !document.hidden) raf = requestAnimationFrame(tick);
    else if (!parts.length) release();
  };

  const kick = () => {
    if (!raf && !document.hidden && parts.length) raf = requestAnimationFrame(tick);
  };

  const add = (x: number, y: number, vx: number, vy: number, k = base) => {
    if (parts.length >= MAX) return;
    parts.push({
      x, y, vx, vy,
      rot: rand(0, 360), vr: rand(k.spin[0], k.spin[1]) * (Math.random() < 0.5 ? -1 : 1),
      size: rand(k.size[0], k.size[1]),
      img: k.sprites[Math.floor(Math.random() * k.sprites.length)],
      phase: rand(0, Math.PI * 2), age: 0, k,
    });
  };

  const onVis = () => {
    if (document.hidden) stopLoop();
    else kick();
  };
  document.addEventListener("visibilitychange", onVis);

  return {
    burst(n, region) {
      if (dead || mq.matches) return;
      ensure();
      const xr = region?.x ?? [0, w];
      const yr = region?.y ?? [-200, -40];
      for (let i = 0; i < n; i++) add(rand(xr[0], xr[1]), rand(yr[0], yr[1]), rand(-20, 20), rand(0, 60));
      kick();
    },
    spawnAt(x, y, n, opts = {}) {
      if (dead || mq.matches) return;
      ensure();
      const left = canvas ? (innerWidth - w) / 2 : 0;
      const sx = opts.spreadX ?? 80;
      const sy = opts.spreadY ?? 60;
      const k = opts.kind ? { ...base, ...opts.kind } : base;
      for (let i = 0; i < n; i++) add(x - left, y, (opts.vx ?? 0) + rand(-sx, sx), (opts.vy ?? 0) + rand(-sy, sy), k);
      kick();
    },
    destroy() {
      dead = true;
      parts = [];
      document.removeEventListener("visibilitychange", onVis);
      release();
    },
  };
}
