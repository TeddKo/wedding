<script lang="ts">
  import { onMount, tick } from "svelte";
  import { fade } from "svelte/transition";
  import { portal } from "../../../lib/portal";
  import { reduced } from "../../../lib/motion";
  import { BAT } from "./bat";

  /** 커버 유령([data-dresscode], 정적 마크업)을 누르면 드레스코드 카드가 유령 자리에서 흔들리며 날아와 펼쳐진다 */
  let open = $state(false);
  let ox = 0;
  let oy = 0;
  let closeBtn = $state<HTMLButtonElement>();
  let trigger: HTMLElement | null = null;

  onMount(() => {
    trigger = document.querySelector<HTMLElement>("[data-dresscode]");
    const show = () => {
      const r = trigger!.getBoundingClientRect();
      ox = r.left + r.width / 2;
      oy = r.top + r.height / 2;
      open = true;
    };
    trigger?.addEventListener("click", show);
    return () => trigger?.removeEventListener("click", show);
  });

  $effect(() => {
    if (!open) return;
    const cover = document.querySelector(".cover");
    cover?.classList.add("fx-paused");
    void tick().then(() => closeBtn?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      cover?.classList.remove("fx-paused");
    };
  });

  function close() {
    open = false;
    trigger?.focus({ preventScroll: true });
  }

  /** 유령처럼 좌우로 일렁이며 유령 위치에서 화면 중앙으로 떠오른다 */
  function boo(node: HTMLElement) {
    if (reduced()) return { duration: 160, css: (t: number) => `opacity:${t}` };
    const r = node.getBoundingClientRect();
    const dx = ox - (r.left + r.width / 2);
    const dy = oy - (r.top + r.height / 2);
    return {
      duration: 720,
      css: (t: number) => {
        const u = 1 - t;
        const e = 1 - u * u * u;
        const sway = Math.sin(t * Math.PI * 3) * u * 18;
        return `opacity:${Math.min(1, t * 2.2)};transform:translate(${dx * u + sway}px,${dy * u}px) scale(${0.18 + 0.82 * e}) rotate(${-10 * u}deg)`;
      },
    };
  }

  /** 닫힐 때는 연기처럼 부풀며 흩어진다 */
  function poof() {
    if (reduced()) return { duration: 120, css: (t: number) => `opacity:${t}` };
    return { duration: 280, css: (t: number) => `opacity:${t};transform:scale(${1 + (1 - t) * 0.12}) translateY(${(1 - t) * -14}px)` };
  }
  /** s 폭px, x/y 이동px, a 물결 진폭px, t 비행ms, dl 지연ms, f 반날갯짓ms, r 기울기deg */
  const BATS = [
    { s: 30, x: -168, y: -150, a: 18, t: 2200, dl: 480, f: 130, r: -14 },
    { s: 24, x: 156, y: -190, a: 14, t: 2500, dl: 560, f: 115, r: 12 },
    { s: 18, x: 132, y: -40, a: 10, t: 1900, dl: 640, f: 100, r: 8 },
    { s: 22, x: -140, y: -10, a: 12, t: 2100, dl: 720, f: 110, r: -8 },
    { s: 14, x: -70, y: -230, a: 8, t: 2800, dl: 820, f: 90, r: -4 },
    { s: 26, x: 84, y: -250, a: 16, t: 2400, dl: 920, f: 125, r: 10 },
  ];
</script>

