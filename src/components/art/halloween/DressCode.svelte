<script lang="ts">
  import { onMount, tick } from "svelte";
  import { fade } from "svelte/transition";
  import { portal } from "../../../lib/portal";
  import { reduced } from "../../../lib/motion";

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
    void tick().then(() => closeBtn?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
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
        return `opacity:${Math.min(1, t * 2.2)};filter:blur(${u * 6}px);transform:translate(${dx * u + sway}px,${dy * u}px) scale(${0.18 + 0.82 * e}) rotate(${-10 * u}deg)`;
      },
    };
  }

  /** 닫힐 때는 연기처럼 부풀며 흩어진다 */
  function poof() {
    if (reduced()) return { duration: 120, css: (t: number) => `opacity:${t}` };
    return { duration: 280, css: (t: number) => `opacity:${t};filter:blur(${(1 - t) * 8}px);transform:scale(${1 + (1 - t) * 0.12}) translateY(${(1 - t) * -14}px)` };
  }
</script>

{#if open}
  <div class="dc" use:portal>
    <div class="dc-bd" role="presentation" onclick={close} transition:fade={{ duration: reduced() ? 0 : 220 }}></div>
    <div class="dc-card" role="dialog" aria-modal="true" aria-labelledby="dc-t" aria-describedby="dc-b" in:boo out:poof>
      <svg class="dc-bat b1" viewBox="0 0 40 16" aria-hidden="true" focusable="false"><path d="M20 4c1-2 2-3 3-3 0 2 1 3 2 3 3-1 6-2 9-1 2 1 4 3 5 6-2-2-4-2-6-1-1 0-2 2-3 3-1-1-3-2-4-1-1 1-2 3-3 4-1-1-2-3-3-4-1-1-3 0-4 1-1-1-2-3-3-3-2-1-4-1-6 1 1-3 3-5 5-6 3-1 6 0 9 1 1 0 2-1 2-3 1 0 2 1 3 3Z" /></svg>
      <svg class="dc-bat b2" viewBox="0 0 40 16" aria-hidden="true" focusable="false"><path d="M20 4c1-2 2-3 3-3 0 2 1 3 2 3 3-1 6-2 9-1 2 1 4 3 5 6-2-2-4-2-6-1-1 0-2 2-3 3-1-1-3-2-4-1-1 1-2 3-3 4-1-1-2-3-3-4-1-1-3 0-4 1-1-1-2-3-3-3-2-1-4-1-6 1 1-3 3-5 5-6 3-1 6 0 9 1 1 0 2-1 2-3 1 0 2 1 3 3Z" /></svg>
      <svg class="dc-bat b3" viewBox="0 0 40 16" aria-hidden="true" focusable="false"><path d="M20 4c1-2 2-3 3-3 0 2 1 3 2 3 3-1 6-2 9-1 2 1 4 3 5 6-2-2-4-2-6-1-1 0-2 2-3 3-1-1-3-2-4-1-1 1-2 3-3 4-1-1-2-3-3-4-1-1-3 0-4 1-1-1-2-3-3-3-2-1-4-1-6 1 1-3 3-5 5-6 3-1 6 0 9 1 1 0 2-1 2-3 1 0 2 1 3 3Z" /></svg>

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
  </div>
{/if}

<style>
  .dc { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; padding: 24px; }
  .dc-bd { position: absolute; inset: 0; background: rgb(12 9 7 / 0.62); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
  .dc-card {
    position: relative; width: min(320px, 100%); padding: 44px 24px 28px; text-align: center; color: var(--on-night);
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

  .dc-bat { position: absolute; top: 34%; left: 50%; width: 30px; fill: rgb(var(--gold-rgb) / 0.75); pointer-events: none; opacity: 0; animation: dc-fly 1.4s cubic-bezier(0.2, 0.7, 0.3, 1) forwards; }
  .b1 { --tx: -150px; --ty: -150px; --r: -18deg; animation-delay: 380ms; }
  .b2 { --tx: 140px; --ty: -170px; --r: 16deg; width: 24px; animation-delay: 460ms; }
  .b3 { --tx: 120px; --ty: -60px; --r: 10deg; width: 18px; animation-delay: 540ms; }

  @keyframes dc-fly {
    0% { opacity: 0; transform: translate(-50%, 0) scale(0.4); }
    15% { opacity: 1; }
    40% { transform: translate(calc(-50% + var(--tx) * 0.4), calc(var(--ty) * 0.35)) scale(1, 0.6) rotate(var(--r)); }
    55% { transform: translate(calc(-50% + var(--tx) * 0.55), calc(var(--ty) * 0.5)) scale(1) rotate(var(--r)); }
    100% { opacity: 0; transform: translate(calc(-50% + var(--tx)), var(--ty)) scale(0.8) rotate(var(--r)); }
  }
  @keyframes dc-flicker { 0%, 100% { opacity: 1; } 47% { opacity: 0.55; } 49% { opacity: 1; } 51% { opacity: 0.7; } 53% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .dc-bat { display: none; }
    .dc-boo { animation: none; }
  }
</style>
