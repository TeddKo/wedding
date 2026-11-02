<script lang="ts">
  import { onMount } from "svelte";
  import { ddayKst, reduced } from "../lib/motion";
  import { fnv7 } from "../lib/hash";

  let {
    year,
    month,
    day,
    date,
    dateKo,
    dayNames,
    grid,
    icsHref,
    gcalHref,
  }: {
    year: number;
    month: number;
    day: number;
    date: string;
    dateKo: string;
    venue?: string;
    dayNames: string[];
    grid: (number | null)[];
    icsHref: string;
    gcalHref: string;
  } = $props();

  let root = $state<HTMLElement>();
  let n = $state<number | null>(null);
  let shown = $state(0);

  const text = $derived(n === null ? "" : n > 0 ? `결혼식까지 ${n}일` : n === 0 ? "오늘" : `${-n}일 지났습니다`);

  /* 첫 노출에 0 에서 N 까지 900ms 카운트업 */
  function countUp(to: number) {
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      shown = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  onMount(() => {
    n = ddayKst(date);
    const to = Math.abs(n);
    if (reduced() || to === 0) {
      shown = to;
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        countUp(to);
      },
      { threshold: 0.3 },
    );
    if (root) io.observe(root);
    return () => io.disconnect();
  });
</script>

<section class="section" aria-labelledby="cal-h" bind:this={root} data-reveal>
  <h2 id="cal-h" class="sec-title"><span class="hash" data-th="dev" aria-hidden="true">{fnv7("calendar")}</span>{year}년 {month}월</h2>
  <p class="when">{dateKo}</p>
  <div class="cal" role="table" aria-label={`${year}년 ${month}월 달력`}>
    <div class="cal-row" role="row">
      {#each dayNames as d, i}
        <span role="columnheader" class="cal-h" class:sun={i === 0}>{d}</span>
      {/each}
    </div>
    <div class="cal-grid">
      {#each grid as d, i}
        {#if d === null}
          <span role="cell"></span>
        {:else if d === day}
          <span role="cell" class="c wed" aria-label="{month}월 {d}일 결혼식">
            <i class="mark">
              <svg data-th="puppy" class="paw" viewBox="0 0 42 42" aria-hidden="true" focusable="false"><g fill="var(--rose, #ee7e98)"><ellipse cx="21" cy="27" rx="11" ry="9.5" /><ellipse cx="7" cy="19" rx="3.8" ry="4.8" /><ellipse cx="15" cy="9" rx="3.8" ry="4.8" /><ellipse cx="27" cy="9" rx="3.8" ry="4.8" /><ellipse cx="35" cy="19" rx="3.8" ry="4.8" /></g></svg>
              <b>{d}</b>
            </i>
          </span>
        {:else}
          <span role="cell" class="c" class:sun={i % 7 === 0}>{d}</span>
        {/if}
      {/each}
    </div>
  </div>

  <p class="dday" id="dday" data-date={date} data-n={n ?? undefined} aria-live="polite">
    {#if n === null}
      <span class="plain">{year}. {String(month).padStart(2, "0")}. {String(day).padStart(2, "0")} 결혼식</span>
    {:else}
      <span class="sr">{text}</span>
      <span class="vis" aria-hidden="true">
        {#if n > 0}<span class="lead">결혼식까지</span>{/if}
        {#if n === 0}
          <span class="num">오늘</span>
        {:else}
          <span class="num">{shown}</span>
          <span class="unit">{n > 0 ? "일" : "일 지났습니다"}</span>
        {/if}
      </span>
    {/if}
  </p>

  <div class="cal-add">
    <a class="btn-text" href={icsHref} download="wedding.ics">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4M12 13v4M10 15h4" /></svg>
      캘린더에 추가
    </a>
    <a class="btn-text" href={gcalHref} target="_blank" rel="noopener">Google 캘린더</a>
  </div>
</section>

<style>
  .when { margin: 0 auto 24px; max-width: 340px; text-align: center; white-space: nowrap; font-size: 15px; line-height: 1.6; color: var(--ink-2, var(--ivory-dim)); }
  .cal { max-width: 340px; margin: 0 auto; }
  .cal-row, .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; }
  .cal-h { font-size: 12px; line-height: 40px; color: var(--ink-2, var(--ivory-dim)); }
  .cal-grid span { height: 40px; display: grid; place-items: center; font-size: 15px; font-variant-numeric: tabular-nums; }
  .sun { color: var(--sun); }
  .mark {
    position: relative; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; font-style: normal;
    background: var(--accent, var(--pumpkin)); color: var(--on-accent, var(--bg));
  }
  .mark b { position: relative; font-weight: 600; font-size: 15px; }
  .paw { display: none; }
  :global([data-theme="halloween"]) .mark { outline: 1px solid var(--accent, var(--pumpkin)); outline-offset: 3px; }
  :global([data-theme="dev"]) .mark { background: var(--groom, var(--accent)); border-radius: 4px; }
  :global([data-theme="puppy"]) .mark { background: none; width: 42px; height: 42px; }
  :global([data-theme="puppy"]) .paw { display: block; position: absolute; inset: 0; width: 100%; height: 100%; }
  :global([data-theme="puppy"]) .mark b { color: #fff; transform: translateY(6px); }

  .dday { margin: 32px 0 16px; min-height: 56px; display: grid; place-items: center; }
  .vis { display: inline-flex; align-items: baseline; justify-content: center; gap: 8px; flex-wrap: wrap; }
  .lead, .unit { font-size: 16px; color: var(--ink, var(--ivory)); }
  .num { font-family: var(--f-display, inherit); font-size: 44px; line-height: 1; font-variant-numeric: tabular-nums; color: var(--accent-text, var(--accent, var(--pumpkin))); }
  .plain { color: var(--ink-2, var(--ivory-dim)); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .cal-add { display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; }
</style>
