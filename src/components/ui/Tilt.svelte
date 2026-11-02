<script lang="ts">
  import type { Snippet } from "svelte";
  import { Spring } from "svelte/motion";
  import { reduced } from "../../lib/motion";

  let { children, label }: { children: Snippet; label: string } = $props();

  const t = new Spring({ rx: 0, ry: 0, gx: 50, gy: 50, g: 0, s: 1 }, { stiffness: 0.12, damping: 0.55 });
  const off = { rx: 0, ry: 0, gx: 50, gy: 50, g: 0, s: 1 };
  let el: HTMLDivElement;

  function move(e: PointerEvent) {
    if (reduced()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    t.target = { rx: (0.5 - y) * 22, ry: (x - 0.5) * 22, gx: x * 100, gy: y * 100, g: 1, s: 1.05 };
  }
  const leave = () => (t.target = off);
</script>

<div
  bind:this={el}
  class="tilt"
  role="img"
  aria-label={label}
  onpointermove={move}
  onpointerleave={leave}
  onpointercancel={leave}
  style:transform="perspective(520px) rotateX({t.current.rx}deg) rotateY({t.current.ry}deg) scale({t.current.s})"
>
  {@render children()}
  <i class="glare" style:opacity={t.current.g} style:background="radial-gradient(circle at {t.current.gx}% {t.current.gy}%, rgb(var(--glow-rgb) / 0.4), rgb(var(--glow-rgb) / 0) 58%)"></i>
</div>

<style>
  .tilt {
    position: relative; width: 100%; height: 100%; display: grid; place-items: center; will-change: transform; transform-style: preserve-3d;
    background: linear-gradient(145deg, var(--panel-a), var(--panel-b)); border: 1px solid rgb(var(--gold-rgb) / 0.3); overflow: hidden;
  }
  .tilt::after {
    content: ""; position: absolute; inset: 0; pointer-events: none; transform: translate3d(-120%, 0, 0);
    background: linear-gradient(105deg, transparent 38%, rgb(var(--glow-rgb) / 0.14) 50%, transparent 62%);
    animation: shimmer 4.2s ease-in-out infinite; animation-delay: var(--d, 0s);
  }
  .glare { position: absolute; inset: 0; pointer-events: none; }
  @keyframes shimmer { 0% { transform: translate3d(-120%, 0, 0); } 45%, 100% { transform: translate3d(120%, 0, 0); } }
  @media (prefers-reduced-motion: reduce) { .tilt::after { animation: none; display: none; } }
</style>
