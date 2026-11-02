<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { Tween } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
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

  const uid = $props.id();
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const EN_DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const EN_MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const KO_DAY = "일월화수목금토";
  const ord = (n: number) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
  const longEn = `${EN_DAY[wd]}, the ${ord(d)} of ${EN_MON[m - 1]} ${y}`;
  const longKo = `${y}년 ${m}월 ${d}일 ${KO_DAY[wd]}요일`;
  void time;

  /* 첨두 아치: 안쪽 괘선 경로(336x440 기준, i=안쪽 간격) */
  const arch = (i: number) => `M${i} 440V${190 + i * 0.3}C${i} ${105 + i * 0.7} ${84 + i * 0.6} ${36 + i * 1.4} 168 ${i * 2.4}C${252 - i * 0.6} ${36 + i * 1.4} ${336 - i} ${105 + i * 0.7} ${336 - i} ${190 + i * 0.3}V440`;

  let armed = $state(false);
  let scrollY = $state(0);
  const settle = new Tween(0, { duration: 2400, easing: cubicOut });

  onMount(() => {
    if (reduced() || !hasPhoto) return;
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
  });

  const parY = $derived(armed ? Math.min(scrollY, 900) * 0.05 : 0);
  const scale = $derived(armed ? 1.06 - settle.current * 0.04 : 1.02);
</script>

