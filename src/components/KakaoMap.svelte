<script lang="ts">
  import { onMount } from "svelte";

  let { name, lat, lng, appkey }: { name: string; address?: string; lat: number; lng: number; appkey: string } = $props();

  /* fallback: 서버 HTML/오류 상태, loading: 스켈레톤, ready: 타일 로드 완료 */
  let st = $state<"fallback" | "loading" | "ready">("fallback");
  let free = $state(false);
  let el: HTMLDivElement;
  let map: any;

  const link = $derived(`https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`);
  const TIMEOUT = 8000;

  const pin = (label: string) =>
    `<div class="km-pin"><b>${label}</b><svg viewBox="0 0 24 32" width="28" height="38" aria-hidden="true"><path d="M12 31C12 31 2 19.5 2 12a10 10 0 0 1 20 0c0 7.5-10 19-10 19z" style="fill:var(--pumpkin);stroke:var(--gold)" stroke-width="1.6"/><circle cx="12" cy="12" r="4" style="fill:var(--bg)"/></svg></div>`;

  onMount(() => {
    st = "loading";
    let done = false;
    const fail = () => {
      if (done) return;
      done = true;
      st = "fallback";
    };
    const timer = setTimeout(fail, TIMEOUT);
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appkey)}&autoload=false`;
    s.async = true;
    s.onerror = fail;
    s.onload = () => {
      try {
        const k = (window as any).kakao;
        if (!k?.maps?.load) return fail();
        k.maps.load(() => {
          try {
            const c = new k.maps.LatLng(lat, lng);
            map = new k.maps.Map(el, { center: c, level: 3 });
            map.setDraggable(false);
            map.setZoomable(false);
            const label = document.createElement("div");
            label.innerHTML = pin(name);
            new k.maps.CustomOverlay({ map, position: c, content: label.firstElementChild as HTMLElement, yAnchor: 1 });
            k.maps.event.addListener(map, "tilesloaded", () => {
              if (done) return;
              done = true;
              clearTimeout(timer);
              st = "ready";
            });
          } catch {
            fail();
          }
        });
      } catch {
        fail();
      }
    };
    document.head.append(s);
    return () => {
      done = true;
      clearTimeout(timer);
    };
  });

  function toggle() {
    free = !free;
    map?.setDraggable(free);
    map?.setZoomable(free);
  }
  const zoom = (d: number) => map?.setLevel(map.getLevel() + d, { animate: true });
</script>

{#if st === "fallback"}
  <div class="km-card pattern">
    <svg class="km-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
    <a class="btn-text" href={link} target="_blank" rel="noopener noreferrer">카카오맵에서 보기</a>
  </div>
{/if}

<div class="km" class:locked={!free} hidden={st === "fallback"}>
  <div class="km-map" bind:this={el}></div>
  {#if st === "loading"}<div class="km-skel" aria-hidden="true"></div>{/if}
  {#if st === "ready"}
    {#if !free}<div class="km-shield" aria-hidden="true"></div>{/if}
    <div class="km-ctl">
      <button type="button" class="km-z" onclick={() => zoom(-1)} aria-label="확대">+</button>
      <button type="button" class="km-z" onclick={() => zoom(1)} aria-label="축소">&minus;</button>
    </div>
    <button type="button" class="km-tg" onclick={toggle} aria-pressed={free}>{free ? "고정" : "지도 이동"}</button>
  {/if}
</div>

<style>
  .km, .km-card { margin: 0 0 16px; aspect-ratio: 16 / 10; border: 1px solid var(--line, rgb(var(--gold-rgb) / 0.4)); border-radius: var(--radius-lg, 12px); overflow: hidden; background-color: var(--surface, var(--bg-2)); }
  .km { position: relative; isolation: isolate; }
  .km[hidden] { display: none; }
  .km-map { position: absolute; inset: 0; }
  .km.locked .km-map, .km.locked .km-map :global(*) { touch-action: pan-y !important; }
  .km-shield { position: absolute; inset: 0; z-index: 2; touch-action: pan-y; }
  .km-skel {
    position: absolute; inset: 0; z-index: 4; background: linear-gradient(100deg, var(--bg-2) 30%, rgb(var(--gold-rgb) / 0.16) 50%, var(--bg-2) 70%) 0 0 / 220% 100%;
    animation: km-shimmer 1.4s linear infinite;
  }
  @keyframes km-shimmer { to { background-position: -220% 0; } }
  @media (prefers-reduced-motion: reduce) { .km-skel { animation: none; } }
  .km-ctl { position: absolute; z-index: 5; right: 10px; top: 10px; display: grid; border: 1px solid rgb(var(--gold-rgb) / 0.6); border-radius: 10px; overflow: hidden; background: rgb(var(--bg-rgb) / 0.88); }
  .km-z { width: 36px; height: 36px; border: 0; background: none; color: var(--gold); font-size: 20px; line-height: 1; cursor: pointer; }
  .km-z + .km-z { border-top: 1px solid rgb(var(--gold-rgb) / 0.35); }
  .km-tg {
    position: absolute; z-index: 5; left: 10px; bottom: 10px; min-height: 36px; padding: 0 14px; border-radius: 18px; cursor: pointer;
    border: 1px solid var(--gold); background: rgb(var(--bg-rgb) / 0.88); color: var(--gold); font: inherit; font-size: 14px;
  }
  .km-tg[aria-pressed="true"] { background: var(--gold); color: var(--bg); }
  .km :global(.km-pin) { display: grid; justify-items: center; transform: translateY(2px); pointer-events: none; }
  .km :global(.km-pin b) {
    margin-bottom: 2px; padding: 3px 10px; border-radius: 10px; border: 1px solid var(--gold); background: var(--bg); color: var(--gold);
    font-size: 13px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 8px rgb(0 0 0 / 0.5);
  }
  .km :global(.km-pin svg) { filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.5)); }
  .km-card { display: grid; align-content: center; justify-items: center; gap: 8px; text-align: center; color: var(--ink-2, var(--ivory-dim)); }
  .km-ic { width: 32px; height: 32px; }
  :global([data-theme="dev"]) .km-card { justify-items: start; padding: 0 24px; }
</style>
