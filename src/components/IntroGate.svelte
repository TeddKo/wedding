<script lang="ts">
  import { onMount } from "svelte";
  import { setTheme, theme } from "../lib/theme.svelte";
  import { THEMES, THEME_NAMES } from "../lib/themes";
  import { playBgm } from "../scripts/audio";
  import { reduced } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";

  let { groom, bride, date }: { groom: string; bride: string; date: string } = $props();

  let done = $state(false);
  let leaving = $state(false);
  let openBtn = $state<HTMLButtonElement>();

  /** 패널이 걷히기 시작하는 시점(ms). 이 시점에 stage.open 이 서고 커버 안무가 패널 뒤에서 시작된다 */
  const LIFT = 160;
  /** 테마별 패널 이동 시간(ms). CSS 의 --pd 와 같아야 한다 */
  const PANEL_MS: Record<string, number> = { halloween: 1100, puppy: 820 };
  const timers: number[] = [];
  const chars = (s: string) => Array.from(s);

  onMount(() => {
    const html = document.documentElement;
    /* JS 가 느려 폴백 타이머가 이미 게이트를 걷어냈다면 인트로는 건너뛴다 */
    if (!html.classList.contains("js")) {
      done = true;
      stage.open = true;
      html.classList.add("opened");
      return;
    }
    stage.gate = true;
    html.dataset.gate = "ready";
    for (const el of document.querySelectorAll("main, footer")) el.setAttribute("inert", "");
    openBtn?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    return () => timers.forEach(clearTimeout);
  });

  /**
   * 클릭 → 내용 페이드(320ms) → LIFT 뒤 패널 상승과 동시에 stage.open → 이동이 끝나면 게이트 제거.
   * 모션 감소이면 즉시 열고 제거한다.
   */
  function openGate() {
    if (leaving) return;
    leaving = true;
    playBgm();
    const html = document.documentElement;
    const reveal = () => {
      html.classList.remove("gated");
      html.classList.add("opened");
      stage.open = true;
      for (const el of document.querySelectorAll("main, footer")) el.removeAttribute("inert");
      const main = document.querySelector<HTMLElement>("main");
      main?.setAttribute("tabindex", "-1");
      main?.focus({ preventScroll: true });
    };
    if (reduced()) {
      reveal();
      done = true;
      return;
    }
    timers.push(window.setTimeout(reveal, LIFT));
    timers.push(window.setTimeout(() => (done = true), LIFT + (PANEL_MS[html.dataset.theme ?? ""] ?? 900) + 60));
  }
</script>

