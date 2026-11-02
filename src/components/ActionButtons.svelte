<script lang="ts">
  import { onMount } from "svelte";
  import { flip } from "svelte/animate";
  import Toast from "./ui/Toast.svelte";
  import { reduced } from "../lib/motion";
  import { portal } from "../lib/portal";
  import { ICONS } from "../lib/icons";
  import { BRAND } from "../lib/brand";

  type Action = { kind: "copy"; label: string; text: string; icon?: boolean; ghost?: boolean; small?: boolean } | { kind: "kakao"; label: string };
  type Kakao = { key: string; title: string; description: string; imageUrl: string; pageUrl: string };
  let { actions, kakao }: { actions: Action[]; kakao?: Kakao } = $props();

  /* 복사: 텍스트 버튼(icon 이면 아이콘 전용), 카카오: 노란 버튼 */
  const variant = (a: Action) => (a.kind === "kakao" ? "kakao-btn" : a.icon ? "icon-btn" : a.ghost && !a.small ? "box-btn" : "btn-text");

  let kakaoReady = $state(false);
  let toasts = $state<{ id: number }[]>([]);
  let seq = 0;
  let sdk: any;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = Object.assign(document.createElement("textarea"), { value: text });
      document.body.append(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
  }

  async function onCopy(a: Extract<Action, { kind: "copy" }>) {
    await copy(a.text);
    toasts.push({ id: ++seq });
  }

  function share() {
    if (!kakao) return;
    sdk?.Share.sendDefault({
      objectType: "feed",
      content: {
        title: kakao.title,
        description: kakao.description,
        imageUrl: kakao.imageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: { mobileWebUrl: kakao.pageUrl, webUrl: kakao.pageUrl },
      },
      buttons: [{ title: "청첩장 보기", link: { mobileWebUrl: kakao.pageUrl, webUrl: kakao.pageUrl } }],
    });
  }

  /* 카카오 공유: SDK 로드 실패 시 버튼은 숨겨진 채로 둔다 */
  onMount(() => {
    if (!kakao?.key || !actions.some((a) => a.kind === "kakao")) return;
    const s = document.createElement("script");
    s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js";
    s.integrity = "sha384-BGX7Wb16GmRFagri4bLJV2DgipVZaU2AI812GZtHtHzzDQJnfHasDXN5houxv45w";
    s.crossOrigin = "anonymous";
    s.onload = () => {
      try {
        sdk = (window as unknown as { Kakao: any }).Kakao;
        if (!sdk.isInitialized()) sdk.init(kakao.key);
        kakaoReady = true;
      } catch {
        kakaoReady = false;
      }
    };
    s.onerror = () => (kakaoReady = false);
    document.head.append(s);
  });
</script>

<div class="row">
  {#each actions as a}
    <button
      type="button"
      class={variant(a)}
      hidden={a.kind === "kakao" && !kakaoReady}
      aria-label={a.kind === "copy" && a.icon ? a.label : undefined}
      onclick={() => (a.kind === "copy" ? onCopy(a) : share())}
    >
      {#if a.kind === "kakao"}
        <svg class="kico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{@html BRAND.kakaotalk}</svg>
      {:else}
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={variant(a) === "box-btn" ? ICONS.link : ICONS.copy} /></svg>
      {/if}
      {#if !(a.kind === "copy" && a.icon)}{a.label}{/if}
    </button>
  {/each}
</div>

{#if toasts.length}
  <div class="toasts" aria-live="polite" use:portal>
    {#each toasts as t (t.id)}
      <div class="slot" animate:flip={{ duration: reduced() ? 0 : 280 }}>
        <Toast msg="복사됨" onend={() => (toasts = toasts.filter((x) => x.id !== t.id))} />
      </div>
    {/each}
  </div>
{/if}

<style>
  .row { display: contents; }
  button[hidden] { display: none; }
  button { font-family: var(--f-ui, inherit); -webkit-tap-highlight-color: transparent; }
  svg { flex: none; }
  .kakao-btn, .box-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 48px; padding: 0 8px; white-space: nowrap; border: 1px solid var(--line); border-radius: 12px;
    background: var(--surface); color: var(--ink); font-size: 14.5px; cursor: pointer;
  }
  .kakao-btn { background: #fee500; border-color: #fee500; color: #191919; }
  .kico { width: 22px; height: 22px; }
  .btn-text { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 0 12px; border: 0; background: none; color: var(--ink); font-size: 14.5px; cursor: pointer; }
  .box-btn svg, .btn-text svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; border: 0; border-radius: 50%; background: none; color: var(--ink-3); cursor: pointer; }
  .icon-btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .kakao-btn:focus-visible, .box-btn:focus-visible, .btn-text:focus-visible, .icon-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .toasts { position: fixed; left: 0; right: 0; bottom: var(--toast-bottom); display: grid; justify-items: center; gap: 8px; z-index: 150; pointer-events: none; }
</style>
