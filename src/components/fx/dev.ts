/**
 * dev 테마 연출: 드문 가지 깜빡임, .gl 화면 밖 일시정지, 레일 글로우(스크롤 진행도, 푸터 노드 중심에서 clamp, 도달 시 v1.0.0 태그 stamp).
 * 점화/신호/hum 은 CSS(html.opened)가 담당하고 여기서는 런타임 행동만 다룬다.
 * @param ctx first=true 면 시그니처 연출 1회 재생 시점
 * @returns 정리 함수(타이머/옵저버/리스너/DOM 해제)
 */
export function start(ctx: { first: boolean }): () => void {
  void ctx;
  const gl = document.querySelector<HTMLElement>('.gl[data-th~="dev"]');
  const page = document.querySelector<HTMLElement>("main.page");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const undo: Array<() => void> = [];

  if (gl) {
    let inView = true;
    const sync = () => gl.classList.toggle("fx-paused", !inView || document.hidden);
    const io = new IntersectionObserver((es) => {
      inView = es[es.length - 1].isIntersecting;
      sync();
    });
    io.observe(gl);
    document.addEventListener("visibilitychange", sync);
    undo.push(() => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      gl.classList.remove("fx-paused");
    });

    if (!reduced) {
      let timer = 0;
      let off = 0;
      const arm = () => {
        timer = window.setTimeout(() => {
          const brs = gl.querySelectorAll<SVGGElement>(".br");
          const el = brs[Math.floor(Math.random() * brs.length)];
          el?.classList.add("blink");
          off = window.setTimeout(() => el?.classList.remove("blink"), 160);
          arm();
        }, 9000 + Math.random() * 6000);
      };
      arm();
      undo.push(() => {
        clearTimeout(timer);
        clearTimeout(off);
        gl.querySelectorAll(".blink").forEach((e) => e.classList.remove("blink"));
      });
    }
  }

  const trunk = document.querySelector<HTMLElement>(".gl-meta .trunk");
  const foot = document.querySelector<HTMLElement>("footer.ending");
  if (page && trunk) {
    const rail = document.createElement("i");
    rail.className = "rail-glow";
    rail.setAttribute("aria-hidden", "true");
    rail.style.zIndex = "2";
    page.appendChild(rail);
    const NODE = 67.5;
    const waiting = !!foot && !reduced;
    if (waiting) foot.classList.add("tag-wait");
    let top = 0;
    let h = 1;
    let raf = 0;
    let reached = false;
    const stamp = () => {
      reached = true;
      foot?.classList.remove("tag-wait");
      if (!foot) return;
      const an = foot.animate(
        [
          { opacity: 0, transform: "scale(1.3)", textShadow: "none" },
          { opacity: 1, transform: "scale(1)", textShadow: "0 0 8px rgb(46 107 255 / 0.7), 0 0 2px rgb(46 107 255 / 0.6)", offset: 0.5 },
          { opacity: 1, transform: "scale(1)", textShadow: "none" },
        ],
        { duration: 900, easing: "cubic-bezier(.34,1.56,.64,1)", pseudoElement: "::after" },
      );
      undo.push(() => an.cancel());
    };
    const paint = () => {
      raf = 0;
      const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
      const p = reduced || atEnd ? 1 : Math.min(1, Math.max(0, (innerHeight / 2 - page.getBoundingClientRect().top - top) / h));
      rail.style.transform = `scaleY(${p})`;
      if (waiting && !reached && p >= 0.999) stamp();
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const measure = () => {
      top = trunk.getBoundingClientRect().top - page.getBoundingClientRect().top;
      const end = foot ? foot.getBoundingClientRect().top - page.getBoundingClientRect().top + NODE : page.scrollHeight;
      h = Math.max(1, end - top);
      rail.style.top = `${top}px`;
      rail.style.height = `${h}px`;
      queue();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(page);
    if (!reduced) addEventListener("scroll", queue, { passive: true });
    undo.push(() => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener("scroll", queue);
      foot?.classList.remove("tag-wait");
      rail.remove();
    });
  }

  return () => undo.forEach((f) => f());
}
