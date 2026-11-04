<script lang="ts">
  import { onMount } from "svelte";
  import { theme } from "../lib/theme.svelte";
  import { isTheme } from "../lib/themes";
  import { playBgm } from "../scripts/audio";
  import { reduced } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";
  import { ENTRY, loadDev } from "./intro/entry";
  import Picker from "./intro/Picker.svelte";

  let { groom, bride, date }: { groom: string; bride: string; date: string } = $props();

  let done = $state(false);
  let leaving = $state(false);
  let gate = $state<HTMLElement>();
  let openBtn = $state<HTMLButtonElement>();

  const timers: number[] = [];
  const chars = (s: string) => Array.from(s);

  onMount(() => {
    const html = document.documentElement;
    /* JS 가 느려 폴백 타이머가 이미 게이트를 걷어냈다면 인트로 생략 */
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
    /* dev 연출 모듈은 마운트 즉시 미리 받아 클릭 직후 지연 방지 */
    void loadDev();
    return () => timers.forEach(clearTimeout);
  });

  /**
   * 클릭 → ENTRY[테마].lift 에 stage.open(커버 안무 시작) → total 에 게이트 제거.
   * 연출 자체는 테마별 CSS(.leaving) 와 선택적 run() 이 담당. 모션 감소이면 즉시 열고 제거.
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
    const name = isTheme(html.dataset.theme) ? html.dataset.theme : theme.name;
    const { lift, total, run } = ENTRY[name];
    gate?.style.setProperty("--ig-lift", `${lift}ms`);
    gate?.style.setProperty("--ig-total", `${total}ms`);
    /* run 이 있으면 끝나는 즉시 제거, total 은 멈춤 방지용 최대 대기 */
    const finish = () => (done = true);
    if (gate) run?.({ gate }).catch(() => {}).then(finish);
    timers.push(window.setTimeout(reveal, lift));
    timers.push(window.setTimeout(finish, total));
  }
</script>

