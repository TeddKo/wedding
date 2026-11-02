<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { Tween } from "svelte/motion";
  import { cubicInOut, cubicOut } from "svelte/easing";
  import Dogs from "./ui/Dogs.svelte";
  import { reduced } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";

  let {
    groom,
    bride,
    date,
    time,
    dateKo,
    venue,
    focus,
    hasPhoto,
    photo,
  }: { groom: string; bride: string; date: string; time: string; dateKo: string; venue: string; focus: string; hasPhoto: boolean; photo?: Snippet } = $props();

  /* 사진 위 한 줄: 테마마다 같은 날짜를 그 세계의 말투로 */
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const EN_DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const EN_MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const KO_DAY = "일월화수목금토";
  const longEn = `${EN_DAY[wd]}, ${d} ${EN_MON[m - 1]} ${y}`;
  const unixDate = `${EN_DAY[wd].slice(0, 3)} ${EN_MON[m - 1].slice(0, 3)} ${String(d).padStart(2, " ")} ${time}:00 KST ${y}`;
  const shortKo = `${m}월 ${d}일 ${KO_DAY[wd]}요일`;

  const DASH = 260;
  let armed = $state(false);
  let scrollY = $state(0);

  const settle = new Tween(0, { duration: 2400, easing: cubicOut });
  const ink = new Tween(0, { duration: 2300, easing: cubicInOut });
  const fill = new Tween(0, { duration: 1000, easing: cubicOut });

  onMount(() => {
    if (reduced()) return;
    armed = true;
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
    return () => removeEventListener("scroll", onScroll);
  });

  let played = false;
  $effect(() => {
    if (!armed || !stage.open || played) return;
    played = true;
    settle.target = 1;
    ink.set(1, { delay: 400 }).then(() => (fill.target = 1));
  });

  const parY = $derived(armed ? Math.min(scrollY, 900) * 0.06 : 0);
  const scale = $derived(armed ? 1.08 - settle.current * 0.06 : 1.02);
</script>

