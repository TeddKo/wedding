<script lang="ts">
  import { onMount } from "svelte";
  import { reduced } from "../../lib/motion";

  let { msg, onend, warn = false }: { msg: string; onend: () => void; warn?: boolean } = $props();

  let on = $state(false);

  onMount(() => {
    const quick = reduced();
    requestAnimationFrame(() => (on = true));
    const t1 = setTimeout(() => (on = false), 1800);
    const t2 = setTimeout(onend, 1800 + (quick ? 0 : 200));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  });
</script>

<div class="toast" class:on role="status">
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {#if warn}<path d="M12 7v6M12 17v.01" />{:else}<path d="M5 12.5l4.5 4.5L19 7.5" />{/if}
  </svg>
  {msg}
</div>

<style>
  .toast {
    display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border-radius: 999px; font-size: 14px; line-height: 1; letter-spacing: 0;
    color: var(--bg, var(--bg-2)); background: var(--ink, var(--ivory));
    opacity: 0; transform: translateY(8px); transition: opacity 200ms ease, transform 200ms ease;
  }
  .toast.on { opacity: 1; transform: none; }
  svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  @media (prefers-reduced-motion: reduce) { .toast { transition: none; transform: none; } }
</style>
