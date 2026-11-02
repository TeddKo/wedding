<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { Spring, Tween } from "svelte/motion";
  import { cubicInOut, cubicOut, quartOut } from "svelte/easing";
  import Moon from "./ui/Moon.svelte";
  import Dogs from "./ui/Dogs.svelte";
  import Terminal from "./ui/Terminal.svelte";
  import { reduced, rand } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";

  let {
    groom,
    bride,
    dateKo,
    venue,
    hasPhoto,
    photo,
  }: { groom: string; bride: string; dateKo: string; venue: string; hasPhoto: boolean; photo?: Snippet } = $props();

  const tokens = dateKo.split(/(\d+)/);
  /* 날짜의 숫자 조각마다 카운트업 Tween. 초기값은 최종값이라 SSR/무JS 에서는 그대로 보인다 */
  const counters = tokens.map((t, i) => (i % 2 ? new Tween(Number(t), { duration: 1500, easing: cubicOut }) : null));

  const DASH = 260;
  let armed = $state(false);
  let rootEl = $state<HTMLElement>();
  let inView = $state(true);
  let scrollY = $state(0);

  const rise = new Tween(0, { duration: 2200, easing: quartOut });
  const arch = new Tween(0, { duration: 1400, easing: cubicOut });
  const ink = new Tween(0, { duration: 2300, easing: cubicInOut });
  const fill = new Tween(0, { duration: 1000, easing: cubicOut });
  const flame = new Spring({ sx: 1, sy: 1, r: 0, o: 1 }, { stiffness: 0.14, damping: 0.32 });

  onMount(() => {
    if (reduced()) return;
    armed = true;
    arch.set(0, { duration: 0 });
    for (const c of counters) c?.set(0, { duration: 0 });

    const io = new IntersectionObserver(([e]) => (inView = e.isIntersecting));
    if (rootEl) io.observe(rootEl);

    let pending = false;
    const onScroll = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        scrollY = window.scrollY;
      });
    };
    addEventListener("scroll", onScroll, { passive: true });

    const tick = setInterval(() => {
      if (document.hidden || !inView) return;
      flame.target = { sx: 1 + rand(-0.07, 0.06), sy: 1 + rand(-0.08, 0.12), r: rand(-3.5, 3.5), o: rand(0.82, 1) };
    }, 140);

    return () => {
      io.disconnect();
      removeEventListener("scroll", onScroll);
      clearInterval(tick);
    };
  });

  let played = false;
  $effect(() => {
    if (!armed || !stage.open || played) return;
    played = true;
    arch.target = 1;
    rise.set(1, { delay: 250 });
    ink.set(1, { delay: 500 }).then(() => fill.target = 1);
    let k = 0;
    for (const [i, c] of counters.entries()) if (c) c.set(Number(tokens[i]), { delay: 1700 + k++ * 140 });
  });

  const parY = $derived(Math.min(scrollY, 900) * 0.14);
  const ratio = (n: Tween<number>, v: string) => String(Math.round(n.current)).padStart(v.length, "0");
</script>

