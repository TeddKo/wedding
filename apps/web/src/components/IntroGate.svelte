<script lang="ts">
  import { onMount } from "svelte";
  import { theme } from "../lib/theme.svelte";
  import { isTheme } from "../lib/themes";
  import { playBgm, primeBgm } from "../scripts/audio";
  import { reduced } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";
  import { ENTRY, loadDev, loadHalloween } from "./intro/entry";
  import Seal from "./intro/Seal.svelte";
  import { BAT } from "./art/halloween/bat";
  import ghost from "../assets/illus/halloween/ghost-peek.svg?raw";

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
    void loadHalloween();
    return () => timers.forEach(clearTimeout);
  });

  /**
   * 클릭 → ENTRY[테마].lift 에 stage.open(커버 안무 시작) → total 에 게이트 제거.
   * 연출 자체는 테마별 CSS(.leaving) 와 선택적 run() 이 담당. 모션 감소이면 즉시 열고 제거.
   */
  function openGate() {
    if (leaving) return;
    leaving = true;
    primeBgm();
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
      playBgm();
      return;
    }
    const name = isTheme(html.dataset.theme) ? html.dataset.theme : theme.name;
    const { lift, total, run } = ENTRY[name];
    gate?.style.setProperty("--ig-lift", `${lift}ms`);
    gate?.style.setProperty("--ig-total", `${total}ms`);
    /* run 이 있으면 끝나는 즉시 제거, total 은 멈춤 방지용 최대 대기 */
    /* 연출이 모두 끝나 본문에 진입한 시점부터 배경음악 재생 */
    const finish = () => {
      if (done) return;
      done = true;
      playBgm();
    };
    if (gate) run?.({ gate }).catch(() => {}).then(finish);
    timers.push(window.setTimeout(reveal, lift));
    timers.push(window.setTimeout(finish, total));
  }
</script>

{#if !done}
  <div bind:this={gate} class="gate" class:leaving role="dialog" aria-modal="true" aria-label="청첩장 인트로">
    <div class="ig-bg" aria-hidden="true">
      <div class="ig-halloween" data-th="halloween">
        <i class="ig-frame"></i>
        <i class="ig-moon"></i>
        <svg class="ig-bat ig-bat-1" viewBox="0 0 40 14" focusable="false"><path d={BAT} /></svg>
        <svg class="ig-bat ig-bat-2" viewBox="0 0 40 14" focusable="false"><path d={BAT} /></svg>
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
      <div class="intro-emblem" data-th="halloween" aria-hidden="true"><span class="ig-ghost"><span class="hw-body"><i class="hw-glow"></i>{@html ghost}</span></span></div>
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
          <span class="ig-env">
            <i class="ig-env-back"></i><i class="ig-in"></i>
            <i class="ig-sides"><i class="ig-side ig-side-l"></i><i class="ig-side ig-side-r"></i><i class="ig-side ig-side-b"></i></i>
            <i class="ig-hflapw"><i class="ig-hflap"></i></i>
            <i class="ig-seal-glow"></i><Seal />
          </span>
          <span class="ig-lbl">초대장 열기</span>
        </span>
        <span class="ig-face ig-face-p" data-th="puppy" aria-hidden="true">
          <i class="ig-str ig-str-l"></i><i class="ig-str ig-str-r"></i>
          <span class="ig-tag"><svg viewBox="0 0 172 54" focusable="false"><path d="M27 1H171L157 27L171 53H27A26 26 0 0 1 27 1Z" /></svg><span class="ig-lbl"><i class="ig-dot"></i>초대장 열기</span></span>
        </span>
        <span class="ig-face ig-face-d" data-th="dev" aria-hidden="true">
          <span class="ig-lbl"><b>$</b> git checkout wedding<i class="ig-cur"></i></span><kbd>⏎</kbd>
        </span>
      </button>
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
  /* 높이가 모자라는 화면에서도 봉투까지 스크롤로 도달 보장 */
  .gate { overflow-y: auto; overscroll-behavior: contain; }
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
  /* 낮은 세로 화면: 간격 축소 */
  @media (max-height: 720px) {
    .gate { padding-bottom: calc(24px + env(safe-area-inset-bottom)); }
    .intro-emblem { margin-bottom: 20px; }
    .eyebrow { margin-bottom: 18px; }
    .hair { height: 28px; margin: 16px 0; }
  }
  /* 모바일 가로: 글귀 좌측 + 봉투 우측 2열 */
  @media (orientation: landscape) and (max-height: 540px) {
    .gate { flex-direction: row; justify-content: center; align-items: center; gap: clamp(28px, 7vw, 96px); padding: 16px max(32px, env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) max(32px, env(safe-area-inset-left)); }
    .mid { flex: 0 1 auto; padding-top: 0; }
    .intro-emblem { margin-bottom: 12px; }
    .eyebrow { margin-bottom: 12px; }
    .hair { height: 18px; margin: 10px 0; }
    .date { white-space: nowrap; font-size: 14px; }
    .bottom { padding-bottom: 0; }
  }
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
    .leaving .intro-emblem, .leaving .eyebrow .mi, .leaving .ch, .leaving .hair, .leaving .date, .leaving :global(.ig-cta) { animation: none; }
  }
  @keyframes g-stamp { from { opacity: 0; transform: scale(1.3); } }
  @keyframes g-mask { from { transform: translateY(105%); } }
  @keyframes g-draw { from { transform: scaleY(0); } }
  @keyframes g-rise { from { opacity: 0; transform: translateY(var(--rv-y)) scale(var(--rv-s)); } }
</style>
