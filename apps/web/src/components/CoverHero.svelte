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
  const arch = (i: number) => `M${i} 440V${158 + i * 0.3}C${i} ${84 + i * 0.7} ${91 + i * 0.6} ${20 + i * 1.4} 168 ${i * 2.4}C${245 - i * 0.6} ${20 + i * 1.4} ${336 - i} ${84 + i * 0.7} ${336 - i} ${158 + i * 0.3}V440`;

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

  <div class="wm" data-th="halloween" data-rv="lines" data-par="-0.08" aria-hidden="true"><span>All Hallows’ Eve</span></div>
  <p class="mark" data-th="puppy" data-rv="letters" aria-hidden="true">TWO OF US</p>
  <div class="cover-dogs" data-th="puppy" data-rv="rise" data-par="0.06" aria-hidden="true" style="--d:400ms"><PuppyCoverArt /></div>
  <p class="kicker" data-th="dev" data-rv="type" aria-hidden="true">$ git log --graph</p>

  {#if !hasPhoto}
    <div class="pr" data-th="dev" aria-hidden="true">
      <div class="pr-h"><span class="pr-k" data-rv="fade" style="--d:300ms">pull request #1</span><span class="pr-st" data-rv="fade" style="--d:400ms">Open</span></div>
      <p class="pr-t" data-rv="fade" style="--d:420ms">{groom} & {bride} 결혼합니다</p>
      <p class="pr-br" data-rv="fade" style="--d:520ms"><code>wedding</code><i>→</i><code>main</code></p>
      <dl class="pr-m" data-rv="fade" style="--d:620ms">
        <div><dt>reviewers</dt><dd><span class="av">{groom.charAt(0)}</span><span class="av">{bride.charAt(0)}</span>{groom}, {bride}</dd></div>
        <div><dt>checks</dt><dd>2 / 2 approved</dd></div>
      </dl>
      <p class="pr-f" data-rv="fade" style="--d:720ms"><svg viewBox="0 0 16 16" width="14" height="14" focusable="false"><path d="M3 8.500l3.200 3.200L13 4.800" fill="none" stroke="currentColor" stroke-width="1.600" stroke-linecap="round" stroke-linejoin="round" /></svg>Ready to merge</p>
    </div>
  {/if}

  <div class="hero">
    <svg class="defs" data-th="halloween" width="0" height="0" aria-hidden="true" focusable="false">
      <clipPath id="lancet-{uid}" clipPathUnits="objectBoundingBox"><path d="M0 1V.36C0 .19 .27 .045 .5 0C.73 .045 1 .19 1 .36V1Z" /></clipPath>
    </svg>
    <button type="button" class="flame" data-th="halloween" data-rv="fade" data-candle aria-label="촛불 끄기" aria-pressed="false" style="--d:1300ms">
      <span class="halo" aria-hidden="true"></span>
      <svg class="fl" viewBox="0 0 16 30" width="18" height="34" aria-hidden="true" focusable="false">
        <path class="fl-o" d="M8 0C11 7 15 12 15 19.500a7 7 0 0 1-14 0C1 13 5 9.500 8 0Z" fill="#e0783a" />
        <path class="fl-m" d="M8 7c2.200 4.200 4.600 7.400 4.600 12a4.600 4.600 0 0 1-9.200 0c0-3.800 2.500-6.300 4.600-12Z" fill="#f2a654" />
        <path class="fl-i" d="M8 14c1.300 2.400 2.600 4.200 2.600 6.300a2.600 2.600 0 0 1-5.200 0c0-2 1.400-3.600 2.600-6.300Z" fill="#fff1c9" />
        <ellipse cx="8" cy="25.500" rx="2" ry="1.300" fill="#7fa6d8" opacity="0.75" />
      </svg>
      <svg class="stick" viewBox="0 0 32 46" width="32" height="46" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="wax-{uid}" x1="0" x2="1"><stop offset="0" stop-color="#fff8ea" /><stop offset=".55" stop-color="#f0e0c0" /><stop offset="1" stop-color="#c9b089" /></linearGradient>
          <linearGradient id="iron-{uid}" x1="0" x2="1"><stop offset="0" stop-color="#4a3628" /><stop offset=".5" stop-color="#2a1d16" /><stop offset="1" stop-color="#1a120d" /></linearGradient>
        </defs>
        <path d="M16 2.500v5.500" stroke="#2a1d16" stroke-width="1.200" stroke-linecap="round" />
        <circle class="wick" cx="16" cy="2.600" r="1.200" fill="#ff8a3d" />
        <path d="M10 9c0-1.400 2.700-2.200 6-2.200s6 .8 6 2.200v29H10Z" fill="url(#wax-{uid})" />
        <path class="pool" d="M10.600 9c0-.9 2.400-1.500 5.400-1.500s5.400.6 5.400 1.500-2.400 1.400-5.400 1.400-5.400-.5-5.400-1.400Z" fill="#f6cf8c" />
        <path d="M10 9.200c0 3.400.2 6.200 1.100 7.400.8 1 1.700.4 1.700-1.200v-4.700M14.200 10.300v3.200c0 1.100.5 1.700 1 1.700.6 0 1-.6 1-1.700v-3.100" fill="#fff6e4" stroke="#d8c29d" stroke-width="0.500" />
        <path class="drip" d="M19.600 10.200v9.400c0 1.200.7 2 1.300 2s1.100-.8 1.100-2V9.400" fill="#efdcb8" stroke="#ccb289" stroke-width="0.500" />
        <path d="M4 38.200h24l-2.600 3.700H6.600Z" fill="url(#iron-{uid})" />
        <path d="M4 38.200h24" stroke="var(--gold, #c8a56a)" stroke-width="1" stroke-linecap="round" />
        <path d="M12.500 41.900h7l-.8 2.300h-5.400Z" fill="#2a1d16" />
        <path d="M10.500 44.200h11" stroke="var(--gold, #c8a56a)" stroke-width="0.800" stroke-linecap="round" opacity="0.8" />
      </svg>
      <i class="ember" aria-hidden="true"></i><i class="ember" aria-hidden="true"></i><i class="ember" aria-hidden="true"></i>
      <i class="smoke" aria-hidden="true"></i><i class="smoke" aria-hidden="true"></i>
    </button>
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
    <div class="art" data-th="halloween"><HalloweenCoverArt /></div>
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
        <circle class="tube" cx="28" cy="124" r="7.500" />
        <circle class="dot" cx="28" cy="124" r="3.500" />
      </g>
    </svg>
    <span class="gl-row r1" aria-hidden="true">{groom}</span>
    <span class="gl-row r2" aria-hidden="true">{bride}</span>
    <span class="gl-row r3" aria-hidden="true">결혼합니다 <em>wedding</em></span>
  </div>
  <div class="gl-meta" data-th="dev"><p class="mono">{mono}</p><p class="when">{dateKo}</p><p class="venue">{venue}</p><i class="trunk" aria-hidden="true"></i></div>
</header>

<style>
  .cover { position: relative; overflow: hidden; overflow-x: clip; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 64px 0 80px; color: var(--ink); }
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
  .mg { font: 300 56px/1 var(--f-latin); letter-spacing: 0.02em; color: rgb(var(--accent-rgb) / 0.7); white-space: nowrap; font-variant-numeric: lining-nums tabular-nums; }
  :global([data-theme="halloween"]) .mg { font-weight: 400; color: var(--gold); }
  :global([data-theme="puppy"]) .mg { color: var(--accent); }
  .mono-y { font: 400 12px/1 var(--f-latin); letter-spacing: 0.3em; margin-right: -0.3em; color: var(--ink-3); font-variant-numeric: lining-nums tabular-nums; }

  .stack { position: relative; display: flex; flex-direction: column; align-items: center; padding-top: 44px; }
  .en { font: 400 15px/24px var(--f-latin); letter-spacing: 0.14em; color: var(--ink); }
  :global([data-theme="halloween"]) .en { font-size: 14px; letter-spacing: 0.3em; margin-right: -0.3em; color: var(--on-night); font-variant-numeric: lining-nums; }
  :global([data-theme="puppy"]) .en { font: 300 14px/24px var(--f-latin); letter-spacing: 0.2em; }
  .en span { display: block; }
  .en sup { font-size: 0.62em; letter-spacing: 0.06em; margin-left: 0.15em; vertical-align: 0.55em; line-height: 0; }
  .hair { display: block; width: 1px; height: 56px; margin: 24px 0; background: var(--ink-3, var(--line)); }
  :global([data-theme="halloween"]) .hair { background: linear-gradient(transparent, var(--gold)); }
  .names { font: 700 20px/32px var(--f-name); letter-spacing: 0.6em; color: var(--ink); }
  :global([data-theme="halloween"]) .names { font-weight: 400; font-size: 22px; }
  :global([data-theme="puppy"]) .names { font-weight: 400; }
  .names span { display: block; margin-right: -0.6em; }
  .venue { margin-top: 24px; font: 400 12px/18px var(--f-body); color: var(--ink-3); }
  .paw { fill: none; stroke: var(--accent); stroke-width: 1.2; margin-left: 8px; vertical-align: -1px; }

  :global([data-theme="halloween"]) .wm { align-self: stretch; padding: 0 16px 52px; text-align: center; white-space: nowrap; color: var(--wordmark, var(--line)); pointer-events: none; user-select: none; }
  .wm { --st-ln: 140ms; }
  .wm span { display: block; font: italic 300 min(40px, calc((100vw - 40px) / 8.6)) / 1.1 var(--f-latin); letter-spacing: 0.04em; }
  :global([data-theme="halloween"]) .hero { width: min(340px, calc(100% - 40px)); margin-top: 56px; aspect-ratio: 336 / 440; }
  :global([data-theme="halloween"]) .frame { clip-path: var(--clip); }
  .rules { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  /* 촛불: 탭으로 끄고 켬(fx/halloween 이 .out 토글). 끄면 커버 빛이 함께 어두워짐 */
  .flame { position: absolute; z-index: 3; left: 50%; bottom: calc(100% - 6px); width: 56px; height: 80px; margin-left: -28px; padding: 0; border: 0; background: none; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
  .flame:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; border-radius: 24px; }
  .flame .stick { position: absolute; left: 12px; bottom: 0; display: block; }
  .flame .fl { position: absolute; left: 19px; bottom: 40px; display: block; transform-origin: 50% 88%; animation: sway 3.4s ease-in-out infinite; transition: transform 420ms cubic-bezier(0.5, 0, 0.75, 0), opacity 360ms ease-in; }
  .fl-o, .fl-m, .fl-i { transform-box: fill-box; }
  .fl-o { transform-origin: 50% 88%; animation: flick 2.6s linear infinite; }
  .fl-m { transform-origin: 50% 85%; animation: flick 1.9s linear -0.7s infinite; }
  .fl-i { transform-origin: 50% 80%; animation: flick 1.3s linear -0.3s infinite; }
  .halo { position: absolute; left: 50%; bottom: 6px; width: 104px; height: 104px; margin-left: -52px; border-radius: 50%; background: radial-gradient(closest-side, rgb(255 200 120 / 0.55), rgb(240 140 60 / 0.22) 45%, transparent 72%); pointer-events: none; animation: halo 2.8s ease-in-out infinite; transition: opacity 500ms ease-in; }
  .wick { opacity: 0; }
  .pool { transition: fill 600ms ease; }
  .flame:global(.out) .pool { fill: #e9dcc4; }
  .drip { transform-origin: 50% 0; transform-box: fill-box; animation: drip 7s ease-in-out infinite alternate; }
  .ember { position: absolute; left: 50%; bottom: 66px; width: 2px; height: 2px; margin-left: -1px; border-radius: 50%; background: #ffc27a; box-shadow: 0 0 3px #ff9a4a; opacity: 0; pointer-events: none; animation: ember 3.6s ease-out infinite; }
  .ember:nth-of-type(2) { --x: -7px; animation-delay: 1.2s; animation-duration: 4.2s; }
  .ember:nth-of-type(3) { --x: 6px; animation-delay: 2.5s; animation-duration: 3.2s; }
  .flame:global(.out) .fl { transform: scale(0.1, 0.05) skewX(-24deg); opacity: 0; animation: none; }
  .flame:global(.out) :is(.halo, .ember) { opacity: 0; animation: none; }
  .flame:global(.out) .wick { animation: wick 1.4s ease-out forwards; }
  .flame:global(.lit) .fl { animation: relight 620ms cubic-bezier(0.34, 1.56, 0.64, 1), sway 3.4s ease-in-out 620ms infinite; }
  .flame:global(.lit) .halo { animation: relight-halo 700ms ease-out, halo 2.8s ease-in-out 700ms infinite; }
  .smoke { position: absolute; left: 50%; bottom: 44px; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%; background: rgb(200 190 180 / 0.6); opacity: 0; filter: blur(2px); pointer-events: none; }
  .smoke + .smoke { margin-left: 0; }
  .flame:global(.out) .smoke { animation: smoke 1.8s ease-out forwards; }
  .flame:global(.out) .smoke + .smoke { animation: smoke2 2.2s ease-out 0.25s forwards; }
  @keyframes smoke { 0% { opacity: 0.8; transform: translate(0, 0) scale(1); } 40% { opacity: 0.5; transform: translate(-5px, -18px) scale(2.2); } 100% { opacity: 0; transform: translate(4px, -44px) scale(4); } }
  @keyframes smoke2 { 0% { opacity: 0.6; transform: translate(0, 0) scale(0.8); } 45% { opacity: 0.4; transform: translate(5px, -20px) scale(2); } 100% { opacity: 0; transform: translate(-3px, -50px) scale(3.6); } }
  @keyframes relight { 0% { opacity: 0; transform: scale(0.1); } 45% { opacity: 1; transform: scale(1.35, 1.5); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes relight-halo { 0% { opacity: 0; transform: scale(0.4); } 50% { opacity: 1; transform: scale(1.25); } 100% { opacity: 0.85; transform: scale(1); } }
  @keyframes sway { 0%, 100% { transform: rotate(-2deg) skewX(1deg); } 30% { transform: rotate(2.5deg) skewX(-2deg); } 55% { transform: rotate(-1deg) skewX(1.5deg); } 80% { transform: rotate(1.5deg) skewX(-1deg); } }
  @keyframes halo { 0%, 100% { opacity: 0.85; transform: scale(1); } 35% { opacity: 1; transform: scale(1.08); } 60% { opacity: 0.75; transform: scale(0.96); } }
  @keyframes ember { 0% { opacity: 0; transform: translate(0, 0) scale(1); } 12% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--x, 2px), -34px) scale(0.4); } }
  @keyframes drip { 0%, 40% { transform: scaleY(0.88); } 100% { transform: scaleY(1.12); } }
  @keyframes wick { 0% { opacity: 1; } 100% { opacity: 0; } }
  :global([data-theme="halloween"] .cover:has(.flame.out)) .frame { filter: brightness(0.72) saturate(0.8); }
  :global([data-theme="halloween"] .cover:has(.flame.out) .hero)::before { opacity: 0.15; }
  .frame { transition: filter 700ms cubic-bezier(.4,0,.2,1) 60ms; }
  @keyframes flick { 0% { opacity: 0.95; transform: scaleY(1) } 11% { opacity: 0.85; transform: scaleY(0.94) } 23% { opacity: 1; transform: scaleY(1.04) } 37% { opacity: 0.88; transform: scaleY(0.96) rotate(-2deg) } 52% { opacity: 1; transform: scaleY(1.02) } 64% { opacity: 0.86; transform: scaleY(0.93) rotate(2deg) } 81% { opacity: 0.98; transform: scaleY(1.03) } 100% { opacity: 0.95; transform: scaleY(1) } }

  .mark { font: 300 28px/40px var(--f-latin); letter-spacing: 0.32em; margin-right: -0.32em; color: var(--ink); }
  .cover-dogs { width: 176px; margin: 16px auto 0; }
  .cover-dogs :global(svg) { display: block; width: 100%; height: auto; }
  :global([data-theme="puppy"]) .hero { width: 80%; margin-top: 40px; aspect-ratio: 4 / 5; }
  :global([data-theme="puppy"]) .frame { border-radius: 999px 999px 0 0; border: 1px solid var(--line); border-bottom: 0; background: #efe5d6; }
  :global([data-theme="puppy"]) .ph { background: none; }
  :global([data-theme="puppy"]) .hero::after { content: ""; position: absolute; inset: auto 0 0; height: 22%; background: linear-gradient(to bottom, transparent, var(--bg)); pointer-events: none; }

  :global([data-theme="dev"]) .cover { align-items: stretch; text-align: left; padding: 40px 24px 0 calc(var(--rail-x, 28px) + 32px); }
  .kicker { margin-bottom: 16px; font: 400 12px/20px var(--f-mono); color: var(--ink-3); }
  .kicker::after { content: ""; display: inline-block; width: 7px; height: 14px; margin-left: 4px; vertical-align: -2px; background: var(--accent); animation: caret 1.2s steps(1, end) infinite; }
  @keyframes caret { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0; } }
  :global([data-theme="dev"]) .hero { width: 100%; max-width: 360px; aspect-ratio: 4 / 5; margin-bottom: 16px; }
  :global([data-theme="dev"]) .frame { border-radius: 6px; border: 1px solid var(--line); }
  .pr { order: 4; width: 100%; max-width: 360px; margin-bottom: 16px; padding: 16px; border-radius: 12px; background: var(--surface); box-shadow: 0 0 0 1px var(--line), 0 2px 4px rgb(0 0 0 / 0.04), 0 16px 32px -20px rgb(0 0 0 / 0.14); }
  .pr-h { display: flex; align-items: center; justify-content: space-between; font: 500 12px/20px var(--f-mono); color: var(--ink-3); }
  .pr-st { padding: 0 8px; border-radius: 999px; background: rgb(var(--accent-rgb) / 0.08); color: var(--accent-text); font-size: 11px; }
  .pr-t { margin-top: 8px; font: 600 17px/24px var(--f-ui); letter-spacing: -0.02em; color: var(--ink); }
  .pr-br { display: flex; align-items: center; gap: 8px; margin-top: 12px; font: 400 12px/20px var(--f-mono); }
  .pr-br code { padding: 0 8px; border-radius: 4px; background: var(--gs-3); color: var(--ink-2); font: inherit; }
  .pr-br i { font-style: normal; color: var(--ink-3); }
  .pr-m { display: grid; gap: 8px; margin: 16px 0 0; padding-top: 12px; border-top: 1px solid var(--line); }
  .pr-m div { display: grid; grid-template-columns: 76px 1fr; align-items: center; }
  .pr-m dt { font: 400 12px/20px var(--f-mono); color: var(--ink-3); }
  .pr-m dd { display: flex; align-items: center; margin: 0; font: 400 13px/20px var(--f-ui); color: var(--ink); }
  .av { display: grid; place-items: center; width: 20px; height: 20px; margin-right: -4px; border-radius: 50%; background: var(--gs-4); box-shadow: 0 0 0 2px var(--surface); font: 600 10px/1 var(--f-ui); color: var(--ink-2); }
  .av + .av { margin-right: 8px; }
  .pr-f { display: flex; align-items: center; gap: 6px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); font: 500 12px/20px var(--f-mono); color: var(--accent-text); }
  .gl { position: relative; flex: none; height: 140px; margin: 16px 0 0 calc(-1 * (var(--rail-x, 28px) + 32px)); max-width: none; }
  .gl-svg { position: absolute; top: 0; left: calc(var(--rail-x, 28px) - 28px); width: 60px; height: 140px; }
  .gl-row { position: absolute; left: calc(var(--rail-x, 28px) + 32px); transform: translateY(-50%); font: 600 26px/1.3 var(--f-body); white-space: nowrap; color: var(--ink); }
  .r1 { top: 20px; } .r2 { top: 72px; } .r3 { top: 124px; font-size: 18px; }
  .gl-row em { font: 500 11px/18px var(--f-mono); font-style: normal; color: var(--accent-text); background: rgb(var(--accent-rgb) / 0.08); border-radius: 999px; padding: 1px 8px; margin-left: 8px; vertical-align: 2px; }
  .gl-meta { position: relative; padding: 8px 0 24px; }
  .mono { font: 400 12px/20px var(--f-mono); letter-spacing: 0; color: var(--ink-3); }
  .when { font: 400 var(--t-lead)/24px var(--f-body); color: var(--ink); }
  .gl-meta .venue { margin-top: 2px; }
  .trunk { position: absolute; left: calc(-1 * (var(--rail-x, 28px) + 32px) + var(--rail-x, 28px)); top: -16px; bottom: 0; width: 2px; margin-left: -1px; background: var(--ink); }

  @media (prefers-reduced-motion: reduce) { .flame :is(.fl, .fl-o, .fl-m, .fl-i, .halo, .drip), .kicker::after { animation: none !important; } .smoke, .ember { display: none; } }
</style>
