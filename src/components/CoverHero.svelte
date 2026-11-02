<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { Tween } from "svelte/motion";
  import { cubicInOut, cubicOut } from "svelte/easing";
  import { BAT_PATH } from "../lib/bat";
  import { reduced } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";

  let {
    groom,
    bride,
    date,
    dateKo,
    venue,
    focus,
    hasPhoto,
    photo,
  }: { groom: string; bride: string; date: string; dateKo: string; venue: string; focus: string; hasPhoto: boolean; photo?: Snippet } = $props();

  const parts = date.split("-").map(Number);
  const weekday = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay()];
  /* 연·월·일 카운트업 Tween. 초기값은 최종값이라 SSR/무JS 에서는 그대로 보인다 */
  const counters = parts.map((n) => new Tween(n, { duration: 1500, easing: cubicOut }));
  const widths = [4, 2, 2];
  const num = (i: number) => String(Math.round(counters[i].current)).padStart(widths[i], "0");

  const DASH = 260;
  let armed = $state(false);
  let scrollY = $state(0);

  const arch = new Tween(0, { duration: 2400, easing: cubicOut });
  const ink = new Tween(0, { duration: 2300, easing: cubicInOut });
  const fill = new Tween(0, { duration: 1000, easing: cubicOut });

  onMount(() => {
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
    if (!reduced()) {
      armed = true;
      for (const c of counters) c.set(0, { duration: 0 });
    }
    return () => removeEventListener("scroll", onScroll);
  });

  let played = false;
  $effect(() => {
    if (!armed || !stage.open || played) return;
    played = true;
    arch.target = 1;
    ink.set(1, { delay: 500 }).then(() => (fill.target = 1));
    for (const [i, c] of counters.entries()) c.set(parts[i], { delay: 1700 + i * 140 });
  });

  const parY = $derived(armed ? Math.min(scrollY, 900) * 0.14 : 0);
  const scale = $derived(armed ? 1.1 - arch.current * 0.06 : 1.04);
  const overOpacity = $derived(armed ? 1 - (Math.min(scrollY, 200) / 200) * 0.4 : 1);
</script>

