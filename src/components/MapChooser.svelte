<script lang="ts">
  import { onMount, tick } from "svelte";
  import { Spring } from "svelte/motion";
  import { fly } from "svelte/transition";
  import { reduced } from "../lib/motion";
  import { portal } from "../lib/portal";
  import { detect, type Platform } from "../lib/platform";
  import { mapApps, type MapApp, type Venue } from "../lib/maps";

  let { venue }: { venue: Venue } = $props();

  let plat = $state<Platform>({ os: "desktop", mac: false, kakao: false });
  let apps = $state<MapApp[]>([]);
  let open = $state(false);
  let closing = false;
  let btn: HTMLButtonElement;
  let ripples = $state<{ id: number; x: number; y: number; d: number }[]>([]);
  let seq = 0;

  /** y: 시트 이동량(%). 0 = 열림, 100 = 아래로 숨김 */
  const sp = new Spring(100, { stiffness: 0.16, damping: 0.78 });
  const p = $derived(Math.min(1, Math.max(0, 1 - sp.current / 100)));

  onMount(() => {
    plat = detect(navigator.userAgent, navigator.maxTouchPoints);
  });

  function ripple(e: PointerEvent) {
    if (reduced()) return;
    const r = btn.getBoundingClientRect();
    const id = ++seq;
    ripples.push({ id, x: e.clientX - r.left, y: e.clientY - r.top, d: Math.max(r.width, r.height) * 2.4 });
    setTimeout(() => (ripples = ripples.filter((q) => q.id !== id)), 700);
  }

  async function show() {
    apps = mapApps(plat.os, plat.mac, venue);
    sp.set(100, { instant: true });
    open = true;
    await tick();
    sp.set(0, reduced() ? { instant: true } : undefined);
  }

  async function close() {
    if (closing || !open) return;
    closing = true;
    if (reduced()) sp.set(100, { instant: true });
    else await sp.set(100);
    open = false;
    closing = false;
  }

  /** 앱 스킴 행: 1.5초 안에 페이지가 숨겨지지 않으면(앱 미설치) 웹/스토어로 대체 */
  function launch(e: MouseEvent, a: MapApp) {
    if (!a.fallback) return;
    e.preventDefault();
    const fallback = a.fallback;
    location.href = a.href;
    const t = setTimeout(() => {
      if (!document.hidden) location.href = fallback;
    }, 1500);
    const stop = () => clearTimeout(t);
    document.addEventListener("visibilitychange", stop, { once: true });
    addEventListener("pagehide", stop, { once: true });
  }

  /** 시트 노드: body 로 포털, 배경 inert, 스크롤 잠금, 포커스 이동/복귀 */
  function modal(node: HTMLElement) {
    const opener = document.activeElement as HTMLElement | null;
    const inerted = [...document.body.children].filter((c) => c !== node && !(c as HTMLElement).inert && c.tagName !== "SCRIPT") as HTMLElement[];
    inerted.forEach((c) => (c.inert = true));
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = "hidden";
    node.querySelector<HTMLElement>("[data-first]")?.focus();
    return {
      destroy() {
        inerted.forEach((c) => (c.inert = false));
        document.documentElement.style.overflow = overflow;
        (btn?.isConnected ? btn : opener)?.focus();
      },
    };
  }

  function onKey(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") return void close();
    if (e.key !== "Tab") return;
    const f = [...document.querySelectorAll<HTMLElement>(".mc-sheet a[href], .mc-sheet button")];
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (!f.includes(document.activeElement as HTMLElement)) (e.preventDefault(), first.focus());
    else if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
    else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
  }

  let drag: { y0: number; h: number; t: number; y: number; v: number } | null = null;
  function dragStart(e: PointerEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const h = (e.currentTarget as HTMLElement).closest<HTMLElement>(".mc-sheet")!.offsetHeight;
    drag = { y0: e.clientY, h, t: e.timeStamp, y: e.clientY, v: 0 };
  }
  function dragMove(e: PointerEvent) {
    if (!drag) return;
    const dt = e.timeStamp - drag.t;
    if (dt > 0) drag.v = (e.clientY - drag.y) / dt;
    drag.t = e.timeStamp;
    drag.y = e.clientY;
    sp.set(Math.max(0, ((e.clientY - drag.y0) / drag.h) * 100), { instant: true });
  }
  function dragEnd() {
    if (!drag) return;
    const { v } = drag;
    drag = null;
    if (v > 0.5 || sp.current > 30) close();
    else sp.set(0, reduced() ? { instant: true } : undefined);
  }
</script>

<svelte:window onkeydown={onKey} />

<button
  type="button"
  class="btn mc-btn"
  bind:this={btn}
  aria-haspopup="dialog"
  aria-expanded={open}
  onpointerdown={ripple}
  onclick={show}
