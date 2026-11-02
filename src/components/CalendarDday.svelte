<script lang="ts">
  import { onMount } from "svelte";
  import { Spring } from "svelte/motion";
  import Divider from "./ui/Divider.svelte";
  import FlipDigit from "./ui/FlipDigit.svelte";
  import { ddayKst, rand, reduced } from "../lib/motion";

  let {
    year,
    month,
    day,
    date,
    dateKo,
    dayNames,
    grid,
  }: { year: number; month: number; day: number; date: string; dateKo: string; dayNames: string[]; grid: (number | null)[] } = $props();

  let root = $state<HTMLElement>();
  let armed = $state(false);
  let shown = $state(false);
  let n = $state<number | null>(null);
  const lamp = new Spring({ s: 1, o: 1 }, { stiffness: 0.16, damping: 0.3 });
  const pop = new Spring(0, { stiffness: 0.07, damping: 0.32 });

  const digits = $derived(n === null ? [] : String(Math.abs(n)).split("").map(Number));
  const text = $derived(n === null ? "" : n > 0 ? `결혼식까지 ${n}일` : n === 0 ? "오늘" : `${-n}일 지났습니다`);
  const delayOf = (i: number) => (Math.floor(i / 7) + (i % 7)) * 48;
  const wedIdx = grid.indexOf(day);

  onMount(() => {
    n = ddayKst(date);
    if (reduced()) {
      shown = true;
      pop.set(1, { instant: true });
      return;
    }
    armed = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        shown = true;
        io.disconnect();
        setTimeout(() => (pop.target = 1), delayOf(wedIdx) + 350);
      },
      { threshold: 0.3 },
    );
    if (root) io.observe(root);
    const tick = setInterval(() => {
      if (shown && !document.hidden) lamp.target = { s: 1 + rand(-0.04, 0.06), o: rand(0.6, 1) };
    }, 130);
    return () => {
      io.disconnect();
      clearInterval(tick);
    };
  });
</script>

<section class="section" aria-labelledby="cal-h" bind:this={root} data-reveal="line">
  <h2 id="cal-h" class="sec-title"><span class="latin">Calendar</span>{year}년 {month}월</h2>
  <Divider />
  <p class="cal-time">{dateKo}</p>
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
          <span role="cell" class="today c" class:armed class:in={shown} class:sun={i % 7 === 0} style:--d="{delayOf(i)}ms" aria-label="{month}월 {d}일 결혼식">
            <i class="glow" style:opacity={armed ? pop.current * lamp.current.o : 1} style:transform="scale({armed ? 0.6 + pop.current * 0.6 * lamp.current.s : 1})"></i>
            <svg class="pumpkin" viewBox="0 0 48 46" aria-hidden="true" focusable="false" style:transform="scale({armed ? 0.5 + pop.current * 0.5 : 1})">
              <defs>
                <radialGradient id="pk" cx="50%" cy="46%" r="60%">
                  <stop offset="0" stop-color="#ffb35a" />
                  <stop offset="0.7" stop-color="#e07a2f" />
                  <stop offset="1" stop-color="#b95a18" />
                </radialGradient>
              </defs>
              <path d="M24 9c-3-3-6-4-8-3" fill="none" stroke="#6b8a3a" stroke-width="3" stroke-linecap="round" />
              <ellipse cx="14" cy="27" rx="12" ry="16" fill="url(#pk)" />
              <ellipse cx="34" cy="27" rx="12" ry="16" fill="url(#pk)" />
              <ellipse cx="24" cy="27" rx="12" ry="17.5" fill="url(#pk)" />
              <path d="M24 10v34M17 12c-4 8-4 24 0 32M31 12c4 8 4 24 0 32" fill="none" stroke="#b95a18" stroke-width="0.9" opacity="0.7" />
              <path d="M16 13l3.6 5h-7.2zM32 13l3.6 5h-7.2z" fill="#2a1208" opacity="0.85" />
            </svg>
            <b>{d}</b>
          </span>
        {:else}
          <span role="cell" class="c" class:armed class:in={shown} class:sun={i % 7 === 0} style:--d="{delayOf(i)}ms">{d}</span>
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
          <span class="today-txt">오늘</span>
        {:else}
          <span class="flip">
            {#each digits as dg, i (i)}
              <FlipDigit value={dg} steps={5 + i * 2} delay={i * 160} go={shown} />
            {/each}
          </span>
          <span class="unit">{n > 0 ? "일" : "일 지났습니다"}</span>
        {/if}
      </span>
    {/if}
  </p>
</section>

<style>
  .cal-time { margin-bottom: 20px; color: var(--ivory-dim); }
  .cal { max-width: 340px; margin: 0 auto; border-top: 1px solid rgb(201 164 92 / 0.5); border-bottom: 1px solid rgb(201 164 92 / 0.5); padding: 14px 0; }
  .cal-row, .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; }
  .cal-h { font-size: 13px; color: var(--gold); padding-bottom: 8px; }
  .cal-grid span { height: 42px; display: grid; place-items: center; font-size: 15px; position: relative; }
  .sun { color: #e58a8a; }
  .c.armed { opacity: 0; transform: translateY(14px) scale(0.7); }
  .c.armed.in { opacity: 1; transform: none; transition: opacity 0.5s ease var(--d), transform 0.7s cubic-bezier(0.2, 1.5, 0.4, 1) var(--d); }
  .today { color: #14090a; font-weight: 700; z-index: 1; overflow: visible; }
  .today b { position: relative; z-index: 2; font-weight: 700; margin-top: 10px; font-size: 14px; }
  .pumpkin { position: absolute; left: 50%; top: 50%; width: 48px; height: 46px; margin: -22px 0 0 -24px; will-change: transform; }
  .glow {
    position: absolute; left: 50%; top: 50%; width: 110px; height: 110px; margin: -55px 0 0 -55px; border-radius: 50%; pointer-events: none; will-change: transform, opacity;
    background: radial-gradient(closest-side, rgb(255 170 80 / 0.55), rgb(224 122 47 / 0.18) 55%, rgb(224 122 47 / 0));
  }

  .dday { margin: 28px 0 24px; font-size: 20px; letter-spacing: 0.06em; min-height: 78px; display: grid; place-items: center; }
  .vis { display: inline-flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
  .lead, .unit { color: var(--ivory); }
  .today-txt { font-size: 34px; color: var(--pumpkin); font-weight: 700; text-shadow: 0 0 18px rgb(224 122 47 / 0.6); }
  .flip { display: inline-flex; }
  .plain { color: var(--ivory-dim); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
