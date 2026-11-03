<script lang="ts">
  import { onMount } from "svelte";

  let { name, lat, lng, appkey }: { name: string; lat: number; lng: number; appkey: string } = $props();

  /* fallback: 서버 HTML/오류 상태, loading: 스켈레톤, ready: 타일 로드 완료 */
  let st = $state<"fallback" | "loading" | "ready">("fallback");
  let free = $state(false);
  let el: HTMLDivElement;
  let map: any;

  const link = $derived(`https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`);
  const TIMEOUT = 8000;

  const pin = (label: string) =>
    `<div class="km-pin"><b>${label}</b><svg viewBox="0 0 24 32" width="28" height="38" aria-hidden="true"><path d="M12 31C12 31 2 19.5 2 12a10 10 0 0 1 20 0c0 7.5-10 19-10 19z" style="fill:var(--accent);stroke:var(--ink)" stroke-width="1.6"/><circle cx="12" cy="12" r="4" style="fill:var(--bg)"/></svg></div>`;

  onMount(() => {
    if (!appkey) return;
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
  <div class="km-card">
    <div class="km-roads" aria-hidden="true"></div>
    <div class="km-pinwrap" aria-hidden="true">
      <span class="km-ring"></span>
      <span class="km-ring r2"></span>
      <svg class="km-fpin" viewBox="0 0 24 32" width="28" height="38" focusable="false"><path d="M12 31C12 31 2 19.5 2 12a10 10 0 0 1 20 0c0 7.5-10 19-10 19z" style="fill:var(--accent)" /><circle cx="12" cy="12" r="4" style="fill:var(--bg)" /></svg>
      <span class="km-shadow"></span>
    </div>
    <a class="km-link" href={link} target="_blank" rel="noopener noreferrer">카카오맵에서 보기</a>
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
  .km { height: 260px; background-color: var(--surface); overflow: hidden; }
  .km { position: relative; isolation: isolate; }
  .km[hidden] { display: none; }
  .km-map { position: absolute; inset: 0; }
  .km.locked .km-map, .km.locked .km-map :global(*) { touch-action: pan-y !important; }
  .km-shield { position: absolute; inset: 0; z-index: 2; touch-action: pan-y; }
  .km-skel { position: absolute; inset: 0; z-index: 4; background: linear-gradient(100deg, var(--surface) 30%, var(--line) 50%, var(--surface) 70%) 0 0 / 220% 100%; animation: km-shimmer 1.4s linear infinite; }
  @keyframes km-shimmer { to { background-position: -220% 0; } }
  @media (prefers-reduced-motion: reduce) { .km-skel { animation: none; } }
  .km-ctl { position: absolute; z-index: 5; right: 10px; top: 10px; display: grid; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--surface); }
  .km-z { width: 36px; height: 36px; border: 0; background: none; color: var(--ink); font-size: 20px; line-height: 1; cursor: pointer; }
  .km-z + .km-z { border-top: 1px solid var(--line); }
  .km-tg { position: absolute; z-index: 5; left: 10px; bottom: 10px; min-height: 36px; padding: 0 14px; border-radius: 18px; cursor: pointer; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; font-size: 14px; }
  .km-tg[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: var(--bg); }
  .km :global(.km-pin) { display: grid; justify-items: center; transform: translateY(2px); pointer-events: none; }
  .km :global(.km-pin b) { margin-bottom: 2px; padding: 3px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-size: 13px; font-weight: 700; white-space: nowrap; box-shadow: 0 1px 2px rgb(26 26 26 / 0.06); }
  .km-card { position: relative; height: 260px; overflow: hidden; background: var(--track); border-block: 1px solid var(--line); }
  .km-roads {
    position: absolute; inset: 0;
    background:
      repeating-linear-gradient(32deg, transparent 0 27px, rgb(var(--accent-rgb) / 0.08) 27px 28px),
      repeating-linear-gradient(-58deg, transparent 0 27px, rgb(var(--accent-rgb) / 0.08) 27px 28px);
  }
  .km-pinwrap { position: absolute; left: 50%; top: 50%; width: 28px; height: 38px; margin: -38px 0 0 -14px; }
  .km-fpin { position: relative; display: block; z-index: 1; }
  .km-shadow { position: absolute; left: 50%; bottom: -3px; width: 18px; height: 6px; margin-left: -9px; border-radius: 50%; background: rgb(26 26 26 / 0.22); }
  .km-ring { position: absolute; left: 50%; bottom: -3px; width: 28px; height: 10px; margin-left: -14px; border-radius: 50%; border: 1.5px solid var(--accent); opacity: 0; }
  .km-link { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; font-size: 12.5px; color: var(--ink); text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--line); }
  .km-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  :global(html.js [data-reveal].rv) .km-fpin { transition: transform 600ms var(--e-spring) 800ms, opacity 240ms linear 800ms; }
  :global(html.js [data-reveal].rv:not(.in)) .km-fpin { transform: translateY(-16px); opacity: 0; }
  :global(html.js [data-reveal].rv) .km-shadow { transition: opacity 400ms linear 1000ms; }
  :global(html.js [data-reveal].rv:not(.in)) .km-shadow { opacity: 0; }
  :global(html.js [data-reveal].rv.in) .km-ring { animation: km-pulse 1.6s var(--e-out) 1400ms 2 backwards; }
  :global(html.js [data-reveal].rv.in) .km-ring.r2 { animation-delay: 1700ms; }
  @keyframes km-pulse { from { transform: scale(0.6); opacity: 0.4; } to { transform: scale(1.6); opacity: 0; } }
</style>
