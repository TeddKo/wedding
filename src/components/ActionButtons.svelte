<script lang="ts">
  import { onMount } from "svelte";
  import { flip } from "svelte/animate";
  import Toast from "./ui/Toast.svelte";
  import { rand, reduced } from "../lib/motion";
  import { portal } from "../lib/portal";

  type Action = { kind: "copy"; label: string; text: string; ghost?: boolean; small?: boolean } | { kind: "kakao"; label: string };
  type Kakao = { key: string; title: string; description: string; imageUrl: string; pageUrl: string };
  let { actions, kakao }: { actions: Action[]; kakao?: Kakao } = $props();

  let kakaoReady = $state(false);
  let toasts = $state<{ id: number }[]>([]);
  let ripples = $state<{ id: number; k: number; x: number; y: number; d: number }[]>([]);
  let embers = $state<{ id: number; k: number; x: number; y: number; dx: number; dy: number; s: number; t: number }[]>([]);
  let okIdx = $state(-1);
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

  function ripple(e: PointerEvent, k: number) {
    if (reduced()) return;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const id = ++seq;
    ripples.push({ id, k, x: e.clientX - r.left, y: e.clientY - r.top, d: Math.max(r.width, r.height) * 2.4 });
    setTimeout(() => (ripples = ripples.filter((q) => q.id !== id)), 700);
  }

  function burst(k: number, el: HTMLElement, count: number) {
    if (reduced()) return;
    const r = el.getBoundingClientRect();
    const born = Array.from({ length: count }, () => {
      const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const v = rand(50, 140);
      return { id: ++seq, k, x: r.width / 2 + rand(-r.width * 0.25, r.width * 0.25), y: r.height / 2, dx: Math.cos(a) * v, dy: Math.sin(a) * v - 30, s: rand(3, 7), t: rand(700, 1300) };
    });
    embers.push(...born);
    setTimeout(() => (embers = embers.filter((q) => !born.includes(q))), 1400);
  }

  async function onCopy(a: Extract<Action, { kind: "copy" }>, i: number, el: HTMLElement) {
    await copy(a.text);
    toasts.push({ id: ++seq });
    okIdx = i;
    setTimeout(() => okIdx === i && (okIdx = -1), 1200);
    burst(i, el, 6);
  }

  function share(i: number, el: HTMLElement) {
    burst(i, el, 26);
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
  {#each actions as a, i}
    <button
      type="button"
      class="btn ab"
      class:btn-ghost={a.kind === "copy" && a.ghost}
      class:btn-sm={a.kind === "copy" && a.small}
      class:ok={okIdx === i}
      hidden={a.kind === "kakao" && !kakaoReady}
      onpointerdown={(e) => ripple(e, i)}
      onclick={(e) => (a.kind === "copy" ? onCopy(a, i, e.currentTarget) : share(i, e.currentTarget))}
    >
      <span class="lbl">{a.label}</span>
      {#each ripples.filter((r) => r.k === i) as r (r.id)}
        <i class="ripple" style:left="{r.x}px" style:top="{r.y}px" style:width="{r.d}px" style:height="{r.d}px"></i>
      {/each}
      {#each embers.filter((m) => m.k === i) as m (m.id)}
        <i class="ember" style:left="{m.x}px" style:top="{m.y}px" style:width="{m.s}px" style:height="{m.s}px" style:--dx="{m.dx}px" style:--dy="{m.dy}px" style:animation-duration="{m.t}ms"></i>
      {/each}
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
  .ab { position: relative; overflow: visible; isolation: isolate; }
  .ab .lbl { position: relative; z-index: 1; }
  .ab.ok { background: rgb(201 164 92 / 0.22); border-color: var(--gold); color: var(--ivory); box-shadow: 0 0 18px rgb(201 164 92 / 0.35); }
  .ripple {
    position: absolute; z-index: 0; border-radius: 50%; pointer-events: none; transform: translate(-50%, -50%) scale(0); opacity: 0.5;
    background: radial-gradient(closest-side, rgb(246 210 122 / 0.75), rgb(201 164 92 / 0));
    animation: ripple 650ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
  }
  .ember {
    position: absolute; z-index: 2; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, #ffe3a0, #e07a2f 60%, rgb(224 122 47 / 0));
    box-shadow: 0 0 8px 2px rgb(224 122 47 / 0.65); animation: ember ease-out forwards;
  }
  @keyframes ripple { to { transform: translate(-50%, -50%) scale(1); opacity: 0; } }
  @keyframes ember {
    0% { transform: translate3d(0, 0, 0) scale(1); opacity: 1; }
    100% { transform: translate3d(var(--dx), var(--dy), 0) scale(0.2); opacity: 0; }
  }
  .toasts { position: fixed; left: 0; right: 0; bottom: calc(76px + env(safe-area-inset-bottom)); display: grid; justify-items: center; gap: 8px; z-index: 150; pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { .ripple, .ember { display: none; } }
</style>
