<script lang="ts">
  import { onMount } from "svelte";
  import { reduced } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";

  /* 섹션 등장: CSS fadeInUp 1s. 마운트 시 rv(숨김)를 붙이고, 보이면서 인트로가 끝났으면 in(재생)을 붙인다 */
  onMount(() => {
    if (reduced() || !("IntersectionObserver" in window)) return;
    const queue = new Set<Element>();

    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          if (stage.open) e.target.classList.add("in");
          else queue.add(e.target);
        }
      },
      { threshold: 0, rootMargin: "0px 0px -15% 0px" },
    );
    for (const el of document.querySelectorAll("[data-reveal]")) {
      el.classList.add("rv");
      io.observe(el);
    }
    const watch = $effect.root(() => {
      $effect(() => {
        if (stage.open) {
          queue.forEach((el) => el.classList.add("in"));
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
