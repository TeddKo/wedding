<script lang="ts">
  import { onMount } from "svelte";
  import { Spring } from "svelte/motion";
  import { reduced } from "../../lib/motion";

  let { msg, onend, warn = false }: { msg: string; onend: () => void; warn?: boolean } = $props();

  const s = new Spring({ y: 46, sc: 0.7, o: 0 }, { stiffness: 0.16, damping: 0.42 });

  onMount(() => {
    const quick = reduced();
    s.set({ y: 0, sc: 1, o: 1 }, quick ? { instant: true } : undefined);
    const t = setTimeout(async () => {
      await s.set({ y: -14, sc: 0.94, o: 0 }, quick ? { instant: true } : { preserveMomentum: 0 });
      onend();
    }, 1700);
    return () => clearTimeout(t);
  });
</script>

<div class="toast" role="status" style:opacity={s.current.o} style:transform="translate3d(0, {s.current.y}px, 0) scale({s.current.sc})">
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    {#if warn}<path d="M8 3.5v5.5M8 12v.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />{:else}<path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />{/if}
  </svg>
  {msg}
</div>

<style>
  .toast {
    display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 999px; font-size: 15px; letter-spacing: 0.06em; color: var(--ivory);
    background: rgb(27 19 34 / 0.94); border: 1px solid var(--gold); box-shadow: 0 8px 30px rgb(0 0 0 / 0.6), 0 0 22px rgb(201 164 92 / 0.25); will-change: transform, opacity;
  }
  svg { width: 16px; height: 16px; color: var(--gold); }
</style>
