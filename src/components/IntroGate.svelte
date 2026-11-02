<script lang="ts">
  import { onMount } from "svelte";
  import { Spring, Tween } from "svelte/motion";
  import { fade } from "svelte/transition";
  import { cubicOut, cubicInOut, quartOut } from "svelte/easing";
  import Moon from "./ui/Moon.svelte";
  import Bat from "./ui/Bat.svelte";
  import Dogs from "./ui/Dogs.svelte";
  import GitGraph from "./ui/GitGraph.svelte";
  import { setTheme, theme } from "../lib/theme.svelte";
  import { THEMES, THEME_NAMES } from "../lib/themes";
  import { playBgm } from "../scripts/audio";
  import { reduced, rand } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";

  let { groom, bride }: { groom: string; bride: string } = $props();

  type Phase = "idle" | "peel" | "open";
  let phase = $state<Phase>("idle");
  let done = $state(false);
  let seal = $state<HTMLButtonElement>();

  const door = new Spring(0, { stiffness: 0.035, damping: 0.4 });
  const bloom = new Tween(0, { duration: 1300, easing: cubicOut });
  /* 인장 연출 시계(0..1 = FLY_MS). 박리 -> 베일 -> 비행 전부 이 값의 시간 함수 */
  const FLY_MS = 1300;
  const clk = new Tween(0, { duration: FLY_MS, easing: (x) => x });
  const lift = new Spring(0, { stiffness: 0.14, damping: 0.32 });
  const uid = $props.id();
  const moonLift = new Tween(0, { duration: 1400, easing: quartOut });

  /* 문이 열릴 때 흩어지는 것: 할로윈=박쥐, dev=코드 조각, puppy=발자국/하트 */
  const GLYPHS = ["+", "−", "+", "−", "+", "−", "+", "−"];
  type BatSpec = { dx: number; dy: number; rot: number; size: number; delay: number; dur: number; flap: number; kind: string; glyph: string };
  let bats = $state<BatSpec[]>([]);

  const wait = (ms: number) => new Promise<void>((res) => setTimeout(res, reduced() ? 0 : ms));

  onMount(() => {
    const html = document.documentElement;
    /* JS 가 느려 폴백 타이머가 이미 게이트를 걷어냈다면 인트로는 건너뛴다 */
    if (!html.classList.contains("js")) {
      done = true;
      stage.open = true;
      return;
    }
    stage.gate = true;
    html.dataset.gate = "ready";
    for (const el of document.querySelectorAll("main, footer")) el.setAttribute("inert", "");
    seal?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
  });

  async function openGate() {
    if (phase !== "idle") return;
    playBgm();
    const html = document.documentElement;
    if (reduced()) return finish(html);
    phase = "peel";
    lift.target = 1;
    clk.target = 1;
    await wait(850);
    phase = "open";
    door.target = 98;
    moonLift.target = 1;
    bats = Array.from({ length: 18 }, (_, i) => {
      const side = i % 2 ? 1 : -1;
      return {
        dx: side * rand(60, 190) + rand(-60, 60) + (side > 0 ? 260 : -260),
        dy: -rand(160, 720),
        rot: rand(-25, 25),
        size: rand(40, 84),
        delay: i * 55 + rand(0, 90),
        dur: rand(1500, 2600),
        flap: rand(0.14, 0.26),
        kind: theme.name,
        glyph: theme.name === "dev" ? GLYPHS[i % GLYPHS.length] : i % 3 ? "paw" : "heart",
      };
    });
    await wait(500);
    bloom.target = 1;
    await wait(950);
    finish(html);
  }

  function finish(html: HTMLElement) {
    html.classList.remove("gated");
    stage.open = true;
    done = true;
    for (const el of document.querySelectorAll("main, footer")) el.removeAttribute("inert");
    const main = document.querySelector<HTMLElement>("main");
    main?.setAttribute("tabindex", "-1");
    main?.focus({ preventScroll: true });
  }

  const doorShade = $derived(Math.min(0.85, door.current / 80));

  const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
  const smooth = (x: number) => (x = clamp01(x)) * x * (3 - 2 * x);

  /* 비행 경로: 달 쪽으로 오르는 완만한 S 곡선 + 약한 회전 + 축소 */
  function flight(ms: number) {
    const e = cubicInOut(clamp01((ms - 260) / 1000));
    return {
      x: Math.sin(e * Math.PI * 2) * 46 * (0.4 + 0.6 * e),
      y: -e * 54,
      s: 1 - e * 0.72,
      r: Math.sin(e * Math.PI * 2 - 0.5) * 14 + e * 40,
      o: 1 - smooth((e - 0.82) / 0.18),
    };
  }

  /* 베일 밑단: 레이스 스캘럽이 위상에 따라 출렁인다 */
  function veilPath(ph: number, trail: number, amp: number) {
    const H = 138 + trail * 34;
    const n = 7, w = 134 / n;
    const wv = (i: number) => Math.sin(ph + i * 0.9) * amp;
    let d = `M75 16C38 18 10 60 8 ${(H + wv(0)).toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      d += `Q${(8 + w * (i + 0.5)).toFixed(1)} ${(H + 14 + wv(i + 0.5)).toFixed(1)} ${(8 + w * (i + 1)).toFixed(1)} ${(H + wv(i + 1)).toFixed(1)}`;
    }
    return d + "C140 60 112 18 75 16Z";
  }

  const ms = $derived(clk.current * FLY_MS);
  const fl = $derived(flight(ms));
  const vx = $derived(flight(ms + 16).x - fl.x);
  const trail = $derived(clamp01(Math.hypot(vx, flight(ms + 16).y - fl.y) / 1.4));
  const drape = $derived(smooth((ms - 120) / 350));
  const veilD = $derived(veilPath(ms / 85, trail, 2 + trail * 6));
  const sparks = [0.18, 0.3, 0.42, 0.54, 0.66, 0.78].map((p, i) => ({ ms: 260 + p * 1000, dx: (i % 2 ? 1 : -1) * (10 + i * 4), dy: 8 + i * 5 }));
</script>

{#if !done}
  <div
    class="gate"
    class:going={phase !== "idle"}
    role="dialog"
    aria-modal="true"
    aria-label="청첩장 인트로"
    out:fade={{ duration: reduced() ? 0 : 700 }}
  >
    <div class="mist m1"></div>
    <div class="mist m2"></div>

    <div class="hall" style:opacity={Math.min(1, door.current / 40)}></div>

    <div class="stage3d">
      <div class="door l" style:transform="rotateY({door.current}deg)">
        <i class="panel"></i><i class="ring"></i>
        <b class="shade" style:opacity={doorShade}></b>
      </div>
      <div class="door r" style:transform="rotateY({-door.current}deg)">
        <i class="panel"></i><i class="ring"></i>
        <b class="shade" style:opacity={doorShade}></b>
      </div>
    </div>

    <div class="moon" style:transform="translate3d(-50%, {-moonLift.current * 60}px, 0)" style:opacity={1 - moonLift.current}>
      <span data-th="halloween"><Moon /></span>
      <span data-th="dev"><GitGraph /></span>
      <span data-th="puppy"><Dogs /></span>
    </div>

    <p class="top" class:gone={phase !== "idle"}>
      <span data-th="halloween" class="t-hal">You are cordially invited</span>
      <span data-th="dev" class="t-dev">~/wedding (main) $ git merge {bride}</span>
      <span data-th="puppy" class="t-pup">같이 걷는 날에 초대해요</span>
    </p>

    <div class="center">
      <button bind:this={seal} type="button" class="seal" aria-label="초대장 열기" onclick={openGate}>
        <span class="residue" style:opacity={smooth((ms - 80) / 200) * 0.38 * (1 - bloom.current)}></span>
        {#each sparks as sp}
          {@const f = flight(sp.ms)}
          {@const age = clamp01((ms - sp.ms) / 450)}
          {#if ms > sp.ms}
            <i class="spark" style:transform="translate3d({f.x + sp.dx * age}px, {f.y * 5.4 + sp.dy * age}px, 0) scale({1 - age * 0.6})" style:opacity={1 - age}></i>
          {/if}
        {/each}
        <span class="fly" style:transform="translate3d({fl.x}px, {fl.y}vh, 0) rotate({fl.r}deg) scale({fl.s})" style:opacity={fl.o}>
          <span class="curl" style:opacity={Math.min(1, lift.current) * 0.7}></span>
          <span class="peel" style:transform="perspective(420px) rotateX({-34 * lift.current}deg) rotateY({-26 * lift.current}deg) scale({1 + 0.05 * lift.current})">
            <svg class="wax" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
              <defs>
                <radialGradient id="wax-{uid}" cx="38%" cy="32%" r="80%">
                  <stop offset="0" stop-color="#d9742c" />
                  <stop offset="0.55" stop-color="#8a3f12" />
                  <stop offset="1" stop-color="#4a1f08" />
                </radialGradient>
              </defs>
              <g data-th="halloween">
              <path
                d="M60 6c15 0 24 6 36 13s19 19 17 35-3 27-13 39-25 21-40 21-27-7-37-19S4 76 8 58 21 24 35 14 45 6 60 6Z"
                fill="url(#wax-{uid})"
              />
              <circle cx="60" cy="60" r="38" fill="none" stroke="#c9a45c" stroke-width="1.6" stroke-dasharray="2 3" opacity="0.8" />
              <circle cx="60" cy="60" r="31" fill="none" stroke="#c9a45c" stroke-width="1" opacity="0.55" />
              <text x="60" y="68" text-anchor="middle" font-family="IM Fell English, serif" font-size="26" font-weight="600" fill="#e8c985" letter-spacing="1">{groom[0]}{bride[0]}</text>
              </g>
              <g data-th="dev">
                <rect x="10" y="16" width="100" height="94" rx="16" fill="#c9d1dc" />
                <rect x="10" y="12" width="100" height="94" rx="16" fill="#ffffff" stroke="#c9d1dc" stroke-width="1.500" />
                <text x="60" y="54" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="24" font-weight="500" fill="#1d2433">{groom[0]}{bride[0]}</text>
                <text x="60" y="84" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="14" fill="#5b6476">Enter</text>
              </g>
              <g data-th="puppy">
                <ellipse cx="60" cy="76" rx="32" ry="27" fill="#ee7e98" />
                <ellipse cx="25" cy="44" rx="11" ry="14" transform="rotate(-24 25 44)" fill="#ee7e98" />
                <ellipse cx="47" cy="25" rx="11" ry="14" transform="rotate(-8 47 25)" fill="#ee7e98" />
                <ellipse cx="73" cy="25" rx="11" ry="14" transform="rotate(8 73 25)" fill="#ee7e98" />
                <ellipse cx="95" cy="44" rx="11" ry="14" transform="rotate(24 95 44)" fill="#ee7e98" />
                <text x="60" y="85" text-anchor="middle" font-family="Jua, serif" font-size="26" font-weight="700" fill="#fff">{groom[0]}{bride[0]}</text>
              </g>
            </svg>
          </span>
          <svg class="veil" viewBox="0 0 150 190" aria-hidden="true" focusable="false" style:opacity={drape} style:transform="translate3d(0, {(1 - drape) * -22}px, 0) skewX({-vx * 1.1}deg) scaleY({0.6 + 0.4 * drape})">
            <defs>
              <linearGradient id="vl-{uid}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#fffaf0" stop-opacity="0.92" />
                <stop offset="1" stop-color="#fffaf0" stop-opacity="0.5" />
              </linearGradient>
            </defs>
            <path d={veilD} fill="url(#vl-{uid})" stroke="#fffaf0" stroke-opacity="0.85" stroke-width="1.2" stroke-linejoin="round" />
            <path d={veilD} fill="none" stroke="#fffaf0" stroke-opacity="0.7" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="0.1 4.2" transform="translate(0 -5)" />
            <path d="M55 31 L59 21 L67 27 L75 15 L83 27 L91 21 L95 31" fill="rgb(var(--glow-rgb) / 0.35)" stroke="#f0cf86" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" />
            <circle cx="75" cy="13" r="2" fill="#fff4d6" />
            <circle cx="59" cy="20" r="1.4" fill="#fff4d6" />
            <circle cx="91" cy="20" r="1.4" fill="#fff4d6" />
          </svg>
        </span>
      </button>
      <p class="names" class:gone={phase !== "idle"}><span data-th="halloween dev">{groom} &amp; {bride}</span><span data-th="puppy">{groom} 그리고 {bride}</span></p>
      <p class="cta" class:gone={phase !== "idle"}>
        <span data-th="halloween">인장을 눌러 초대장을 열어 주세요</span>
        <span data-th="dev">Enter 를 눌러 열기</span>
        <span data-th="puppy">발바닥을 눌러 열어 주세요</span>
      </p>
      <div class="pick" class:gone={phase !== "idle"} role="group" aria-label="초대장 분위기 고르기">
        {#each THEME_NAMES as k (k)}
          <button type="button" class="opt" aria-pressed={theme.name === k} disabled={phase !== "idle"} onclick={() => setTheme(k)}>{THEMES[k].label}</button>
        {/each}
      </div>
    </div>

    <div class="bats" aria-hidden="true">
      {#each bats as b, i (i)}
        <span class="bx" style:--dx="{b.dx}px" style:--dur="{b.dur}ms" style:animation-delay="{b.delay}ms">
          <span class="by" style:--dy="{b.dy}px" style:--rot="{b.rot}deg" style:--s={b.size / 56} style:--flap="{b.flap}s" style:animation-delay="{b.delay}ms" style:animation-duration="{b.dur}ms">
            {#if b.kind === "dev"}
              <i class="glyph">{b.glyph}</i>
            {:else if b.kind === "puppy"}
              <svg class="pup" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                {#if b.glyph === "paw"}
                  <g fill="#e98aa0"><ellipse cx="16" cy="21" rx="8" ry="7" /><circle cx="7" cy="12" r="3.4" /><circle cx="13" cy="7" r="3.4" /><circle cx="19" cy="7" r="3.4" /><circle cx="25" cy="12" r="3.4" /></g>
                {:else}
                  <path d="M16 28S3 20 3 11a6.5 6.5 0 0 1 13-2 6.5 6.5 0 0 1 13 2c0 9-13 17-13 17z" fill="#f4a3b4" />
                {/if}
              </svg>
            {:else}
              <Bat />
            {/if}
          </span>
        </span>
      {/each}
    </div>

    <div class="bloom" style:opacity={Math.min(1, bloom.current * 1.6)} style:transform="translate(-50%, -50%) scale({0.04 + bloom.current * 1.2})"></div>
  </div>
{/if}

<style>
  .gate {
    position: fixed; inset: 0; z-index: 100; display: none; overflow: hidden;
    background: var(--gate-bg);
    perspective: 1200px;
  }
  :global(html.js) .gate { display: block; }

  .mist { position: absolute; width: 140%; height: 50%; left: -20%; border-radius: 50%; filter: blur(40px); opacity: 0.35; background: radial-gradient(closest-side, var(--gate-mist-a), transparent); animation: mist 22s ease-in-out infinite alternate; }
  .m1 { top: 6%; }
  .m2 { bottom: -6%; animation-duration: 28s; animation-direction: alternate-reverse; background: radial-gradient(closest-side, var(--gate-mist-b), transparent); }
  @keyframes mist { to { transform: translate3d(8%, 3%, 0) scale(1.1); } }

  .hall {
    position: absolute; inset: 0;
    background: var(--gate-hall);
  }
  .stage3d { position: absolute; inset: 0; transform-style: preserve-3d; z-index: 3; pointer-events: none; }
  .door {
    position: absolute; top: 0; bottom: 0; width: 50%;
    background: var(--gate-door);
    backface-visibility: hidden; will-change: transform;
  }
  .l { left: 0; transform-origin: 0 50%; border-right: 1px solid rgb(var(--gold-rgb) / 0.6); }
  .r { right: 0; transform-origin: 100% 50%; border-left: 1px solid rgb(var(--gold-rgb) / 0.6); }
  .panel {
    position: absolute; inset: 9% 12% 9%; border: 1px solid rgb(var(--gold-rgb) / 0.45); border-radius: var(--door-r, 999px 999px 4px 4px);
    box-shadow: inset 0 0 0 6px rgb(var(--bg-rgb)), inset 0 0 0 7px rgb(var(--gold-rgb) / 0.2);
  }
  .ring { position: absolute; top: 50%; width: 12px; height: 12px; margin-top: -6px; border-radius: 50%; border: 1px solid var(--gold); }
  .l .ring { right: 14px; } .r .ring { left: 14px; }
  .shade { position: absolute; inset: 0; background: #000; pointer-events: none; }

  .moon {
    position: absolute; top: 8vh; left: 50%; width: min(44vw, 180px); aspect-ratio: 1; z-index: 4; pointer-events: none;
    filter: drop-shadow(0 0 28px rgb(242 232 213 / 0.45)); will-change: transform, opacity;
  }
  .moon > span, .moon :global(svg) { width: 100%; height: 100%; display: block; }

  .t-hal { font: italic 18px/1.4 var(--f-latin); }
  .t-dev { font: 13px/1.4 var(--f-mono); color: var(--ink-2); }
  .t-pup { font: 17px/1.4 var(--f-display); color: var(--ink-2); }
  :global([data-theme="halloween"]) .moon { filter: none; }
  :global([data-theme="dev"]) .moon, :global([data-theme="puppy"]) .moon { filter: none; }
  :global([data-theme="puppy"]) .moon { width: min(64vw, 240px); aspect-ratio: 240 / 180; }
  :global([data-theme="puppy"]) .top { top: calc(8vh + min(64vw, 240px) * 0.75 + 18px); }
  :global([data-theme="dev"]) .seal { filter: none; }
  .top { position: absolute; top: calc(8vh + min(44vw, 180px) + 18px); left: 0; right: 0; text-align: center; z-index: 5; transition: opacity 0.4s; text-shadow: 0 0 10px var(--gate-ink-shadow); }
  .center { position: absolute; inset: 0; padding-top: 20vh; z-index: 7; display: grid; place-items: center; align-content: center; pointer-events: none; }
  .seal { pointer-events: auto; position: relative; width: 112px; height: 112px; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 50%; animation: beat 2.6s ease-in-out infinite; filter: drop-shadow(0 6px 14px rgb(0 0 0 / 0.65)); -webkit-tap-highlight-color: transparent; outline: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
  .seal:focus-visible { outline: 2px solid rgb(var(--glow-rgb)); outline-offset: 8px; }
  @keyframes beat { 50% { transform: scale(1.06); filter: drop-shadow(0 6px 14px rgb(0 0 0 / 0.65)) drop-shadow(0 0 16px rgb(var(--accent-rgb) / 0.55)); } }
  .going .seal { animation: none; }
  .fly, .residue, .spark, .curl, .peel, .veil { position: absolute; display: block; pointer-events: none; }
  .fly { inset: 0; will-change: transform, opacity; transform-origin: 50% 50%; }
  .peel { inset: 0; transform-origin: 12% 88%; will-change: transform; }
  .wax { width: 100%; height: 100%; display: block; }
  .curl { inset: 4px; border-radius: 50%; transform: translate3d(12px, 12px, 0); background: radial-gradient(closest-side, rgb(0 0 0 / 0.7), transparent); filter: blur(5px); opacity: 0; }
  .veil { left: -19px; top: -30px; width: 150px; height: 190px; overflow: visible; transform-origin: 50% 8%; will-change: transform, opacity; filter: drop-shadow(0 2px 6px rgb(255 250 240 / 0.35)); }
  :global([data-theme="puppy"]) .veil { filter: drop-shadow(0 1px 4px rgb(150 100 70 / 0.55)); }
  .residue { inset: 8px; border-radius: 50%; opacity: 0; background: radial-gradient(closest-side, var(--residue) 55%, transparent 80%, transparent); }
  .spark { left: 50%; top: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px; background: #fff4d6; clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%); filter: drop-shadow(0 0 4px #f6d27a); }

  .names { margin-top: 26px; font-size: 24px; font-family: var(--f-display); letter-spacing: 0.02em; transition: opacity 0.35s; text-shadow: 0 0 10px var(--gate-ink-shadow); }
  .cta { margin-top: 6px; color: var(--ink-2, var(--ivory-dim)); letter-spacing: 0; font-size: 14px; transition: opacity 0.35s; }
  .pick { pointer-events: auto; margin-top: 36px; display: inline-flex; gap: 4px; padding: 4px; border-radius: 999px; border: 1px solid rgb(var(--gold-rgb) / 0.35); background: rgb(var(--bg-rgb) / 0.6); transition: opacity 0.35s; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
  .opt {
    min-height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: none; color: var(--ivory-dim);
    font: inherit; font-size: 14px; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background 0.2s, color 0.2s;
  }
  .opt[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); }
  .opt:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .gone.pick { pointer-events: none; }
  @keyframes blink { 50% { opacity: 0.55; } }
  .gone { opacity: 0; animation: none; }

  .bats { position: absolute; left: 50%; top: 50%; z-index: 9; pointer-events: none; }
  .bx { position: absolute; left: 0; top: 0; animation: bx var(--dur) cubic-bezier(0.3, 0.1, 0.5, 1) both; }
  .by { position: absolute; left: -28px; top: -14px; width: 56px; transform-origin: 50% 50%; display: block; animation: by var(--dur) cubic-bezier(0.2, 0.7, 0.4, 1) both; }
  .by :global(svg) { width: 100%; display: block; color: #06030a; filter: drop-shadow(0 0 2px rgb(240 207 134 / 0.8)); animation: flap var(--flap) ease-in-out infinite alternate; transform-origin: center; }
  @keyframes bx { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(var(--dx), 0, 0); } }
  @keyframes by {
    0% { transform: translate3d(0, 0, 0) scale(0.15) rotate(0); opacity: 0; }
    12% { opacity: 1; }
    100% { transform: translate3d(0, var(--dy), 0) scale(var(--s)) rotate(var(--rot)); opacity: 1; }
  }
  @keyframes flap { to { transform: scaleY(0.55); } }
  .glyph { display: block; text-align: center; font: 500 26px/1 var(--f-mono); font-style: normal; color: var(--groom); white-space: nowrap; }
  .glyph:nth-child(odd) { color: var(--bride); }
  .by .pup { animation-name: wiggle; filter: drop-shadow(0 1px 2px rgb(var(--shade-rgb) / 0.3)); }
  @keyframes wiggle { from { transform: rotate(-14deg); } to { transform: rotate(14deg); } }

  .bloom {
    position: absolute; left: 50%; top: 50%; width: 150vmax; height: 150vmax; border-radius: 50%; z-index: 6; pointer-events: none; will-change: transform, opacity;
    background: var(--gate-bloom);
  }

  @media (prefers-reduced-motion: reduce) {
    .mist, .seal, .cta, .bx, .by, .by :global(svg) { animation: none; }
  }
</style>