<header class="cover" style:--focus={focus}>
  <p class="kicker">
    <span data-th="halloween">{longEn}</span>
    <span data-th="dev" class="cmd"><b>$</b> date<br />{unixDate}</span>
    <span data-th="puppy">{shortKo}</span>
  </p>

  <div class="hero">
    <div class="frame">
      {#if hasPhoto}
        <div class="photo" style:transform="translate3d(0, {parY}px, 0) scale({scale})">{@render photo?.()}</div>
      {:else}
        <div class="placeholder" role="img" aria-label="사진이 들어갈 자리">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.6" />
          </svg>
          <span>사진 자리</span>
        </div>
      {/if}
      <div class="arch-line" data-th="halloween"></div>
    </div>
    <div class="pups" data-th="puppy" aria-hidden="true"><Dogs /></div>
  </div>

  <h1 class="names" class:inked={armed}>
    <svg class="graph" data-th="dev" viewBox="0 0 40 150" aria-hidden="true" focusable="false">
      <path d="M14 0V150" stroke="var(--gold)" stroke-width="2.5" fill="none" />
      <path d="M30 0V58C30 80 14 84 14 106" stroke="var(--pumpkin)" stroke-width="2.5" fill="none" />
      <circle cx="14" cy="22" r="6" fill="var(--bg)" stroke="var(--gold)" stroke-width="2.5" />
      <circle cx="30" cy="62" r="6" fill="var(--bg)" stroke="var(--pumpkin)" stroke-width="2.5" />
      <circle cx="14" cy="112" r="8" fill="var(--ivory)" />
    </svg>
    <span class="names-text"><span class="l1"><span class="g">{groom}</span><span class="dot">·</span><span class="b">{bride}</span></span> <span class="l2">결혼합니다</span></span>
    {#if armed}
      <svg class="ink" viewBox="0 0 300 84" aria-hidden="true" focusable="false" style:--dash={DASH} style:--off={(1 - ink.current) * DASH} style:--fill={fill.current}>
        <text x="150" y="36" text-anchor="middle" class="t1">{groom}<tspan class="a" dx="12">·</tspan><tspan dx="12">{bride}</tspan></text>
        <text x="150" y="74" text-anchor="middle" class="t2">결혼합니다</text>
      </svg>
    {/if}
  </h1>

  <p class="when">{dateKo}</p>
  <p class="where">{venue}</p>
</header>

<style>
  .cover { position: relative; text-align: center; padding: 28px 0 56px; }
  .kicker { margin: 0 24px 16px; color: var(--ivory-dim); }
  .kicker [data-th="halloween"] { font: italic 18px/1.4 var(--latin); letter-spacing: 0.01em; }
  .kicker [data-th="puppy"] { font: 20px/1.4 var(--display); color: var(--ivory); }
  .cmd { display: block; text-align: left; font: 13px/1.7 var(--latin); color: var(--ivory-dim); white-space: pre; }
  .cmd b { color: var(--gold); font-weight: 600; }

  .hero { position: relative; padding: 0 var(--hero-inset); }
  .frame {
    position: relative; width: 100%; aspect-ratio: 4 / 5; max-height: calc(100svh - 230px); min-height: 360px;
    overflow: hidden; background: var(--panel-a); border-radius: var(--hero-r); box-shadow: var(--hero-line);
  }
  .photo { position: absolute; inset: 0; will-change: transform; }
  .photo :global(img) { width: 100%; height: 100%; object-fit: cover; object-position: var(--focus); display: block; }
  .placeholder {
    position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 6px;
    background: linear-gradient(170deg, var(--panel-a), var(--panel-b)); color: var(--ivory-dim); font-size: 14px;
  }
  .placeholder svg { opacity: 0.7; }
  .arch-line { position: absolute; inset: 12px; border: 1px solid rgb(var(--gold-rgb) / 0.7); border-radius: var(--hero-r); pointer-events: none; }
  .pups { position: absolute; right: 2px; bottom: -46px; width: 156px; pointer-events: none; filter: drop-shadow(0 4px 6px rgb(var(--shade-rgb) / 0.18)); }
  .pups :global(svg) { width: 100%; height: auto; display: block; }

  .names { width: 300px; height: 88px; margin: 36px auto 0; position: relative; font-family: var(--hand); font-weight: 400; color: var(--ivory); }
  .names-text { display: block; }
  .l1 { display: block; white-space: nowrap; height: 46px; line-height: 46px; font-size: 34px; letter-spacing: 0.04em; }
  .l2 { display: block; height: 38px; line-height: 38px; font-size: 20px; letter-spacing: 0.3em; color: var(--ivory-dim); }
  .dot { color: var(--pumpkin); margin: 0 0.35em; }
  .names.inked .names-text, .names.inked .names-text * { color: transparent; }
  .ink { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .ink text {
    font-family: var(--hand); font-weight: 400; white-space: pre;
    fill: var(--ivory); fill-opacity: var(--fill); stroke: var(--gold); stroke-width: 0.7; stroke-linejoin: round;
    stroke-dasharray: var(--dash); stroke-dashoffset: var(--off);
  }
  .ink .t1 { font-size: 34px; letter-spacing: 0.04em; }
  .ink .t2 { font-size: 20px; letter-spacing: 0.3em; fill: var(--ivory-dim); stroke: none; }
  .ink .a { fill: var(--pumpkin); stroke: var(--pumpkin); }
  .graph { display: none; }

  .when { margin-top: 20px; font-size: 16px; }
  .where { color: var(--ivory-dim); font-size: 15px; }
  :global([data-theme="puppy"]) .names { margin-top: 64px; }

  /* dev: 이름이 곧 브랜치. 두 커밋이 '결혼합니다'에서 병합된다 */
  :global([data-theme="dev"]) .cover { text-align: left; padding-top: 20px; }
  :global([data-theme="dev"]) .kicker { margin: 0 20px 14px; }
  :global([data-theme="dev"]) .names { width: auto; height: auto; margin: 28px 20px 0; padding-left: 52px; font-weight: 600; }
  :global([data-theme="dev"]) .ink { display: none; }
  :global([data-theme="dev"]) .names.inked .names-text, :global([data-theme="dev"]) .names.inked .names-text * { color: inherit; }
  :global([data-theme="dev"]) .graph { display: block; position: absolute; left: 0; top: 0; width: 40px; height: 150px; }
  :global([data-theme="dev"]) .l1 { display: contents; }
  :global([data-theme="dev"]) .g, :global([data-theme="dev"]) .b, :global([data-theme="dev"]) .l2 { display: block; height: 40px; line-height: 40px; font-size: 26px; letter-spacing: 0; }
  :global([data-theme="dev"]) .g { margin-top: 2px; }
  :global([data-theme="dev"]) .l2 { margin-top: 10px; font-size: 18px; color: var(--ivory-dim); }
  :global([data-theme="dev"]) .dot { display: none; }
  :global([data-theme="dev"]) .when, :global([data-theme="dev"]) .where { margin-left: 72px; margin-right: 20px; }
</style>