<header class="cover" bind:this={rootEl}>
  <p class="corner-code" data-th="dev" aria-hidden="true">// TODO: 평생 행복하기</p>
  <svg class="paws" data-th="puppy" viewBox="0 0 110 90" aria-hidden="true" focusable="false">
    {#each [[14, 74, -30], [40, 52, -20], [62, 30, -30], [88, 12, -20]] as [x, y, r], i}
      <g fill="rgb(var(--gold-rgb) / {0.22 + i * 0.08})" transform="translate({x} {y}) rotate({r}) scale(0.5)">
        <ellipse cx="0" cy="6" rx="8" ry="7" /><circle cx="-9" cy="-4" r="3.4" /><circle cx="-3" cy="-9" r="3.4" /><circle cx="3" cy="-9" r="3.4" /><circle cx="9" cy="-4" r="3.4" />
      </g>
    {/each}
  </svg>
  <div class="cobweb tl" data-th="halloween">
    <svg class="orn-cobweb" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round">
        <path d="M0 0 L120 0 M0 0 L0 120 M0 0 L104 62 M0 0 L62 104 M0 0 L116 28 M0 0 L28 116" />
        <path d="M24 0 Q20 20 0 24 M48 0 Q42 42 0 48 M72 0 Q64 64 0 72 M96 0 Q86 86 0 96" />
      </g>
    </svg>
  </div>
  <p class="latin">
    <span data-th="halloween">The Wedding · Hallow's Eve</span>
    <span data-th="dev">git merge --no-ff us</span>
    <span data-th="puppy">The Wedding · 우리 둘, 그리고 멍멍</span>
  </p>
  <div class="arch" style:transform={armed ? `scale(${0.93 + arch.current * 0.07})` : undefined} style:opacity={armed ? arch.current : undefined}>
    {#if hasPhoto}
      <div class="photo" style:transform="translate3d(0, {parY * 0.4}px, 0) scale(1.1)">{@render photo?.()}</div>
    {:else}
      <div class="arch-placeholder" role="img" aria-label="사진이 들어갈 자리">
        <div class="art" data-th="dev puppy" style:transform="translate3d(0, {armed ? (1 - rise.current) * 40 + parY * 0.3 : 0}px, 0)" style:opacity={armed ? Math.min(1, rise.current * 1.6) : 1}>
          <span data-th="dev"><Terminal {groom} {bride} /></span>
          <span data-th="puppy"><Dogs /></span>
        </div>
        <div class="moon" data-th="halloween" style:transform="translate3d(-50%, {armed ? (1 - rise.current) * 130 + parY : 0}px, 0)" style:opacity={armed ? Math.min(1, rise.current * 2) : 1}>
          <Moon />
        </div>
        <div class="candle-wrap" data-th="halloween">
          <i class="halo" style:opacity={flame.current.o * 0.55}></i>
          <svg class="orn-candle" viewBox="0 0 40 90" aria-hidden="true" focusable="false">
            <g class="fl" style:transform="scale({flame.current.sx}, {flame.current.sy}) rotate({flame.current.r}deg)" style:opacity={flame.current.o}>
              <path d="M20 4c5 7 8 12 8 18a8 8 0 0 1-16 0c0-6 3-11 8-18Z" fill="#e07a2f" />
              <path d="M20 12c2.6 4 4 7 4 10a4 4 0 0 1-8 0c0-3 1.4-6 4-10Z" fill="#f6d27a" />
            </g>
            <rect x="19.4" y="28" width="1.2" height="6" fill="#3a2e3f" />
            <path d="M11 36h18v46a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V36Z" fill="#f2e8d5" />
            <path d="M11 36h18l-1 6c-2 2-4 0-6 2s-4 0-6 0-3-2-5-2l-0-6Z" fill="#fffaf0" opacity="0.6" />
          </svg>
        </div>
      </div>
    {/if}
  </div>

  <h1 class="names" class:inked={armed}>
    <span class="names-text">{groom}<span class="amp">&amp;</span>{bride}</span>
    {#if armed}
      <svg class="ink" viewBox="0 0 300 45" aria-hidden="true" focusable="false" style:--dash={DASH} style:--off={(1 - ink.current) * DASH} style:--fill={fill.current}>
        <text x="150" y="33" text-anchor="middle">{groom}<tspan class="a" dx="13">&amp;</tspan><tspan dx="13">{bride}</tspan></text>
      </svg>
    {/if}
  </h1>

  <svg class="orn-divider" viewBox="0 0 240 24" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" style:opacity={armed ? fill.current : undefined}>
      <path d="M4 12H92" /><path d="M236 12H148" />
      <path d="M92 12c8 0 10-8 18-8m-18 8c8 0 10 8 18 8m-18-8h8" />
      <path d="M148 12c-8 0-10-8-18-8m18 8c-8 0-10 8-18 8m18-8h-8" />
    </g>
    <path d="M120 3l5 9-5 9-5-9Z" fill="currentColor" style:opacity={armed ? fill.current : undefined} />
  </svg>

  <p class="cover-date">
    <span class="sr">{dateKo}</span>
    <span aria-hidden="true" class="digits">
      {#each tokens as t, i}{#if i % 2 && counters[i]}{ratio(counters[i]!, t)}{:else}{t}{/if}{/each}
    </span>
  </p>
  <p class="cover-venue" style:opacity={armed ? Math.min(1, fill.current * 1.5) : undefined}>{venue}</p>
</header>

<style>
  .cover { padding: 56px 28px 40px; text-align: center; position: relative; }
  .cobweb { position: absolute; top: 0; left: 0; width: 110px; color: rgb(var(--gold-rgb) / 0.35); }
  .cobweb :global(svg) { width: 100%; display: block; }
  .arch {
    width: 80%; max-width: 320px; aspect-ratio: 3 / 4; margin: 24px auto 32px; will-change: transform, opacity;
    border: 1px solid var(--gold); border-radius: var(--arch-r); padding: 6px; overflow: hidden;
  }
  .arch > :global(*) { width: 100%; height: 100%; border-radius: var(--arch-r); display: block; }
  .photo { overflow: hidden; will-change: transform; }
  .photo :global(img) { width: 100%; height: 100%; object-fit: cover; display: block; }
  .arch-placeholder { background: linear-gradient(var(--panel-a), var(--panel-b) 70%) ; position: relative; overflow: hidden; }
  .art { position: absolute; inset: 6% 6% 10%; display: grid; align-content: end; will-change: transform, opacity; }
  :global([data-theme="dev"]) .art { align-content: center; }
  .art :global(svg) { width: 100%; height: auto; display: block; }
  .corner-code { position: absolute; top: 14px; left: 16px; font: 12px/1.4 var(--latin); color: var(--ivory-dim); opacity: 0.7; }
  .paws { position: absolute; top: 8px; left: 6px; width: 110px; }
  .moon { position: absolute; top: 12%; left: 50%; width: 38%; will-change: transform, opacity; filter: drop-shadow(0 0 18px rgb(242 232 213 / 0.4)); }
  .moon :global(svg) { width: 100%; height: auto; display: block; }
  .candle-wrap { position: absolute; bottom: 8%; left: 50%; width: 15%; transform: translateX(-50%); }
  .candle-wrap .orn-candle { width: 100%; height: auto; display: block; border-radius: 0; }
  .fl { transform-box: fill-box; transform-origin: 50% 100%; }
  .halo {
    position: absolute; left: 50%; top: -30%; width: 420%; aspect-ratio: 1; margin-left: -210%; border-radius: 50%; pointer-events: none;
    background: radial-gradient(closest-side, rgb(255 190 100 / 0.45), rgb(var(--accent-rgb) / 0));
  }

  .names { font-size: 32px; font-weight: 700; letter-spacing: 0.08em; line-height: 1.4; position: relative; }
  .amp { color: var(--pumpkin); margin: 0 0.4em; font-weight: 400; }
  .names.inked .names-text { color: transparent; }
  .names.inked .names-text .amp { color: transparent; }
  .ink { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .ink text {
    font-family: var(--serif); font-weight: 700; font-size: 32px; letter-spacing: 0.08em; white-space: pre;
    fill: var(--ivory); fill-opacity: var(--fill); stroke: var(--gold); stroke-width: 0.9; stroke-linejoin: round;
    stroke-dasharray: var(--dash); stroke-dashoffset: var(--off);
  }
  .ink .a { fill: var(--pumpkin); stroke: var(--pumpkin); font-weight: 400; }

  .cover-date { font-size: 18px; margin-top: 4px; }
  .digits { font-variant-numeric: tabular-nums; }
  .cover-venue { color: var(--ivory-dim); margin-top: 4px; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
