<script lang="ts">
  import { onMount } from "svelte";
  import { flip } from "svelte/animate";
  import Toast from "./ui/Toast.svelte";
  import { reduced } from "../lib/motion";
  import { portal } from "../lib/portal";
  import { ICONS } from "../lib/icons";

  type Action = { kind: "copy"; label: string; text: string; ghost?: boolean; small?: boolean } | { kind: "kakao"; label: string };
  type Kakao = { key: string; title: string; description: string; imageUrl: string; pageUrl: string };
  let { actions, kakao }: { actions: Action[]; kakao?: Kakao } = $props();

  /* ghost = secondary, small = text, 그 외 primary */
  const variant = (a: Action) => (a.kind === "copy" && a.small ? "btn-text" : a.kind === "copy" && a.ghost ? "btn" : "btn-primary");

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
      onclick={() => (a.kind === "copy" ? onCopy(a) : share())}
    >
      {#if variant(a) === "btn-text"}
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={ICONS.copy} /></svg>
      {/if}
      {a.label}
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
  .btn-text svg { flex: none; }
  .toasts { position: fixed; left: 0; right: 0; bottom: var(--toast-bottom); display: grid; justify-items: center; gap: 8px; z-index: 150; pointer-events: none; }
</style>
