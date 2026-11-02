<script lang="ts">
  import { onMount } from "svelte";
  import { detect } from "../lib/platform";
  import { mapApps, type MapApp, type Venue } from "../lib/maps";

  let { venue }: { venue: Venue } = $props();

  const ORDER = ["naver", "tmap", "kakao"];
  const DOT: Record<string, string> = { naver: "#03C75A", tmap: "#3E5BFF", kakao: "#FEE500" };
  const TMAP_WEB: MapApp = { id: "tmap", name: "티맵", hint: "", href: "https://www.tmapmobility.com/", blank: true };
  const NAME: Record<string, string> = { kakao: "카카오내비" };
  const pick = (os: Parameters<typeof mapApps>[0], mac: boolean) =>
    [...mapApps(os, mac, venue), ...(os === "desktop" ? [TMAP_WEB] : [])]
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
      <i style:background={DOT[a.id]} aria-hidden="true"></i>{NAME[a.id] ?? a.name}
    </a>
  {/each}
</div>

<style>
  .apps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .app {
    min-width: 0; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 44px; padding: 0 4px;
    border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--ink); text-decoration: none;
    font: 400 14px/1 var(--f-ui, inherit); white-space: nowrap; -webkit-tap-highlight-color: transparent;
  }
  .app:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  i { flex: none; width: 10px; height: 10px; border-radius: 50%; }
  .app:last-child i { box-shadow: 0 0 0 1px #e0c400; }
</style>
