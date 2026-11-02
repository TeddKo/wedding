<script lang="ts">
  import { onMount } from "svelte";
  import { reduced } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";

  /* 섹션당 한 가지 등장: opacity 0→1, translateY 16→0, 700ms. 자식은 80ms 간격(최대 4단계) */
  const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
  const SKIP = new Set(["NOSCRIPT", "SCRIPT", "STYLE"]);

  /* 섬(astro-island)은 display:contents 라 변환이 안 먹으므로 안쪽 첫 요소를 대상으로 삼는다 */
  const targets = (el: Element) =>
    [...el.children].flatMap((c) => {
      if (SKIP.has(c.tagName)) return [];
      const t = c.tagName === "ASTRO-ISLAND" ? c.firstElementChild : c;
      return t instanceof HTMLElement ? [t] : [];
    });

  onMount(() => {
    if (reduced() || !("IntersectionObserver" in window)) return;
    const queue = new Set<() => void>();
    const plays = new Map<Element, () => void>();

    function prep(el: Element) {
      const kids = targets(el);
      for (const k of kids) {
        k.style.opacity = "0";
        k.style.transform = "translate3d(0, 16px, 0)";
      }
      return () => {
        void el.getBoundingClientRect();
        kids.forEach((k, i) => {
          k.style.transition = `opacity 700ms ${EASE} ${Math.min(i, 3) * 80}ms, transform 700ms ${EASE} ${Math.min(i, 3) * 80}ms`;
          k.style.opacity = "1";
          k.style.transform = "none";
        });
        setTimeout(() => kids.forEach((k) => ["transition", "opacity", "transform"].forEach((p) => k.style.removeProperty(p))), 1100);
      };
    }

    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          const play = plays.get(e.target)!;
          if (stage.open) play();
          else queue.add(play);
        }
      },
      { threshold: 0.15 },
    );
    for (const el of document.querySelectorAll("[data-reveal]")) {
      plays.set(el, prep(el));
      io.observe(el);
    }
    const watch = $effect.root(() => {
      $effect(() => {
        if (stage.open) {
          queue.forEach((f) => f());
          queue.clear();
        }
      });
    });
    return () => {
      io.disconnect();
      watch();
    };
  });
</script>
