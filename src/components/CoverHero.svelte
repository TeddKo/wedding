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
  :global([data-theme="halloween"]) .hero { width: min(300px, calc(100% - 64px)); margin-top: 0; aspect-ratio: 336 / 440; }
  :global([data-theme="halloween"]) .frame { clip-path: var(--clip); }
  .rules { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .flame { position: absolute; left: 50%; top: -32px; width: 12px; height: 22px; margin-left: -6px; pointer-events: none; }
  .flame svg { display: block; transform-origin: 50% 100%; animation: flick 3s linear infinite; }
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

  @media (prefers-reduced-motion: reduce) { .flame svg, .kicker::after { animation: none; } }
</style>
