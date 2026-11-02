<script lang="ts">
  import { onMount } from "svelte";
  import { detect } from "../lib/platform";
  import { BRAND, type BrandId } from "../lib/brand";
  import { mapApps, type MapApp, type Venue } from "../lib/maps";

  let { venue }: { venue: Venue } = $props();

  const ORDER = ["naver", "tmap", "kakao"];
  const pick = (os: Parameters<typeof mapApps>[0], mac: boolean) =>
    mapApps(os, mac, venue)
      .filter((a) => ORDER.includes(a.id))
      .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  let apps = $state<MapApp[]>(pick("desktop", false));

  onMount(() => {
    const p = detect(navigator.userAgent, navigator.maxTouchPoints);
    apps = pick(p.os, p.mac);
  });

  /* 앱 스킴: 1.5초 안에 페이지가 숨겨지지 않으면(앱 미설치) 웹/스토어로 대체 */
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
</script>

<div class="apps">
  {#each apps as a (a.id)}
    <a class="btn app" href={a.href} target={a.blank ? "_blank" : undefined} rel={a.blank ? "noopener noreferrer" : undefined} onclick={(e) => launch(e, a)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{@html BRAND[a.id as BrandId]}</svg>{a.name}
    </a>
  {/each}
</div>

<style>
  .apps { display: flex; gap: 8px; }
  .app {
    flex: 1; min-width: 0; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 48px; padding: 0 4px;
    border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--ink); text-decoration: none;
    font: 400 14px/1 var(--f-ui, inherit); white-space: nowrap; -webkit-tap-highlight-color: transparent;
  }
  .app:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  svg { flex: none; width: 22px; height: 22px; }
</style>
