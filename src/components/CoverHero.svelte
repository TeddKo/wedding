<script lang="ts">
  import type { Snippet } from "svelte";

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

</script>

{#snippet info()}
  <div class="stack" class:with-photo={hasPhoto}>
    <p class="en" data-th="halloween puppy">
      <span>{EN_DAY[wd]}</span>
      <span>{EN_MON[m - 1]} {d}<sup>{ord(d)}</sup></span>
      <span>{clock}</span>
    </p>
    <p class="mono" data-th="dev">{mono}</p>
    <i class="hair" aria-hidden="true"></i>
    <p class="names" aria-hidden="true"><span>{groom}</span><span>{bride}</span></p>
    <p class="venue">{venue}<svg class="paw" data-th="puppy" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><ellipse cx="12" cy="16" rx="5" ry="4" /><circle cx="5.500" cy="10" r="2" /><circle cx="10" cy="5.500" r="2" /><circle cx="14" cy="5.500" r="2" /><circle cx="18.500" cy="10" r="2" /></svg></p>
  </div>
{/snippet}

<header class="cover" style:--focus={focus}>
  <h1 class="sr">{groom} & {bride} 결혼합니다</h1>
  {#if hasPhoto}
    <div class="arch">{@render photo?.()}</div>
    {@render info()}
  {:else}
    <div class="hal" data-th="halloween">
      <div class="wm" aria-hidden="true"><span>ALL</span><span>HALLOWS'</span><span>EVE</span></div>
      <p class="hal-names" aria-hidden="true"><span>{groom}</span><span>{bride}</span></p>
      <svg class="moon" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><path d="M16 3a9 9 0 1 0 5 15A8 8 0 0 1 16 3z" /></svg>
      <p class="hal-date">{dateKo}</p>
      <p class="venue">{venue}</p>
    </div>
    <div class="alt" data-th="dev puppy">
      <p class="mark dev" data-th="dev" aria-hidden="true">Hello, World<span class="caret">_</span></p>
      <p class="mark pup" data-th="puppy" aria-hidden="true">TWO OF US</p>
      {@render info()}
    </div>
  {/if}
</header>

<style>
  .cover { position: relative; overflow: hidden; text-align: center; padding: 56px 0 160px; overflow-x: clip; color: var(--ink); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

  .hal { position: relative; padding: 0 28px; text-align: left; }
  .wm { position: relative; z-index: 0; margin: 0 0 0 -22px; white-space: nowrap; color: var(--wordmark, var(--line)); pointer-events: none; user-select: none; }
  .wm span { display: block; font: 400 clamp(84px, 26vw, 118px) / 0.88 var(--f-latin); letter-spacing: 0.01em; }
  .hal-names { position: relative; display: flex; justify-content: space-between; z-index: 1; margin-top: 40px; font: 700 20px/28px var(--f-name); letter-spacing: 0.6em; color: var(--ink); }
  .hal-names span:last-child { margin-right: -0.6em; }
  .moon { position: relative; z-index: 1; display: block; margin: 36px auto 12px; fill: var(--accent); }
  .hal-date { position: relative; z-index: 1; text-align: center; font: 400 15px/1.7 var(--f-body); color: var(--ink); }
  .hal .venue { position: relative; z-index: 1; text-align: center; }

  .alt { display: flex; flex-direction: column; align-items: center; }
  .mark { margin-top: 24px; color: var(--ink); }
  .mark.dev { font: 400 24px/1.4 var(--f-mono); }
  .caret { color: var(--accent); }
  .mark.pup { font: 400 36px/1.3 var(--f-latin); letter-spacing: 0.24em; margin-right: -0.24em; }
  .alt .stack { padding-top: 56px; }
  .paw { fill: none; stroke: var(--accent); stroke-width: 1.2; margin-left: 8px; vertical-align: -1px; }
  .moon { stroke: none; }

  .stack { position: relative; display: flex; flex-direction: column; align-items: center; }
  .stack.with-photo { padding-top: 28px; }

  .en { font: 400 15px/1.7 var(--f-latin); letter-spacing: 0.14em; color: var(--ink); }
  .en span { display: block; }
  .en sup { font-size: 0.62em; letter-spacing: 0.06em; margin-left: 0.15em; vertical-align: 0.55em; line-height: 0; }
  .mono { font: 400 14px/1.7 var(--f-mono, monospace); letter-spacing: 0.04em; color: var(--ink); }

  .hair { display: block; width: 1px; height: 80px; margin: 24px 0; background: var(--ink-3, var(--line)); }

  .names { font: 700 20px/28px var(--f-name); letter-spacing: 0.6em; color: var(--ink); }
  .names span { display: block; margin-right: -0.6em; }

  .venue { margin-top: 28px; font: 400 12.5px/1.5 var(--f-body); color: var(--ink-3); }

  .arch { position: relative; width: 80%; margin: 40px auto 0; aspect-ratio: 4 / 5; overflow: hidden; border-radius: 999px 999px 0 0; background: var(--surface); }
  .arch :global(img) { width: 100%; height: 100%; object-fit: cover; object-position: var(--focus); display: block; }
  .arch::after { content: ""; position: absolute; inset: auto 0 0; height: 40%; background: linear-gradient(to bottom, transparent, var(--bg)); pointer-events: none; }
</style>
