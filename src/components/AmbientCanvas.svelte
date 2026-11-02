<script lang="ts">
  import { onMount } from "svelte";
  import { BAT_PATH } from "../lib/bat";
  import { lerp, rand, reduced } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";

  let canvas: HTMLCanvasElement;

  /* 품질 단계: 0=최소, 1=낮음, 2=보통. 프레임 시간이 길면 한 단계씩만 내려간다 */
  const TIERS = [
    { fog: 1, embers: 10, dpr: 1, fps: 30 },
    { fog: 2, embers: 18, dpr: 1.25, fps: 45 },
    { fog: 3, embers: 34, dpr: 2, fps: 60 },
  ];
  const SLOW_MS = 26;

  onMount(() => {
    if (reduced()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const html = document.documentElement;

    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    let tier = cores <= 4 || mem <= 2 ? 1 : 2;
    canvas.dataset.tier = String(tier);

    const sprite = (size: number, stops: [number, string][]) => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const g = c.getContext("2d")!;
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      for (const [o, col] of stops) grad.addColorStop(o, col);
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      return c;
    };
    const fogSpr = [
      sprite(256, [[0, "rgba(150,120,190,0.55)"], [1, "rgba(150,120,190,0)"]]),
      sprite(256, [[0, "rgba(224,122,47,0.32)"], [1, "rgba(224,122,47,0)"]]),
      sprite(256, [[0, "rgba(120,100,160,0.5)"], [1, "rgba(120,100,160,0)"]]),
    ];
    const emberSpr = sprite(48, [[0, "rgba(255,225,160,1)"], [0.25, "rgba(255,150,70,0.85)"], [1, "rgba(224,122,47,0)"]]);
    const dustSpr = sprite(48, [[0, "rgba(246,226,160,1)"], [0.3, "rgba(201,164,92,0.6)"], [1, "rgba(201,164,92,0)"]]);
    const moonSpr = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 220;
      const g = c.getContext("2d")!;
      const halo = g.createRadialGradient(110, 110, 30, 110, 110, 110);
      halo.addColorStop(0, "rgba(242,232,213,0.5)");
      halo.addColorStop(1, "rgba(242,232,213,0)");
      g.fillStyle = halo;
      g.fillRect(0, 0, 220, 220);
      const body = g.createRadialGradient(94, 92, 4, 110, 110, 46);
      body.addColorStop(0, "#fbf3df");
      body.addColorStop(1, "#c9b88f");
      g.fillStyle = body;
      g.beginPath();
      g.arc(110, 110, 42, 0, Math.PI * 2);
      g.fill();
      return c;
    })();
    const bat = new Path2D(BAT_PATH);

    let W = 0, H = 0, dpr = 1;
    let cfg = TIERS[tier];
    type P = { x: number; y: number; v: number; a: number; k: number; ph: number; s: number; gold: boolean };
    let ps: P[] = [];
    const seed = (p?: Partial<P>): P => ({
      x: rand(0, W), y: rand(0, H), v: rand(10, 34), a: rand(6, 22), k: rand(0.4, 1.2), ph: rand(0, 6.28), s: rand(9, 22), gold: Math.random() < 0.35, ...p,
    });
    const fogs = Array.from({ length: 3 }, (_, i) => ({ ph: rand(0, 6.28), sp: rand(0.05, 0.11) * (i % 2 ? -1 : 1), y: 0.22 + i * 0.28, h: 0.34 + i * 0.05, al: 0.5 - i * 0.08 }));

    function resize() {
      const r = canvas.getBoundingClientRect();
      /* 모바일 주소창 변화로 높이만 조금 달라지는 경우엔 다시 맞추지 않는다 */
      if (W && r.width === W && Math.abs(r.height - H) < H * 0.25 && cfg.dpr === dpr) return;
      W = r.width;
      H = r.height;
      dpr = Math.min(devicePixelRatio || 1, cfg.dpr);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ps = Array.from({ length: cfg.embers }, () => seed());
    }

    let raf = 0, running = false, last = 0, born = 0, nextBat = 0;
    let batT = -1, batDir = 1, ema = 16, samples = 0;
    const batDur = 5200;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dtMs = now - last;
      if (dtMs < 1000 / cfg.fps - 2) return;
      last = now;
      const dt = Math.min(dtMs, 50) / 1000;
      const t = (now - born) / 1000;

      /* 프레임 시간 측정: 처음 몇 프레임은 버리고, 느리면 단계를 내린다 */
      if (++samples > 8) {
        ema = lerp(ema, dtMs, 0.08);
        if (samples > 60 && ema > SLOW_MS && tier > 0) {
          tier--;
          cfg = TIERS[tier];
          canvas.dataset.tier = String(tier);
          W = 0;
          resize();
          samples = 0;
          ema = 16;
        }
      }

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.globalCompositeOperation = "source-over";
      ctx!.globalAlpha = 1;
      const colW = Math.min(W, 480), colX = (W - colW) / 2;
      ctx!.fillStyle = "#0a070d";
      ctx!.fillRect(0, 0, W, H);
      ctx!.fillStyle = "#120d16";
      ctx!.fillRect(colX, 0, colW, H);

      /* 달 */
      const rise = Math.min(1, t / 3.2);
      const e = 1 - (1 - rise) ** 3;
      const mx = colX + colW - 64, my = lerp(150, 84, e);
      ctx!.globalAlpha = 0.2 * e;
      ctx!.drawImage(moonSpr, mx - 110, my - 110);

      /* 안개 */
      for (let i = 0; i < cfg.fog; i++) {
        const f = fogs[i];
        const w = W * 1.5, h = H * f.h;
        ctx!.globalAlpha = f.al * 0.22;
        ctx!.drawImage(fogSpr[i], W / 2 - w / 2 + Math.sin(t * f.sp + f.ph) * W * 0.28, H * f.y - h / 2 + Math.cos(t * f.sp * 0.7 + f.ph) * 22, w, h);
      }

      /* 불씨 */
      ctx!.globalCompositeOperation = "lighter";
      for (const p of ps) {
        p.y -= p.v * dt;
        if (p.y < -p.s) {
          p.y = H + p.s;
          p.x = rand(0, W);
        }
        const x = p.x + Math.sin(t * p.k + p.ph) * p.a;
        const fl = 0.55 + 0.45 * Math.sin(t * (2 + p.k * 3) + p.ph);
        const edge = Math.min(1, p.y / (H * 0.2), (H - p.y) / (H * 0.1) + 0.4);
        ctx!.globalAlpha = Math.max(0, 0.7 * fl * edge);
        ctx!.drawImage(p.gold ? dustSpr : emberSpr, x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }

      /* 가끔 달 앞을 가로지르는 박쥐 */
      ctx!.globalCompositeOperation = "source-over";
      if (batT < 0 && now > nextBat && e > 0.9) {
        batT = 0;
        batDir = Math.random() < 0.5 ? 1 : -1;
      }
      if (batT >= 0) {
        batT += dtMs;
        const p = batT / batDur;
        if (p >= 1) {
          batT = -1;
          nextBat = now + rand(9000, 17000);
        } else {
          const bx = lerp(batDir > 0 ? -50 : W + 50, batDir > 0 ? W + 50 : -50, p);
          const by = my + Math.sin(p * 9) * 16 + (0.5 - p) * 40 * batDir;
          const flap = 0.62 + 0.38 * Math.sin(t * 17);
          ctx!.globalAlpha = 0.95;
          ctx!.fillStyle = "#04020a";
          ctx!.setTransform(dpr * batDir * 0.85, 0, 0, dpr * 0.85 * flap, bx * dpr, by * dpr);
          ctx!.translate(-32, -16);
          ctx!.fill(bat);
        }
      }
    }

    function start() {
      if (running || mq.matches || document.hidden || !stage.open) return;
      running = true;
      resize();
      last = performance.now();
      born ||= last;
      nextBat ||= last + 4500;
      canvas.classList.add("on");
      html.classList.add("ambient");
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    let visible = true;
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      visible ? start() : stop();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => running && resize());
    ro.observe(canvas);
    const vis = () => (document.hidden ? stop() : visible && start());
    const rm = () => {
      if (!mq.matches) return;
      stop();
      canvas.classList.remove("on");
      html.classList.remove("ambient");
    };
    document.addEventListener("visibilitychange", vis);
    mq.addEventListener("change", rm);

    const poll = $effect.root(() => {
      $effect(() => {
        if (stage.open) start();
      });
    });

    return () => {
      stop();
      poll();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", vis);
      mq.removeEventListener("change", rm);
      html.classList.remove("ambient");
    };
  });
</script>

<canvas bind:this={canvas} class="ambient-canvas" aria-hidden="true"></canvas>

<style>
  .ambient-canvas {
    position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; opacity: 0; transition: opacity 1.8s ease;
  }
  .ambient-canvas:global(.on) { opacity: 1; }
</style>
