<script lang="ts">
  import { onMount } from "svelte";
  import { lerp, rand, reduced } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";
  import { theme } from "../lib/theme.svelte";

  let canvas: HTMLCanvasElement;

  /* 할로윈 전용: 불씨 10개만 천천히 올라간다. 다른 테마는 그리지 않는다 */
  const EMBERS = 10;
  const ALPHA = 0.35;
  const OUTER = "#0f0b13";
  const COL = "#17121b";

  onMount(() => {
    if (reduced()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const html = document.documentElement;

    const ember = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 48;
      const g = c.getContext("2d")!;
      const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      grad.addColorStop(0, "rgba(255,225,160,1)");
      grad.addColorStop(0.25, "rgba(255,150,70,0.85)");
      grad.addColorStop(1, "rgba(224,122,47,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 48, 48);
      return c;
    })();

    let W = 0, H = 0;
    type P = { x: number; y: number; v: number; a: number; k: number; ph: number; s: number };
    let ps: P[] = [];
    const seed = (): P => ({ x: rand(0, W), y: rand(0, H), v: rand(10, 30), a: rand(6, 22), k: rand(0.4, 1.2), ph: rand(0, 6.28), s: rand(5, 11) });

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (W && r.width === W && Math.abs(r.height - H) < H * 0.25) return;
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W);
      canvas.height = Math.round(H);
      ps = Array.from({ length: EMBERS }, seed);
    }

    let raf = 0, running = false, last = 0, born = 0;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dtMs = now - last;
      if (dtMs < 1000 / 30 - 2) return;
      last = now;
      const dt = Math.min(dtMs, 50) / 1000;
      const t = (now - born) / 1000;
      const g = ctx!;
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      const colW = Math.min(W, 440), colX = (W - colW) / 2;
      g.fillStyle = OUTER;
      g.fillRect(0, 0, W, H);
      g.fillStyle = COL;
      g.fillRect(colX, 0, colW, H);
      g.globalCompositeOperation = "lighter";
      for (const p of ps) {
        p.y -= p.v * dt;
        if (p.y < -p.s) {
          p.y = H + p.s;
          p.x = rand(0, W);
        }
        const x = p.x + Math.sin(t * p.k + p.ph) * p.a;
        const fl = 0.55 + 0.45 * Math.sin(t * (2 + p.k * 3) + p.ph);
        const edge = Math.min(1, p.y / (H * 0.2), (H - p.y) / (H * 0.1) + 0.4);
        g.globalAlpha = Math.max(0, ALPHA * lerp(0.5, 1, fl) * edge);
        g.drawImage(ember, x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
    }

    function start() {
      if (running || mq.matches || document.hidden || !stage.open || theme.name !== "halloween") return;
      running = true;
      resize();
      last = performance.now();
      born ||= last;
      canvas.classList.add("on");
      html.classList.add("ambient");
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }
    function off() {
      stop();
      canvas.classList.remove("on");
      html.classList.remove("ambient");
    }

    let visible = true;
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      visible ? start() : stop();
    });
    io.observe(document.querySelector("header.cover") ?? canvas);
    const ro = new ResizeObserver(() => running && resize());
    ro.observe(canvas);
    const vis = () => (document.hidden ? stop() : visible && start());
    const rm = () => mq.matches && off();
    document.addEventListener("visibilitychange", vis);
    mq.addEventListener("change", rm);

    const poll = $effect.root(() => {
      $effect(() => {
        if (!stage.open) return;
        if (theme.name === "halloween") start();
        else off();
      });
    });

    return () => {
      off();
      poll();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", vis);
      mq.removeEventListener("change", rm);
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