>
  <span class="lbl">길찾기</span>
  {#each ripples as r (r.id)}
    <i class="ripple" style:left="{r.x}px" style:top="{r.y}px" style:width="{r.d}px" style:height="{r.d}px"></i>
  {/each}
</button>

{#snippet glyph(id: MapApp["id"])}
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    {#if id === "kakao"}
      <path d="M12 21s-6.5-5.7-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21z" /><circle cx="12" cy="10.5" r="2.3" />
    {:else if id === "naver"}
      <path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z" /><path d="M9 4v13.5M15 6.5V20" />
    {:else if id === "tmap"}
      <path d="M5 16v-4l1.8-5h10.4L19 12v4M3.5 16h17" /><circle cx="8" cy="17" r="1.6" /><circle cx="16" cy="17" r="1.6" /><path d="M5.5 12h13" />
    {:else if id === "google"}
      <circle cx="12" cy="12" r="8.5" /><path d="M15.5 8.5l-2 5-5 2 2-5z" />
    {:else}
      <path d="M12 3.5l6.5 16-6.5-3.8-6.5 3.8z" />
    {/if}
  </svg>
{/snippet}

{#if open}
  <div class="mc-root" use:portal use:modal>
    <div class="mc-back" style:opacity={p} style:backdrop-filter="blur({p * 6}px)" style:-webkit-backdrop-filter="blur({p * 6}px)" onclick={close} role="presentation"></div>
    <div class="mc-sheet" role="dialog" aria-modal="true" aria-labelledby="mc-h" style:transform="translate3d(0, {sp.current}%, 0)">
      <div class="mc-head" onpointerdown={dragStart} onpointermove={dragMove} onpointerup={dragEnd} onpointercancel={dragEnd} role="presentation">
        <i class="mc-grab" aria-hidden="true"></i>
        <h3 id="mc-h">길찾기</h3>
        <button type="button" class="mc-x" data-first onclick={close} aria-label="닫기">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        </button>
      </div>
      <ul class="mc-list">
        {#each apps as a, i (a.id)}
          <li in:fly|global={{ y: 18, duration: reduced() ? 0 : 320, delay: reduced() ? 0 : 120 + i * 55 }}>
            <a class="mc-row" href={a.href} target={a.blank ? "_blank" : undefined} rel={a.blank ? "noopener noreferrer" : undefined} data-app={a.id} onclick={(e) => launch(e, a)}>
              <span class="mc-ic">{@render glyph(a.id)}</span>
              <span class="mc-tx"><b>{a.name}</b><small>{a.hint}</small></span>
              <svg class="mc-chev" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </a>
          </li>
        {/each}
      </ul>
      {#if plat.kakao}
        <p class="mc-kakao">카카오톡에서 열리지 않으면 우측 하단 ⋯ → 다른 브라우저로 열기</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .mc-btn { position: relative; overflow: hidden; isolation: isolate; }
  .mc-btn .lbl { position: relative; z-index: 1; }
  .ripple {
    position: absolute; z-index: 0; border-radius: 50%; pointer-events: none; transform: translate(-50%, -50%) scale(0); opacity: 0.5;
    background: radial-gradient(closest-side, rgb(var(--glow-rgb) / 0.75), rgb(var(--gold-rgb) / 0));
    animation: ripple 650ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
  }
  @keyframes ripple { to { transform: translate(-50%, -50%) scale(1); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .ripple { display: none; } }

  .mc-root { position: fixed; inset: 0; z-index: 200; }
  .mc-back { position: absolute; inset: 0; background: rgb(var(--shade-rgb) / 0.72); }
  .mc-sheet {
    position: absolute; left: 0; right: 0; bottom: 0; max-width: 520px; margin: 0 auto;
    background: var(--bg-2); border: 1px solid rgb(var(--gold-rgb) / 0.55); border-bottom: 0; border-radius: 18px 18px 0 0;
    box-shadow: 0 -12px 40px rgb(0 0 0 / 0.55), 0 0 30px rgb(var(--gold-rgb) / 0.12);
    padding: 0 16px calc(20px + env(safe-area-inset-bottom)); text-align: left; will-change: transform;
  }
  .mc-sheet::after { content: ""; position: absolute; left: -1px; right: -1px; top: 100%; height: 120px; background: var(--bg-2); }
  .mc-head { position: relative; display: flex; align-items: center; justify-content: center; min-height: 64px; touch-action: none; cursor: grab; }
  .mc-grab { position: absolute; top: 8px; left: 50%; width: 40px; height: 4px; margin-left: -20px; border-radius: 2px; background: rgb(var(--gold-rgb) / 0.45); }
  h3 { margin: 10px 0 0; font-family: var(--latin); font-size: 17px; letter-spacing: 0.12em; color: var(--gold); font-weight: 400; }
  .mc-x { position: absolute; right: -6px; top: 12px; width: 44px; height: 44px; display: grid; place-items: center; border: 0; background: none; color: var(--ivory-dim); cursor: pointer; }
  .mc-x svg { width: 16px; height: 16px; }
  .mc-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .mc-row {
    display: flex; align-items: center; gap: 14px; min-height: 60px; padding: 8px 14px; color: var(--ivory); text-decoration: none;
    border: 1px solid rgb(var(--gold-rgb) / 0.3); border-radius: 12px; background: rgb(255 255 255 / 0.02); transition: background 0.2s, border-color 0.2s;
  }
  .mc-row:hover, .mc-row:active { background: rgb(var(--gold-rgb) / 0.12); border-color: var(--gold); }
  .mc-ic { flex: none; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 10px; color: var(--gold); background: rgb(var(--gold-rgb) / 0.1); }
  .mc-ic svg { width: 22px; height: 22px; }
  .mc-tx { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .mc-tx b { font-size: 17px; font-weight: 700; }
  .mc-tx small { font-size: 13px; color: var(--ivory-dim); }
  .mc-chev { flex: none; width: 16px; height: 16px; color: var(--ivory-dim); }
  .mc-kakao { margin: 14px 2px 0; font-size: 13px; line-height: 1.5; color: var(--pumpkin); }
</style>
