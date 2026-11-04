/**
 * dev 테마 연출: .gl 화면 밖 일시정지, 브랜치 레일(읽기 기준선 0.6vh 에 팁 고정, 노드 .lit 점등을 레일이 구동, 푸터 노드 중심에서 clamp, 도달 시 v1.0.0 태그 stamp).
 * 점화/신호/hum 은 CSS(html.opened)가 담당, 여기서는 런타임 행동만 처리.
 * @param ctx first=true 면 시그니처 연출 1회 재생 시점
 * @returns 정리 함수(타이머/옵저버/리스너/DOM 해제)
 */
export function start(ctx: { first: boolean }): () => void {
  void ctx;
  const gl = document.querySelector<HTMLElement>('.gl[data-th~="dev"]');
  const page = document.querySelector<HTMLElement>("main.page");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const undo: Array<() => void> = [];
  let dead = false;

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
  }

  const trunk = document.querySelector<HTMLElement>(".gl-meta .trunk");
  const foot = document.querySelector<HTMLElement>("footer.ending");
  if (page && trunk) {
    const mk = (cls: string) => {
      const e = document.createElement("i");
      e.className = cls;
      e.setAttribute("aria-hidden", "true");
      return e;
    };
    const clip = mk("rail-clip");
    const glow = mk("rail-glow");
    const head = mk("rail-head");
    clip.append(glow);
    head.hidden = reduced;
    page.append(clip, head);
    /* 읽기 기준선(뷰포트 높이 비율), 섹션 노드 중심(제목 top 기준), 푸터 끝 노드 중심(footer top 기준) */
    const READ = 0.6;
    const NODE = 33.5;
    const END = 67.5;
    const topIn = (el: HTMLElement) => {
      let y = 0;
      for (let o: HTMLElement | null = el; o && o !== page; o = o.offsetParent as HTMLElement | null) y += o.offsetTop;
      return y;
    };
    const anchors = Array.from(page.querySelectorAll<HTMLElement>(".sec-title")).flatMap((t) => {
      const el = t.closest<HTMLElement>("[data-reveal]");
      return el ? [{ t, el, y: 0, lit: false }] : [];
    });
    if (foot) anchors.push({ t: foot, el: foot, y: 0, lit: false });
    const waiting = !!foot && !reduced;
    if (waiting) foot.classList.add("tag-wait");
    let top = 0;
    let end = 0;
    let docH = 0;
    let raf = 0;
    let stale = false;
    let reached = false;
    const stamp = () => {
      reached = true;
      foot?.classList.remove("tag-wait");
      if (!foot) return;
      const an = foot.animate(
        [
          { opacity: 0, transform: "scale(1.3)", textShadow: "none" },
          { opacity: 1, transform: "scale(1)", textShadow: "0 0 8px rgb(var(--accent-rgb) / 0.7), 0 0 2px rgb(var(--accent-rgb) / 0.6)", offset: 0.5 },
          { opacity: 1, transform: "scale(1)", textShadow: "none" },
        ],
        { duration: 900, easing: "cubic-bezier(.34,1.56,.64,1)", pseudoElement: "::after" },
      );
      undo.push(() => an.cancel());
    };
    /* 앵커는 offsetTop 누적(transform 무관)으로 캐시. 레이아웃 읽기는 여기서만 수행 */
    const measure = () => {
      top = topIn(trunk);
      end = foot ? topIn(foot) + END : page.offsetHeight;
      docH = document.documentElement.scrollHeight;
      for (const a of anchors) a.y = a.el === foot ? end : topIn(a.t) + NODE;
      page.style.setProperty("--rail-top", `${top}px`);
      page.style.setProperty("--rail-bot", `${page.offsetHeight - end}px`);
      clip.style.top = `${top}px`;
      clip.style.height = `${Math.max(1, end - top)}px`;
    };
    const paint = () => {
      const atEnd = scrollY + innerHeight >= docH - 2;
      const tip = reduced || atEnd ? end : Math.min(end, Math.max(top, scrollY + innerHeight * READ));
      glow.style.transform = `translate3d(0,${tip - end}px,0)`;
      head.style.transform = `translate3d(0,${tip}px,0)`;
      for (const a of anchors) {
        const lit = tip >= a.y;
        if (lit !== a.lit) {
          a.lit = lit;
          a.el.classList.toggle("lit", lit);
        }
      }
      if (waiting && !reached && tip >= end) stamp();
    };
    const queue = (remeasure = false) => {
      stale ||= remeasure;
      if (dead) return;
      raf ||= requestAnimationFrame(() => {
        raf = 0;
        if (stale) {
          stale = false;
          measure();
        }
        paint();
      });
    };
    const onLayout = () => queue(true);
    const onScroll = () => queue();
    measure();
    paint();
    const ro = new ResizeObserver(onLayout);
    ro.observe(page);
    for (const s of page.querySelectorAll("[data-reveal]")) ro.observe(s);
    document.fonts?.ready.then(() => {
      if (!dead) onLayout();
    });
    addEventListener("load", onLayout);
    addEventListener("resize", onLayout);
    visualViewport?.addEventListener("resize", onLayout);
    if (!reduced) addEventListener("scroll", onScroll, { passive: true });
    undo.push(() => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener("load", onLayout);
      removeEventListener("resize", onLayout);
      visualViewport?.removeEventListener("resize", onLayout);
      removeEventListener("scroll", onScroll);
      foot?.classList.remove("tag-wait");
      for (const a of anchors) a.el.classList.remove("lit");
      page.style.removeProperty("--rail-top");
      page.style.removeProperty("--rail-bot");
      clip.remove();
      head.remove();
    });
  }

  return () => undo.forEach((f) => f());
}