<header class="cover" style:--focus={focus}>
  <div class="hero">
    <div class="frame">
      <p class="bar" data-th="dev" aria-hidden="true"><span class="dots">● ● ●</span>~/us/cover.jpg</p>
      <div class="stage">
        {#if hasPhoto}
          <div class="photo" style:transform="translate3d(0, {parY * 0.4}px, 0) scale({scale})">{@render photo?.()}</div>
        {:else}
          <div class="placeholder" role="img" aria-label="사진이 들어갈 자리">
            <div class="ph-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.6" />
              </svg>
              <b>사진 자리</b>
              <small>PHOTO</small>
            </div>
          </div>
        {/if}
        <div class="shade"></div>
        <div class="arch-line" data-th="halloween"></div>
        <svg class="cobweb tl" data-th="halloween" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <g fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round">
            <path d="M0 0 L120 0 M0 0 L0 120 M0 0 L104 62 M0 0 L62 104 M0 0 L116 28 M0 0 L28 116" />
            <path d="M24 0 Q20 20 0 24 M48 0 Q42 42 0 48 M72 0 Q64 64 0 72 M96 0 Q86 86 0 96" />
          </g>
        </svg>
        <svg class="cobweb br" data-th="halloween" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <g fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round">
            <path d="M0 0 L120 0 M0 0 L0 120 M0 0 L104 62 M0 0 L62 104 M0 0 L116 28 M0 0 L28 116" />
            <path d="M24 0 Q20 20 0 24 M48 0 Q42 42 0 48 M72 0 Q64 64 0 72 M96 0 Q86 86 0 96" />
          </g>
        </svg>
        {#each ["tl", "br"] as pos}
          <svg class="paws {pos}" data-th="puppy" viewBox="0 0 110 90" aria-hidden="true" focusable="false">
            {#each [[14, 74, -30], [40, 52, -20], [62, 30, -30], [88, 12, -20]] as [x, y, r], i}
              <g fill="rgb(var(--gold-rgb) / {0.4 + i * 0.1})" transform="translate({x} {y}) rotate({r}) scale(0.5)">
                <ellipse cx="0" cy="6" rx="8" ry="7" /><circle cx="-9" cy="-4" r="3.4" /><circle cx="-3" cy="-9" r="3.4" /><circle cx="3" cy="-9" r="3.4" /><circle cx="9" cy="-4" r="3.4" />
              </g>
            {/each}
          </svg>
        {/each}
        <div class="over" style:opacity={armed ? overOpacity : undefined} aria-hidden="true">
          <p class="of">The Wedding of</p>
          <p class="dateh"><span>{num(0)}</span><i>|</i><span>{num(1)}</span><i>|</i><span>{num(2)}</span></p>
          <p class="wk">{weekday}</p>
        </div>
      </div>
    </div>
  </div>

  <p class="script">
    <span data-th="halloween">the thirty-first of October</span>
    <span data-th="dev">git tag v1.0 -m "10.31"</span>
    <span data-th="puppy">Sunday, the thirty-first of October</span>
  </p>

  <h1 class="names" class:inked={armed}>
    <span class="names-text"><span class="l1">{groom}<span class="dot">·</span>{bride}</span> <span class="l2">결혼합니다</span></span>
    {#if armed}
      <svg class="ink" viewBox="0 0 300 80" aria-hidden="true" focusable="false" style:--dash={DASH} style:--off={(1 - ink.current) * DASH} style:--fill={fill.current}>
        <text x="150" y="33" text-anchor="middle" class="t1">{groom}<tspan class="a" dx="14">·</tspan><tspan dx="14">{bride}</tspan></text>
        <text x="150" y="69" text-anchor="middle" class="t2">결혼합니다</text>
      </svg>
    {/if}
  </h1>

  <svg class="orn-divider" viewBox="0 0 240 24" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" style:opacity={armed ? fill.current : undefined}>
      <path d="M4 12H92" /><path d="M236 12H148" />
      <path d="M92 12c8 0 10-8 18-8m-18 8c8 0 10 8 18 8m-18-8h8" />
      <path d="M148 12c-8 0-10-8-18-8m18 8c-8 0-10 8-18 8m18-8h-8" />
    </g>
    <g style:opacity={armed ? fill.current : undefined}>
      <path data-th="halloween" transform="translate(104 4) scale(0.5)" fill="currentColor" d={BAT_PATH} />
      <text data-th="dev" x="120" y="16" text-anchor="middle" font-size="11" font-family="JetBrains Mono, ui-monospace, Menlo, monospace" fill="currentColor">&lt;/&gt;</text>
      <g data-th="puppy" fill="currentColor" transform="translate(120 12) scale(0.55)">
        <ellipse cx="0" cy="6" rx="8" ry="7" /><circle cx="-9" cy="-4" r="3.4" /><circle cx="-3" cy="-9" r="3.4" /><circle cx="3" cy="-9" r="3.4" /><circle cx="9" cy="-4" r="3.4" />
      </g>
    </g>
  </svg>

  <p class="cover-date">{dateKo}</p>
  <p class="cover-venue" style:opacity={armed ? Math.min(1, fill.current * 1.5) : undefined}>{venue}</p>
  <svg class="cue" class:gone={scrollY > 40} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
</header>

<style>
  .cover { text-align: center; position: relative; padding-bottom: 28px; }
  .hero { padding: var(--hero-inset) var(--hero-inset) 0; }
  .frame {
    position: relative; width: 100%; aspect-ratio: 4 / 5; max-height: calc(100svh - 190px);
    display: flex; flex-direction: column; overflow: hidden; background: var(--bg-2);
    border-radius: 0; box-shadow: var(--hero-line);
  }
  :global([data-theme="dev"]) .frame, :global([data-theme="puppy"]) .frame { border-radius: var(--hero-r); }
  .bar {
    flex: none; height: 30px; padding: 0 12px; display: flex; align-items: center; gap: 12px; text-align: left;
    background: rgb(var(--bg2-rgb)); border-bottom: 1px solid rgb(var(--gold-rgb) / 0.4);
    font: 12px/1 var(--latin); color: var(--ivory-dim);
  }
  .dots { color: var(--gold); letter-spacing: 0.1em; }
  .stage { position: relative; flex: 1; min-height: 0; overflow: hidden; }
  .photo { position: absolute; inset: 0; will-change: transform; }
  .photo :global(img) { width: 100%; height: 100%; object-fit: cover; object-position: var(--focus); display: block; }
  .placeholder {
    position: absolute; inset: 0; display: grid; place-items: center;
    background: repeating-linear-gradient(45deg, var(--panel-a) 0 14px, var(--panel-b) 14px 28px);
  }
  .ph-box {
    display: grid; justify-items: center; gap: 2px; padding: 18px 26px; color: var(--ivory-dim);
    border: 1.5px dashed rgb(var(--gold-rgb) / 0.7); background: rgb(var(--bg-rgb) / 0.55);
  }
  .ph-box b { font-size: 15px; line-height: 1.6; }
  .ph-box small { font: 11px/1 var(--latin); letter-spacing: 0.2em; }
  .shade { position: absolute; inset: 0 0 auto; height: 40%; background: linear-gradient(rgb(var(--shade-rgb) / 0.55), transparent); pointer-events: none; }
  .arch-line { position: absolute; inset: 14px; border: 3px double var(--gold); border-radius: var(--hero-r); pointer-events: none; }
  .cobweb { position: absolute; width: 84px; color: rgb(var(--gold-rgb) / 0.55); pointer-events: none; }
  .cobweb.tl { top: 0; left: 0; }
  .cobweb.br { bottom: 0; right: 0; transform: rotate(180deg); }
  .code { position: absolute; font: 12px/1.4 var(--latin); color: #fff; opacity: 0.85; text-shadow: 0 1px 4px rgb(0 0 0 / 0.6); }
  .code.tl { bottom: 22px; left: 12px; }
  .code.br { bottom: 22px; right: 12px; }
  .paws { position: absolute; width: 96px; pointer-events: none; }
  .paws.tl { top: 4px; left: 4px; }
  .paws.br { bottom: 4px; right: 4px; transform: rotate(180deg); }

  .over { position: absolute; inset: 0 0 auto; padding-top: 22px; color: #fff; text-shadow: 0 1px 8px rgb(0 0 0 / 0.55); pointer-events: none; }
  .of { font: 11px/1.6 var(--latin); letter-spacing: 0.3em; text-transform: uppercase; }
  .dateh { font: 700 28px/1.3 var(--latin); font-variant-numeric: tabular-nums; letter-spacing: 0.04em; }
  .dateh i { font-style: normal; margin: 0 0.5em; opacity: 0.7; }
  .wk { font: 12px/1.6 var(--latin); letter-spacing: 0.4em; text-indent: 0.4em; }

  .script {
    position: relative; z-index: 2; margin: -0.55em 16px 0; font: clamp(22px, 6.4vw, 26px)/1.2 var(--script); color: var(--accent-ink);
    text-shadow: 0 1px 8px rgb(var(--shade-rgb) / 0.6);
  }
  :global([data-theme="dev"]) .script { font-size: 18px; text-shadow: none; }
  :global([data-theme="puppy"]) .script { text-shadow: 0 1px 6px rgb(var(--bg-rgb) / 0.95), 0 0 2px rgb(var(--bg-rgb)); }
  :global([data-theme="puppy"]) .shade { background: linear-gradient(rgb(var(--shade-rgb) / 0.8), rgb(var(--shade-rgb) / 0.25) 60%, transparent); }

  .names { width: 300px; height: 84px; margin: 14px auto 0; position: relative; font-family: var(--hand); font-weight: 400; letter-spacing: 0.08em; }
  .names-text { display: block; }
  .l1 { display: block; white-space: nowrap; height: 44px; line-height: 44px; font-size: 34px; }
  .l2 { display: block; height: 36px; line-height: 36px; font-size: 22px; }
  .dot { color: var(--pumpkin); margin: 0 0.4em; }
  .names.inked .names-text { color: transparent; }
  .names.inked .names-text .dot { color: transparent; }
  .ink { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .ink text {
    font-family: var(--hand); font-weight: 400; letter-spacing: 0.08em; white-space: pre;
    fill: var(--ivory); fill-opacity: var(--fill); stroke: var(--gold); stroke-width: 0.9; stroke-linejoin: round;
    stroke-dasharray: var(--dash); stroke-dashoffset: var(--off);
  }
  .ink .t1 { font-size: 34px; }
  .ink .t2 { font-size: 22px; }
  .ink .a { fill: var(--pumpkin); stroke: var(--pumpkin); }

  .cover-date { font-size: 17px; margin-top: 4px; color: var(--ivory-dim); }
  .cover-venue { color: var(--ivory-dim); margin-top: 2px; }
  .cue { display: block; width: 28px; height: 28px; margin: 14px auto 0; color: var(--gold); transition: opacity 0.4s; animation: cue 1.6s ease-in-out infinite; }
  .cue.gone { opacity: 0; animation: none; }
  @keyframes cue { 50% { transform: translateY(6px); } }
  @media (prefers-reduced-motion: reduce) { .cue { animation: none; } }
</style>