{#if !done}
  <div class="gate" class:leaving role="dialog" aria-modal="true" aria-label="청첩장 인트로">
    <div class="mid">
      <div class="intro-emblem" data-th="halloween" aria-hidden="true"><svg viewBox="0 0 40 46" width="40" height="46" focusable="false"><path d="M6 43V19C6 9 12 4 20 4s14 5 14 15v24l-5-4-4 4-5-4-5 4-4-4Z" fill="#fbf8f3" stroke="#2b2420" stroke-width="1.400" stroke-linejoin="round"/><ellipse cx="15" cy="20" rx="1.600" ry="2.200" fill="#2b2420"/><ellipse cx="25" cy="20" rx="1.600" ry="2.200" fill="#2b2420"/></svg></div>
      <div class="intro-emblem" data-th="puppy" aria-hidden="true"><svg viewBox="0 0 52 30" width="52" height="30" focusable="false"><g transform="translate(4 8) rotate(-14 8 8) scale(0.667)"><g class="e1" fill="#b27085" opacity="0.55"><ellipse cx="12" cy="16.500" rx="5.800" ry="4.600"/><ellipse cx="4.800" cy="11" rx="2.200" ry="2.900" transform="rotate(-22 4.800 11)"/><ellipse cx="9.200" cy="5.800" rx="2.300" ry="3"/><ellipse cx="14.800" cy="5.800" rx="2.300" ry="3"/><ellipse cx="19.200" cy="11" rx="2.200" ry="2.900" transform="rotate(22 19.200 11)"/></g></g><g transform="translate(30 0) rotate(12 8 8) scale(0.667)"><g class="e2" fill="#b27085" opacity="0.55"><ellipse cx="12" cy="16.500" rx="5.800" ry="4.600"/><ellipse cx="4.800" cy="11" rx="2.200" ry="2.900" transform="rotate(-22 4.800 11)"/><ellipse cx="9.200" cy="5.800" rx="2.300" ry="3"/><ellipse cx="14.800" cy="5.800" rx="2.300" ry="3"/><ellipse cx="19.200" cy="11" rx="2.200" ry="2.900" transform="rotate(22 19.200 11)"/></g></g></svg></div>
      <div class="intro-emblem" data-th="dev" aria-hidden="true"><i class="ie-node"></i><span class="ie-label">HEAD -> main</span></div>
      <p class="eyebrow"><span class="mi">Wedding Invitation</span></p>
      <p class="names">
        <span><span class="sr">{groom}</span><span aria-hidden="true">{#each chars(groom) as c, i (i)}<span class="ch" style:--i={i}>{c}</span>{/each}</span></span>
        <span><span class="sr">{bride}</span><span aria-hidden="true">{#each chars(bride) as c, i (i)}<span class="ch" style:--i={chars(groom).length + i}>{c}</span>{/each}</span></span>
      </p>
      <i class="hair" aria-hidden="true"></i>
      <p class="date">{date}</p>
    </div>
    <div class="bottom">
      <button bind:this={openBtn} type="button" class="open" data-press onclick={openGate}>초대장 열기</button>
      <div class="pick" role="group" aria-label="초대장 분위기 고르기">
        {#each THEME_NAMES as k (k)}
          <button type="button" class="opt" aria-pressed={theme.name === k} onclick={() => setTheme(k)}>{THEMES[k].label}</button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .gate {
    --pd: 900ms; --pe: var(--e-io);
    position: fixed; inset: 0; z-index: 100; display: none; flex-direction: column; align-items: center; justify-content: space-between;
    padding: 0 40px calc(48px + env(safe-area-inset-bottom)); background: var(--paper), var(--bg); color: var(--ink); text-align: center;
    box-shadow: 0 1px 0 var(--line);
  }
  :global(html.js) .gate { display: flex; }
  :global([data-theme="halloween"]) .gate { --pd: 1100ms; --pe: var(--e-ink); }
  :global([data-theme="puppy"]) .gate { --pd: 820ms; --pe: cubic-bezier(0.5, -0.1, 0.2, 1.1); }
  .mid { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 24px; }
  .intro-emblem { margin-bottom: 40px; }
  .intro-emblem:empty { margin-bottom: 0; }
  .eyebrow { overflow: clip; padding-block: 0.14em; margin: -0.14em 0 28px; font: 400 14px/1.4 var(--f-latin); text-transform: uppercase; letter-spacing: 0.14em; color: var(--accent-text); }
  .mi { display: block; }
  .names { display: flex; flex-direction: column; gap: 0; margin: 0; font: 700 20px/28px var(--f-name); letter-spacing: 0.6em; padding-left: 0.6em; }
  .ch { display: inline-block; }
  .hair { display: block; width: 1px; height: 48px; margin: 28px 0; background: var(--ink-3); transform-origin: 50% 50%; }
  .date { margin: 0; font: 400 15px/1.7 var(--f-name); letter-spacing: 0.05em; color: var(--ink-2); }

  .bottom { display: flex; flex-direction: column; align-items: center; gap: 24px; }
  .open {
    position: relative; min-height: 52px; padding: 0 44px; border: 1px solid var(--ink); border-radius: 9999px; background: transparent; color: var(--ink);
    font: 500 13.5px/1 var(--f-ui); letter-spacing: 0.06em; cursor: pointer; -webkit-appearance: none; appearance: none; -webkit-tap-highlight-color: transparent;
  }
  .open::after { content: ""; position: absolute; inset: -5px; border: 1px solid var(--ink); border-radius: 9999px; opacity: 0; pointer-events: none; }
  .pick { display: inline-flex; gap: 4px; padding: 3px; border: 1px solid var(--line); border-radius: 9999px; background: transparent; }
  .opt {
    min-height: 30px; padding: 0 14px; border: 0; border-radius: 9999px; background: none; color: var(--ink-3);
    font: 400 12px/1 var(--f-ui); letter-spacing: 0.04em; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: color 0.2s;
  }
  .opt[aria-pressed="true"] { color: var(--accent-text); font-weight: 600; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 6px; }
  .opt:focus-visible, .open:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .leaving { transform: translateY(-100%); transition: transform var(--pd) var(--pe) 160ms; pointer-events: none; }
  .leaving .mid, .leaving .bottom { opacity: 0; transform: translateY(-10px); transition: opacity 320ms var(--e-out), transform 320ms var(--e-out); }
  .leaving .open::after { animation: none; }

  @media (prefers-reduced-motion: no-preference) {
    .intro-emblem { animation: g-stamp 360ms var(--e-spring) backwards; }
    .eyebrow .mi { animation: g-mask var(--rv-dur) var(--rv-ease) 180ms backwards; }
    .ch { animation: rv-ch var(--t3) var(--rv-ease) calc(320ms + var(--i) * var(--st-ch)) backwards; }
    :global([data-theme="halloween"]) .ch { animation-name: rv-ch-candle; animation-duration: 900ms; }
    :global([data-theme="puppy"]) .ch { animation-name: rv-ch-bounce; animation-duration: 700ms; animation-timing-function: ease; }
    :global([data-theme="dev"]) .ch { animation: rv-step 1ms steps(1, end) calc(320ms + var(--i) * var(--st-ch)) backwards; }
    .hair { animation: g-draw 700ms var(--e-io) 700ms backwards; }
    .date { animation: g-rise var(--rv-dur) var(--rv-ease) 900ms backwards; }
    .open { animation: g-rise var(--rv-dur) var(--rv-ease) 1100ms backwards; }
    .pick { animation: g-rise var(--rv-dur) var(--rv-ease) 1250ms backwards; }
    .open::after { animation: g-breath 3.2s ease-in-out 3.1s infinite; }
    .leaving .intro-emblem, .leaving .eyebrow .mi, .leaving .ch, .leaving .hair, .leaving .date, .leaving .open, .leaving .pick { animation: none; }
  }
  @keyframes g-stamp { from { opacity: 0; transform: scale(1.3); } }
  @keyframes g-mask { from { transform: translateY(105%); } }
  @keyframes g-draw { from { transform: scaleY(0); } }
  @keyframes g-rise { from { opacity: 0; transform: translateY(var(--rv-y)) scale(var(--rv-s)); } }
  @keyframes g-breath { 0%, 100% { opacity: 0; } 50% { opacity: 0.35; } }
</style>