{#if !done}
  <div bind:this={gate} class="gate" class:leaving role="dialog" aria-modal="true" aria-label="청첩장 인트로">
    <div class="ig-bg" aria-hidden="true">
      <div class="ig-halloween" data-th="halloween">
        <i class="ig-door ig-door-l"><svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false"><path pathLength="1" d="M0 100V56C0 30 52 14 100 3" /><path pathLength="1" d="M16 100V62C16 42 58 28 100 15" /></svg></i>
        <i class="ig-door ig-door-r"><svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false"><path pathLength="1" d="M0 100V56C0 30 52 14 100 3" /><path pathLength="1" d="M16 100V62C16 42 58 28 100 15" /></svg></i>
        <i class="ig-seam"></i>
        <i class="ig-ember" style:--y="38%" style:--d="0ms"></i><i class="ig-ember" style:--y="46%" style:--d="70ms"></i><i class="ig-ember" style:--y="52%" style:--d="140ms"></i><i class="ig-ember" style:--y="58%" style:--d="210ms"></i><i class="ig-ember" style:--y="66%" style:--d="280ms"></i>
      </div>
      <div class="ig-puppy" data-th="puppy">
        <i class="ig-body"></i>
        <i class="ig-flap"><i class="ig-flap-f"><svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false"><path d="M0 0H100L50 100Z" /></svg></i><i class="ig-flap-b"><svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false"><path d="M0 0H100L50 100Z" /></svg></i></i>
      </div>
      <div class="ig-term" data-th="dev">
        <p class="tm-row"><span class="tm-p">$</span><span class="tm-cw"><span class="tm-cmd">git checkout -b wedding</span><i class="tm-cur"></i></span></p>
        <p class="tm-out"><i class="tm-line"></i><i class="tm-node"></i><span>Switched to a new branch 'wedding'</span></p>
      </div>
      <i class="ig-scan" data-th="dev"></i>
    </div>
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
      <button bind:this={openBtn} type="button" class="ig-cta" onclick={openGate} aria-label="초대장 열기">
        <span class="ig-face ig-face-h" data-th="halloween" aria-hidden="true">
          <svg viewBox="0 0 168 52" focusable="false"><defs><linearGradient id="ig-wax" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a95b34" /><stop offset="1" stop-color="#86391a" /></linearGradient></defs><path d="M8 9H62L84 1L106 9H160Q168 9 168 17V44Q168 52 160 52H8Q0 52 0 44V17Q0 9 8 9Z" /></svg>
          <span class="ig-lbl"><svg class="ig-flame" viewBox="0 0 8 12" focusable="false"><path d="M4 0C5 3.500 8 5.500 8 8.200 8 10.400 6.200 12 4 12S0 10.400 0 8.200C0 6.300 1.200 5.400 2 4c.4 1 .8 1.400 1.300 1.600C3.100 3.800 3.400 1.800 4 0Z" /></svg>초대장 열기</span>
        </span>
        <span class="ig-face ig-face-p" data-th="puppy" aria-hidden="true">
          <i class="ig-str ig-str-l"></i><i class="ig-str ig-str-r"></i>
          <span class="ig-tag"><svg viewBox="0 0 172 54" focusable="false"><path d="M27 1H171L157 27L171 53H27A26 26 0 0 1 27 1Z" /></svg><span class="ig-lbl"><i class="ig-dot"></i>초대장 열기</span></span>
        </span>
        <span class="ig-face ig-face-d" data-th="dev" aria-hidden="true">
          <span class="ig-lbl"><b>$</b> git checkout wedding<i class="ig-cur"></i></span><kbd>⏎</kbd>
        </span>
      </button>
      <Picker />
    </div>
  </div>
{/if}

<style>
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .gate {
    position: fixed; inset: 0; z-index: 100; display: none; flex-direction: column; align-items: center; justify-content: space-between;
    padding: 0 40px calc(48px + env(safe-area-inset-bottom)); color: var(--ink); text-align: center;
    box-shadow: 0 1px 0 var(--line);
  }
  :global(html.js) .gate { display: flex; }
  .mid { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 24px; }
  .intro-emblem { margin-bottom: 40px; }
  .intro-emblem:empty { margin-bottom: 0; }
  .eyebrow { overflow: clip; padding-block: 0.14em; margin: -0.14em 0 28px; font: 400 14px/1.4 var(--f-latin); text-transform: uppercase; letter-spacing: 0.14em; color: var(--accent-text); }
  .mi { display: block; }
  .names { display: flex; flex-direction: column; gap: 0; margin: 0; font: 700 20px/28px var(--f-name); letter-spacing: 0.6em; padding-left: 0.6em; }
  .ch { display: inline-block; }
  .hair { display: block; width: 1px; height: 48px; margin: 28px 0; background: var(--ink-3); transform-origin: 50% 50%; }
  .date { margin: 0; font: 400 15px/1.7 var(--f-name); letter-spacing: 0.05em; color: var(--ink-2); }

  .bottom { display: flex; flex-direction: column; align-items: center; gap: 20px; padding-bottom: 14px; }
  @media (prefers-reduced-motion: no-preference) {
    .intro-emblem { animation: g-stamp 360ms var(--e-out) backwards; }
    .eyebrow .mi { animation: g-mask var(--rv-dur) var(--rv-ease) 180ms backwards; }
    .ch { animation: rv-ch var(--t3) var(--rv-ease) calc(320ms + var(--i) * var(--st-ch)) backwards; }
    :global([data-theme="halloween"]) .ch { animation-name: rv-ch-candle; animation-duration: 900ms; }
    :global([data-theme="puppy"]) .ch { animation-name: rv-ch-soft; animation-duration: 800ms; animation-timing-function: var(--e-out); }
    :global([data-theme="dev"]) .ch { animation: rv-step 1ms steps(1, end) calc(320ms + var(--i) * var(--st-ch)) backwards; }
    .hair { animation: g-draw 700ms var(--e-io) 700ms backwards; }
    .date { animation: g-rise var(--rv-dur) var(--rv-ease) 900ms backwards; }
    :global(.ig-cta) { animation: g-rise var(--rv-dur) var(--rv-ease) 1100ms backwards; }
    :global(.ig-pick) { animation: g-rise var(--rv-dur) var(--rv-ease) 1250ms backwards; }
    .leaving .intro-emblem, .leaving .eyebrow .mi, .leaving .ch, .leaving .hair, .leaving .date, .leaving :global(.ig-cta), .leaving :global(.ig-pick) { animation: none; }
  }
  @keyframes g-stamp { from { opacity: 0; transform: scale(1.3); } }
  @keyframes g-mask { from { transform: translateY(105%); } }
  @keyframes g-draw { from { transform: scaleY(0); } }
  @keyframes g-rise { from { opacity: 0; transform: translateY(var(--rv-y)) scale(var(--rv-s)); } }
</style>
