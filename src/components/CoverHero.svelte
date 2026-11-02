<script lang="ts">
  import type { Snippet } from "svelte";
  import HalloweenCoverArt from "./art/halloween/CoverArt.svelte";
  import PuppyCoverArt from "./art/puppy/CoverArt.svelte";

  let {
    groom,
    bride,
    date,
    dateKo,
    time,
    venue,
    focus,
    hasPhoto,
    photo,
  }: { groom: string; bride: string; date: string; dateKo: string; time: string; venue: string; focus: string; hasPhoto: boolean; photo?: Snippet } = $props();

  const [y, m, d] = date.split("-").map(Number);
  const [H, MIN] = time.split(":").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const EN_DAY = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const EN_MON = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const ord = (n: number) => (n % 10 === 1 && n !== 11 ? "ST" : n % 10 === 2 && n !== 12 ? "ND" : n % 10 === 3 && n !== 13 ? "RD" : "TH");
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${H % 12 || 12}:${pad(MIN)} ${H < 12 ? "AM" : "PM"}`;
  const mono = `${date} ${pad(H)}:${pad(MIN)} KST`;
  const iso = `${date}T${pad(H)}:${pad(MIN)}+09:00`;
  const uid = $props.id();
  const arch = (i: number) => `M${i} 440V${190 + i * 0.3}C${i} ${105 + i * 0.7} ${84 + i * 0.6} ${36 + i * 1.4} 168 ${i * 2.4}C${252 - i * 0.6} ${36 + i * 1.4} ${336 - i} ${105 + i * 0.7} ${336 - i} ${190 + i * 0.3}V440`;

</script>

{#snippet info()}
  <div class="stack" data-th="halloween puppy">
    <p class="en" data-rv="lines" style="--d:700ms">
      <span>{EN_DAY[wd]}</span>
      <span>{EN_MON[m - 1]} {d}<sup>{ord(d)}</sup></span>
      <span>{clock}</span>
    </p>
    <i class="hair" data-rv="draw" data-axis="y" aria-hidden="true" style="--d:1000ms"></i>
    <p class="names" aria-hidden="true"><span data-rv="letters" style="--d:1150ms">{groom}</span><span data-rv="letters" style="--d:1150ms">{bride}</span></p>
    <p class="venue" data-rv="fade" style="--d:1500ms">{venue}<svg class="paw" data-th="puppy" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><ellipse cx="12" cy="16" rx="5" ry="4" /><circle cx="5.500" cy="10" r="2" /><circle cx="10" cy="5.500" r="2" /><circle cx="14" cy="5.500" r="2" /><circle cx="18.500" cy="10" r="2" /></svg></p>
  </div>
{/snippet}

<header class="cover" data-reveal style:--focus={focus} style:--clip="url(#lancet-{uid})">
  <h1 class="sr">{groom} & {bride} 결혼합니다</h1>

  <div class="wm" data-th="halloween" data-rv="lines" data-par="-0.08" aria-hidden="true"><span>ALL</span><span>HALLOWS'</span><span>EVE</span></div>
  <div class="art" data-th="halloween"><HalloweenCoverArt /></div>
  <p class="mark" data-th="puppy" data-rv="letters" aria-hidden="true">TWO OF US</p>
  <div class="cover-dogs" data-th="puppy" data-rv="rise" data-par="0.06" aria-hidden="true" style="--d:400ms"><PuppyCoverArt /></div>
  <p class="kicker" data-th="dev" data-rv="type" aria-hidden="true">$ git log --graph</p>

  {#if !hasPhoto}
    <div class="codewin" data-th="dev" aria-hidden="true">
      <div class="cw-bar"><i></i><i></i><i></i><span>wedding.diff</span></div>
      <div class="cw-body">
        <p><span data-rv="type" style="--d:600ms">groom: {groom}</span></p>
        <p><span data-rv="type" style="--d:820ms">bride: {bride}</span></p>
        <p><span data-rv="type" style="--d:1040ms">date: {iso}</span></p>
        <p><span data-rv="type" style="--d:1260ms">venue: {venue}</span></p>
      </div>
    </div>
  {/if}

  <div class="hero" data-th={hasPhoto ? undefined : "halloween puppy"}>
    <svg class="defs" data-th="halloween" width="0" height="0" aria-hidden="true" focusable="false">
      <clipPath id="lancet-{uid}" clipPathUnits="objectBoundingBox"><path d="M0 1V.432C0 .238 .25 .082 .5 0C.75 .082 1 .238 1 .432V1Z" /></clipPath>
    </svg>
    <span class="flame" data-th="halloween" data-rv="fade" aria-hidden="true" style="--d:1300ms">
      <svg viewBox="0 0 12 22" width="12" height="22" focusable="false"><path d="M6 1C9 6 11 10 11 14a5 5 0 0 1-10 0C1 10 4 8 6 1Z" fill="#e0904a" /><path d="M6 9c2 3 3 5 3 7a3 3 0 0 1-6 0c0-2 2-3 3-7Z" fill="#f6d79a" /></svg>
    </span>
    <div class="frame" data-rv="curtain">
      {#if hasPhoto}
        {@render photo?.()}
      {:else}
        <div class="ph" aria-hidden="true">
          <span class="mg"><span data-rv="count">{pad(m)}</span>.<span data-rv="count">{pad(d)}</span></span>
          <span class="mono-y">{y}</span>
        </div>
      {/if}
    </div>
    <svg class="rules" data-th="halloween" viewBox="0 0 336 440" aria-hidden="true" focusable="false">
      <path d={arch(10)} fill="none" stroke="var(--accent)" stroke-width="1" data-rv="draw" style="--d:500ms" />
      <path d={arch(14)} fill="none" stroke="var(--accent)" stroke-width="0.6" opacity="0.55" data-rv="draw" style="--d:700ms" />
    </svg>
  </div>

  {@render info()}

  <div class="gl fx-dev" data-th="dev">
    <svg class="gl-svg" viewBox="0 0 60 140" aria-hidden="true" focusable="false">
      <defs>
        <filter id="neon-{uid}" filterUnits="userSpaceOnUse" x="-10" y="-10" width="80" height="160"><feGaussianBlur stdDeviation="2.5" /></filter>
      </defs>
      <g class="br br-g">
        <path class="halo" d="M14 20V88C14 112 28 106 28 124" pathLength="1" filter="url(#neon-{uid})" />
        <path class="tube" d="M14 20V88C14 112 28 106 28 124" pathLength="1" />
        <path class="core" d="M14 20V88C14 112 28 106 28 124" pathLength="1" />
      </g>
      <g class="br br-b">
        <path class="halo" d="M42 72V88C42 112 28 106 28 124" pathLength="1" filter="url(#neon-{uid})" />
        <path class="tube" d="M42 72V88C42 112 28 106 28 124" pathLength="1" />
        <path class="core" d="M42 72V88C42 112 28 106 28 124" pathLength="1" />
      </g>
      <g class="nd nd-g">
        <circle class="halo" cx="14" cy="20" r="5.500" filter="url(#neon-{uid})" />
        <circle class="tube" cx="14" cy="20" r="5.500" />
      </g>
      <g class="nd nd-b">
        <circle class="halo" cx="42" cy="72" r="5.500" filter="url(#neon-{uid})" />
        <circle class="tube" cx="42" cy="72" r="5.500" />
      </g>
      <g class="nd nd-m">
        <circle class="halo" cx="28" cy="124" r="7.500" filter="url(#neon-{uid})" />
        <circle class="pulse" cx="28" cy="124" r="7.500" filter="url(#neon-{uid})" />
        <circle class="tube" cx="28" cy="124" r="7.500" />
        <circle class="dot" cx="28" cy="124" r="3.500" />
      </g>
    </svg>
    <div class="gl-sig" aria-hidden="true"><i class="sig sig-g"></i><i class="sig sig-b"></i></div>
    <span class="gl-row r1" aria-hidden="true">{groom}</span>
    <span class="gl-row r2" aria-hidden="true">{bride}</span>
    <span class="gl-row r3" aria-hidden="true">결혼합니다 <em>wedding</em></span>
  </div>
  <div class="gl-meta" data-th="dev"><p class="mono">{mono}</p><p class="when">{dateKo}</p><p class="venue">{venue}</p><i class="trunk" aria-hidden="true"></i></div>
</header>

<style>
  .cover { position: relative; overflow: hidden; overflow-x: clip; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 56px 0 72px; color: var(--ink); }
  .cover > * { max-width: 100%; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .defs { position: absolute; }

  .wm, .mark, .kicker { order: 1; }
  .cover-dogs { order: 2; }
  .hero { order: 3; }
  .stack, .gl { order: 4; }
  .gl-meta { order: 5; }

  .hero { position: relative; }
  .frame { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--surface); }
  .frame :global(img) { width: 100%; height: 100%; object-fit: cover; object-position: var(--focus); display: block; }
  .frame { --d: 300ms; }
  :global([data-theme="puppy"]) .frame { --d: 600ms; }
  .ph { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 12px; background: linear-gradient(rgb(var(--accent-rgb) / 0.05), rgb(var(--accent-rgb) / 0.05)), var(--surface); }
  .mg { font: 300 64px/1 var(--f-latin); letter-spacing: 0.02em; color: rgb(var(--accent-rgb) / 0.55); white-space: nowrap; }
  .mono-y { font: 400 13px/1 var(--f-latin); letter-spacing: 0.3em; margin-right: -0.3em; color: var(--ink-3); font-variant-numeric: lining-nums tabular-nums; }

  .stack { position: relative; display: flex; flex-direction: column; align-items: center; padding-top: 44px; }
  .en { font: 400 15px/1.7 var(--f-latin); letter-spacing: 0.14em; color: var(--ink); }
  .en span { display: block; }
  .en sup { font-size: 0.62em; letter-spacing: 0.06em; margin-left: 0.15em; vertical-align: 0.55em; line-height: 0; }
  .hair { display: block; width: 1px; height: 64px; margin: 24px 0; background: var(--ink-3, var(--line)); }
  .names { font: 700 20px/28px var(--f-name); letter-spacing: 0.6em; color: var(--ink); }
  .names span { display: block; margin-right: -0.6em; }
  .venue { margin-top: 28px; font: 400 12.5px/1.5 var(--f-body); color: var(--ink-3); }
  .paw { fill: none; stroke: var(--accent); stroke-width: 1.2; margin-left: 8px; vertical-align: -1px; }

  :global([data-theme="halloween"]) .wm { align-self: stretch; padding: 0 28px; text-align: left; white-space: nowrap; color: var(--wordmark, var(--line)); pointer-events: none; user-select: none; }
  .wm { --st-ln: 140ms; }
  .wm span { display: block; font: 400 min(92px, calc((100vw - 56px) / 4.6)) / 0.88 var(--f-latin); letter-spacing: 0.01em; }
  :global([data-theme="halloween"]) .hero { width: min(300px, calc(100% - 64px)); margin-top: -72px; aspect-ratio: 336 / 440; }
  :global([data-theme="halloween"]) .frame { clip-path: var(--clip); }
  .rules { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .flame { position: absolute; left: 50%; top: -32px; width: 12px; height: 22px; margin-left: -6px; pointer-events: none; }
  .flame svg { display: block; transform-origin: 50% 100%; animation: flick 3s linear infinite; }
  @keyframes flick { 0% { opacity: 0.95; transform: scaleY(1) } 11% { opacity: 0.85; transform: scaleY(0.94) } 23% { opacity: 1; transform: scaleY(1.04) } 37% { opacity: 0.88; transform: scaleY(0.96) rotate(-2deg) } 52% { opacity: 1; transform: scaleY(1.02) } 64% { opacity: 0.86; transform: scaleY(0.93) rotate(2deg) } 81% { opacity: 0.98; transform: scaleY(1.03) } 100% { opacity: 0.95; transform: scaleY(1) } }

  .mark { font: 400 36px/1.3 var(--f-latin); letter-spacing: 0.24em; margin-right: -0.24em; color: var(--ink); }
  .cover-dogs { width: 220px; margin: 16px auto 0; }
  .cover-dogs :global(svg) { display: block; width: 100%; height: auto; }
  :global([data-theme="puppy"]) .hero { width: 80%; margin-top: 40px; aspect-ratio: 4 / 5; }
  :global([data-theme="puppy"]) .frame { border-radius: 999px 999px 0 0; }
  :global([data-theme="puppy"]) .hero::after { content: ""; position: absolute; inset: auto 0 0; height: 40%; background: linear-gradient(to bottom, transparent, var(--bg)); pointer-events: none; }

  :global([data-theme="dev"]) .cover { align-items: stretch; text-align: left; padding: 40px 24px 0 calc(var(--rail-x, 28px) + 32px); }
  .kicker { margin-bottom: 14px; font: 400 12.5px/1.5 var(--f-mono); color: var(--ink-2); }
  :global([data-theme="dev"]) .hero { width: 100%; max-width: 360px; aspect-ratio: 4 / 5; }
  :global([data-theme="dev"]) .frame { border-radius: 6px; border: 1px solid var(--line); }
  .codewin { order: 3; width: 100%; max-width: 360px; margin-bottom: 8px; border: 1px solid var(--line); border-radius: 8px; overflow: clip; background: var(--surface); }
  .cw-bar { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-bottom: 1px solid var(--line); }
  .cw-bar i { width: 7px; height: 7px; border-radius: 50%; background: #d9d9d4; }
  .cw-bar span { margin-left: 8px; font: 400 12px/1 var(--f-mono); color: var(--ink-3); }
  .cw-body { padding: 10px 14px 12px; font: 400 13px/1.9 var(--f-mono); color: var(--ink); }
  .cw-body p { position: relative; padding-left: 1.4em; white-space: normal; }
  .cw-body p::before { content: "+"; position: absolute; left: 0; color: var(--accent-text); }
  .gl { position: relative; flex: none; height: 140px; margin: 16px 0 0 calc(-1 * (var(--rail-x, 28px) + 32px)); max-width: none; }
  .gl-svg { position: absolute; top: 0; left: calc(var(--rail-x, 28px) - 28px); width: 60px; height: 140px; }
  .gl-row { position: absolute; left: calc(var(--rail-x, 28px) + 32px); transform: translateY(-50%); font: 600 26px/1.3 var(--f-body); white-space: nowrap; color: var(--ink); }
  .r1 { top: 20px; } .r2 { top: 72px; } .r3 { top: 124px; font-size: 18px; }
  .gl-row em { font: 500 12px/1 var(--f-mono); font-style: normal; color: var(--accent-text); border: 1px solid var(--accent); border-radius: 999px; padding: 2px 8px; margin-left: 6px; vertical-align: 2px; }
  .gl-meta { position: relative; padding: 8px 0 24px; }
  .mono { font: 400 13px/1.7 var(--f-mono); letter-spacing: 0.02em; color: var(--ink-2); }
  .when { font: 400 15px/1.7 var(--f-body); color: var(--ink); }
  .gl-meta .venue { margin-top: 2px; }
  .trunk { position: absolute; left: calc(-1 * (var(--rail-x, 28px) + 32px) + var(--rail-x, 28px)); top: -16px; bottom: 0; width: 2px; margin-left: -1px; background: var(--ink); }

  @media (prefers-reduced-motion: reduce) { .flame svg { animation: none; } }
</style>