{#if open}
  <div class="dc" use:portal>
    <div class="dc-bd" role="presentation" onclick={close} transition:fade={{ duration: reduced() ? 0 : 220 }}></div>
    <div class="dc-card" role="dialog" aria-modal="true" aria-labelledby="dc-t" aria-describedby="dc-b" in:boo out:poof>

      <button type="button" class="dc-x" bind:this={closeBtn} onclick={close} aria-label="닫기">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>

      <p class="dc-boo" aria-hidden="true">Boo!</p>
      <p class="dc-k">DRESS CODE</p>
      <h2 class="dc-t" id="dc-t">할로윈 코스튬</h2>
      <i class="dc-rule" aria-hidden="true"></i>
      <p class="dc-b" id="dc-b">
        이날만큼은 하객분들도 함께 변신해 주세요.
        <br />
        유령, 마녀, 뱀파이어… 무엇이든 환영이에요.
      </p>
      <p class="dc-s">망토 하나, 머리띠 하나로도 충분히 무섭답니다.</p>
    </div>
    <div class="dc-bats" aria-hidden="true">
      {#each BATS as b}
        <span class="dc-bat" style="--s:{b.s}px;--x:{b.x}px;--y:{b.y}px;--a:{b.a}px;--t:{b.t}ms;--dl:{b.dl}ms;--f:{b.f}ms;--n:{Math.ceil(b.t / b.f)};--r:{b.r}deg"><span class="dc-bat-y"><svg class="dc-bat-w" viewBox="0 0 40 16" focusable="false"><path d={BAT} /></svg></span></span>
      {/each}
    </div>
  </div>
{/if}

<style>
  .dc { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; padding: 24px; overflow: hidden; }
  .dc-bd { position: absolute; inset: 0; background: rgb(12 9 7 / 0.72); }
  .dc-card {
    position: relative; will-change: transform, opacity; width: min(320px, 100%); padding: 44px 24px 28px; text-align: center; color: var(--on-night);
    border-radius: 160px 160px 18px 18px; border: 1px solid rgb(var(--gold-rgb) / 0.55);
    background: radial-gradient(80% 50% at 50% 0%, rgb(224 144 74 / 0.22), transparent 70%), linear-gradient(var(--night-2), var(--night));
    box-shadow: inset 0 0 0 5px var(--night), inset 0 0 0 6px rgb(var(--gold-rgb) / 0.28), 0 24px 60px -18px rgb(0 0 0 / 0.7), 0 0 40px -6px rgb(224 144 74 / 0.35);
  }
  .dc-x {
    position: absolute; top: 80px; right: 26px; display: grid; place-items: center; width: 40px; height: 40px; padding: 0; border: 0; border-radius: 50%;
    background: rgb(var(--gold-rgb) / 0.1); color: var(--gold); cursor: pointer; -webkit-tap-highlight-color: transparent;
  }
  .dc-x svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
  .dc-x:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
  .dc-boo { margin: 0; font: italic 300 52px/1 var(--f-latin); color: var(--gold); text-shadow: 0 0 18px rgb(224 144 74 / 0.55); animation: dc-flicker 3.2s steps(1, end) 0.8s infinite; }
  .dc-k { margin: 14px 0 0; font: 400 12px/1 var(--f-latin); letter-spacing: 0.32em; margin-right: -0.32em; color: var(--on-night-2); }
  .dc-t { margin: 10px 0 0; font: 400 24px/1.3 var(--f-name); letter-spacing: 0.06em; color: var(--on-night); }
  .dc-rule { display: block; width: 1px; height: 28px; margin: 16px auto; background: linear-gradient(transparent, var(--gold)); }
  .dc-b { margin: 0; font: 400 14.5px/1.8 var(--f-body); color: var(--on-night); }
  .dc-s { margin: 14px 0 0; font: 400 12.5px/1.6 var(--f-body); color: var(--on-night-2); }

  .dc-bats { position: absolute; left: 50%; top: calc(50% - 100px); width: 0; height: 0; pointer-events: none; }
  .dc-bat { position: absolute; left: calc(var(--s) / -2); top: calc(var(--s) / -5); width: var(--s); animation: dc-bx var(--t) cubic-bezier(.33,0,.67,1) var(--dl) both; }
  .dc-bat-y { display: block; animation: dc-by var(--t) linear var(--dl) both; }
  .dc-bat-w { display: block; width: 100%; height: auto; fill: rgb(var(--gold-rgb) / .8); rotate: var(--r); transform-origin: 50% 40%; animation: dc-flap var(--f) ease-in-out var(--dl) var(--n) alternate; }
  @keyframes dc-bx { from { transform: translateX(0); } to { transform: translateX(var(--x)); } }
  @keyframes dc-by {
    0%   { opacity: 0; transform: translateY(0) scale(.3); animation-timing-function: cubic-bezier(.3,0,.5,1); }
    12%  { opacity: 1; }
    40%  { transform: translateY(calc(var(--y) * .35 - var(--a))) scale(.85); animation-timing-function: ease-in-out; }
    70%  { transform: translateY(calc(var(--y) * .7 + var(--a))) scale(1); animation-timing-function: ease-in-out; }
    85%  { opacity: 1; }
    100% { opacity: 0; transform: translateY(var(--y)) scale(1.05); }
  }
  @keyframes dc-flap { from { transform: scaleY(1); } to { transform: scaleY(.3); } }
  @keyframes dc-flicker { 0%, 100% { opacity: 1; } 47% { opacity: 0.55; } 49% { opacity: 1; } 51% { opacity: 0.7; } 53% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .dc-bats { display: none; }
    .dc-boo { animation: none; }
  }
</style>