<header class="cover" style:--focus={focus} style:--clip="url(#lancet-{uid})">
  <p class="kicker">
    <span data-th="halloween" class="k-hal">{longEn}</span>
    <span data-th="dev" class="k-dev">$ git log --graph</span>
    <span data-th="puppy" class="k-pup">{longKo}</span>
  </p>

  <div class="hero">
    <svg data-th="halloween" class="defs" width="0" height="0" aria-hidden="true" focusable="false">
      <clipPath id="lancet-{uid}" clipPathUnits="objectBoundingBox"><path d="M0 1V.432C0 .238 .25 .082 .5 0C.75 .082 1 .238 1 .432V1Z" /></clipPath>
    </svg>
    <span data-th="halloween" class="flame" aria-hidden="true">
      <svg viewBox="0 0 12 22" width="12" height="22" focusable="false"><path d="M6 1C9 6 11 10 11 14a5 5 0 0 1-10 0C1 10 4 8 6 1Z" fill="#e0904a" /><path d="M6 9c2 3 3 5 3 7a3 3 0 0 1-6 0c0-2 2-3 3-7Z" fill="#f6d79a" /></svg>
    </span>

    <div class="frame">
      {#if hasPhoto}
        <div class="photo" style:transform="translate3d(0, {parY}px, 0) scale({scale})">{@render photo?.()}</div>
      {:else}
        <div class="ph" role="img" aria-label="사진이 들어갈 자리">
          <span data-th="halloween" class="ph-hal"><b>{groom[0]}</b><i>&amp;</i><b>{bride[0]}</b></span>
          <span data-th="dev" class="ph-dev"><span>cover.jpg</span><span>1600 × 2000</span></span>
          <svg data-th="puppy" class="ph-pup" viewBox="0 0 360 450" preserveAspectRatio="xMidYMid slice" focusable="false">
            <rect width="360" height="450" fill="#dcebf5" />
            <g fill="none" stroke="#fff" stroke-width="1.500" stroke-linecap="round">
              <path d="M40 90q10-14 26-6 8-12 24-4 14-2 16 10H40z" />
              <path d="M230 60q9-12 22-5 8-10 22-3 12 0 14 8h-58z" />
              <path d="M150 150q8-10 20-4 7-8 19-2 11 0 12 6h-51z" />
            </g>
            <path d="M0 360C70 320 140 330 200 350s110-30 160-20V450H0z" fill="#cfe5c8" />
          </svg>
        </div>
      {/if}
    </div>
    <svg data-th="halloween" class="rules" viewBox="0 0 336 440" aria-hidden="true" focusable="false">
      <path d={arch(10)} fill="none" stroke="var(--line-strong, var(--gold))" stroke-width="1" />
      <path d={arch(14)} fill="none" stroke="var(--line-strong, var(--gold))" stroke-width="0.6" opacity="0.6" />
    </svg>
  </div>

  <div class="pups" data-th="puppy" aria-hidden="true">
    <svg class="grass" viewBox="0 0 400 40" preserveAspectRatio="none" focusable="false"><path d="M0 40V20C60 6 120 4 200 12S340 8 400 16V40Z" fill="#cfe5c8" /><path d="M0 20C60 6 120 4 200 12S340 8 400 16" fill="none" stroke="#b9d6b0" stroke-width="1" /></svg>
    <Dogs />
  </div>

  <div class="gl" data-th="dev">
    <div class="gl-g">
    <svg class="gl-svg" viewBox="0 0 60 140" aria-hidden="true" focusable="false">
      <path d="M14 20V88C14 112 28 106 28 124" fill="none" stroke="var(--groom)" stroke-width="2" />
      <path d="M42 72V88C42 112 28 106 28 124" fill="none" stroke="var(--bride)" stroke-width="2" />
      <circle cx="14" cy="20" r="5.500" fill="var(--bg)" stroke="var(--groom)" stroke-width="2" />
      <circle cx="42" cy="72" r="5.500" fill="var(--bg)" stroke="var(--bride)" stroke-width="2" />
      <circle cx="28" cy="124" r="7.500" fill="var(--ink)" stroke="var(--bg)" stroke-width="2" />
    </svg>
    <span class="gl-row r1">{groom}</span>
    <span class="gl-row r2">{bride}</span>
    <span class="gl-row r3">결혼합니다 <em>wedding</em></span>
    </div>
    <div class="gl-meta"><p class="when">{dateKo}</p><p class="where">{venue}</p></div>
    <i class="trunk"></i>
  </div>

  <h1 class="names">
    <span data-th="halloween" class="n-hal"><span>{groom}</span><i>&amp;</i><span>{bride}</span></span>
    <span data-th="puppy" class="n-pup">{groom} 그리고 {bride}</span>
  </h1>
  <p class="wed" data-th="puppy">결혼합니다</p>
  <p class="rule" data-th="halloween" aria-hidden="true"><i></i><b></b><i></i></p>

  <p class="when">{dateKo}</p>
  <p class="where">{venue}</p>
</header>

<style>
  .cover { position: relative; text-align: center; padding: 28px 0 64px; }
  .kicker { margin: 0 24px 16px; color: var(--ink-2, var(--ivory-dim)); }
  .k-hal { font: italic 17px/1.4 var(--f-latin); }
  .k-dev { font: 12px/1.5 var(--f-mono); }
  .k-pup { font: 18px/1.4 var(--f-display); color: var(--ink); }
  .defs { position: absolute; }

  .hero { position: relative; margin: 0 auto; }
  .frame { position: relative; width: 100%; overflow: hidden; background: var(--surface); }
  .photo { position: absolute; inset: 0; will-change: transform; }
  .photo :global(img) { width: 100%; height: 100%; object-fit: cover; object-position: var(--focus); display: block; }
  .ph { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; color: var(--ink-2); }

  :global([data-theme="halloween"]) .hero { width: min(336px, calc(100% - 48px)); margin-top: 44px; aspect-ratio: 336 / 440; }
  :global([data-theme="halloween"]) .frame { position: absolute; inset: 0; clip-path: var(--clip); }
  .ph-hal { font: 64px/1 var(--f-display); color: var(--ink); display: flex; gap: 6px; align-items: baseline; }
  .ph-hal i { font: italic 40px/1 var(--f-latin); color: var(--accent); }
  .ph-hal b { font-weight: 400; }
  :global([data-theme="halloween"]) .ph { background: repeating-linear-gradient(45deg, rgb(var(--gold-rgb) / 0.12) 0 1px, transparent 1px 7px), var(--surface); }
  .rules { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .flame { position: absolute; left: 50%; top: -30px; width: 12px; height: 22px; margin-left: -6px; transform-origin: 50% 100%; animation: flick 3s linear infinite; pointer-events: none; }
  @keyframes flick { 0% { opacity: 0.95; transform: scaleY(1) } 11% { opacity: 0.85; transform: scaleY(0.94) } 23% { opacity: 1; transform: scaleY(1.04) } 37% { opacity: 0.88; transform: scaleY(0.96) rotate(-2deg) } 52% { opacity: 1; transform: scaleY(1.02) } 64% { opacity: 0.86; transform: scaleY(0.93) rotate(2deg) } 81% { opacity: 0.98; transform: scaleY(1.03) } 100% { opacity: 0.95; transform: scaleY(1) } }

  :global([data-theme="dev"]) .cover { text-align: left; padding-left: calc(var(--rail-x, 28px) + 32px); padding-right: 24px; padding-bottom: 0; }
  :global([data-theme="dev"]) .kicker { margin: 0 0 12px; }
  :global([data-theme="dev"]) .hero { width: 100%; max-width: 360px; aspect-ratio: 4 / 5; }
  :global([data-theme="dev"]) .frame { position: absolute; inset: 0; border-radius: 6px; border: 1px solid var(--line); }
  :global([data-theme="dev"]) .ph { background: radial-gradient(circle, var(--line) 1px, transparent 1.500px) 0 0 / 8px 8px, var(--surface); gap: 2px; }
  .ph-dev { display: grid; gap: 2px; font: 13px/1.5 var(--f-mono); text-align: center; }

  .gl { position: relative; margin: 16px 0 0 calc(-1 * (var(--rail-x, 28px) + 32px)); padding-left: calc(var(--rail-x, 28px) + 32px); }
  .gl-g { position: relative; height: 140px; margin-left: calc(-1 * (var(--rail-x, 28px) + 32px)); }
  .gl-meta { padding-bottom: 64px; }
  .gl-svg { position: absolute; top: 0; left: calc(var(--rail-x, 28px) - 28px); width: 60px; height: 140px; }
  .gl-row { position: absolute; left: calc(var(--rail-x, 28px) + 32px); transform: translateY(-50%); font: 600 26px/1.3 var(--f-body); white-space: nowrap; color: var(--ink); }
  .r1 { top: 20px; } .r2 { top: 72px; } .r3 { top: 124px; font-size: 18px; }
  .gl-row em { font: 500 12px/1 var(--f-mono); font-style: normal; color: var(--groom); border: 1px solid var(--groom); border-radius: 999px; padding: 2px 8px; margin-left: 6px; vertical-align: 2px; }
  .trunk { position: absolute; left: var(--rail-x, 28px); top: 124px; bottom: 0; width: 2px; margin-left: -1px; background: var(--ink); }
  :global([data-theme="dev"]) .names { display: none; }
  :global([data-theme="dev"]) .cover > .when, :global([data-theme="dev"]) .cover > .where { display: none; }

  :global([data-theme="puppy"]) .hero { width: min(360px, calc(100% - 48px)); aspect-ratio: 4 / 5; }
  :global([data-theme="puppy"]) .frame { position: absolute; inset: 0; border-radius: 28px; border: 6px solid #fff; box-shadow: 0 10px 30px rgb(38 50 74 / 0.12); background: #dcebf5; }
  .ph-pup { position: absolute; inset: 0; width: 100%; height: 100%; }
  .pups { position: relative; width: 100%; margin: -24px 0 0; height: 150px; pointer-events: none; }
  .pups :global(.orn-dogs) { position: relative; display: block; width: 200px; height: auto; margin: 0 auto; z-index: 1; }
  .grass { position: absolute; left: 0; right: 0; bottom: -16px; width: 100%; height: 56px; mask-image: linear-gradient(#000 55%, transparent); }

  .names { margin: 28px 24px 0; font: 400 34px/1.25 var(--f-display); letter-spacing: 0.02em; color: var(--ink); }
  .n-hal { display: flex; flex-direction: column; align-items: center; }
  .n-hal i { font: italic 28px/1.3 var(--f-latin); color: var(--accent); }
  .n-pup { font: 30px/1.3 var(--f-display); display: block; margin-top: 12px; }
  :global([data-theme="puppy"]) .names { margin-top: 28px; }
  .wed { margin-top: 4px; font-size: 17px; color: var(--ink-2); }
  .rule { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 24px; color: var(--line-strong, var(--gold)); }
  .rule i { width: 52px; height: 1px; background: currentColor; }
  .rule b { width: 6px; height: 6px; border: 1px solid currentColor; transform: rotate(45deg); }

  .when { margin-top: 20px; font-size: 16px; }
  .where { color: var(--ink-2); font-size: 15px; }

  @media (prefers-reduced-motion: reduce) { .flame { animation: none; } }
</style>
