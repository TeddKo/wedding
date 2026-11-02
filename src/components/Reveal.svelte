<script lang="ts">
  import { onMount } from "svelte";
  import { clamp, countText, hasDigits, isHex, reduced, scrambleHex, splitWords } from "../lib/motion";
  import { stage } from "../lib/stage.svelte";

  /**
   * 공유 모션 엔진. 속성 API(작업자는 속성만 붙인다):
   * - data-reveal: 섹션 루트. IO 1회(rootMargin 하단 -12%), 보이면 .in. 게이트가 열리기 전이면 큐.
   *   data-rv 자식이 없으면 루트 전체가 rise(레거시). 있으면 루트는 가만히 있고 자식이 안무.
   * - data-rv = fade | rise | mask | lines | letters | draw | curtain | count | type | stamp, 지연 style="--d:240ms".
   * - data-par="0.12": 보이는 동안만 스크롤 연동 이동(|px|<=24, individual translate).
   * 모션 감소 선호이면 분해·래핑·.rv 모두 생략하여 최종 상태 그대로 둔다.
   */
  const GEO = "path,line,polyline,circle,ellipse,rect";
  const PAR_MAX = 24;

  const mk = (cls: string, text?: string) => {
    const s = document.createElement("span");
    s.className = cls;
    if (text !== undefined) s.textContent = text;
    return s;
  };

  /** letters/type: 텍스트만 가진 요소 전용(자식 요소가 있으면 건너뜀). grapheme 마다 .ch(--i). 단어는 .w 로 묶어 줄바꿈 보존, 부모에 aria-label=원문. */
  function splitLetters(el: HTMLElement, caret: boolean) {
    const text = (el.textContent ?? "").trim();
    if (!text || el.children.length) return;
    let i = 0;
    const frag = document.createDocumentFragment();
    splitWords(text).forEach((word, wi) => {
      if (wi) frag.append(" ");
      const w = mk("w");
      for (const g of word) {
        const c = mk("ch", g);
        c.setAttribute("aria-hidden", "true");
        c.style.setProperty("--i", String(i++));
        w.append(c);
      }
      frag.append(w);
    });
    el.setAttribute("aria-label", text);
    el.replaceChildren(frag);
    if (!caret) return;
    const k = mk("caret", "▍");
    k.setAttribute("aria-hidden", "true");
    k.style.setProperty("--n", String(i));
    k.addEventListener("animationend", () => k.remove(), { once: true });
    el.append(k);
  }

  /** mask: 내용을 .m > .mi 로 감싼다(이동은 .mi, 클립은 .m). */
  function wrapMask(host: Element, i = 0) {
    const m = mk("m");
    const mi = mk("mi");
    mi.append(...Array.from(host.childNodes));
    m.append(mi);
    m.style.setProperty("--i", String(i));
    host.replaceChildren(m);
  }

  /** lines: 직계 자식 요소(p)마다, 없으면 <br> 경계마다 한 줄 mask. */
  function wrapLines(el: HTMLElement) {
    const hasBr = !!el.querySelector(":scope > br");
    const kids = Array.from(el.children).filter((c) => c.tagName !== "BR");
    if (!hasBr && kids.length) {
      kids.forEach((k, i) => wrapMask(k, i));
      return;
    }
    const groups: Node[][] = [[]];
    for (const n of Array.from(el.childNodes)) {
      if (n.nodeName === "BR") groups.push([]);
      else groups[groups.length - 1].push(n);
    }
    const lines = groups
      .filter((g) => g.some((n) => (n.textContent ?? "").trim() || n.nodeType === 1))
      .map((g, i) => {
        const line = document.createElement("span");
        line.style.display = "block";
        line.append(...g);
        wrapMask(line, i);
        return line.firstElementChild as HTMLElement;
      });
    el.replaceChildren(...lines);
  }

  /** draw: SVG 도형에 pathLength=1 을 심어 dashoffset 1→0 이 길이와 무관하게 동작하게 한다. */
  function markDraw(el: Element) {
    const t = el.matches(GEO) ? [el] : Array.from(el.querySelectorAll(GEO));
    for (const p of t) p.setAttribute("pathLength", "1");
  }

  function prepare(root: Element) {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-rv]"))) {
      switch (el.dataset.rv) {
        case "letters": splitLetters(el, false); break;
        case "type": splitLetters(el, true); break;
        case "mask": wrapMask(el); break;
        case "lines": wrapLines(el); break;
        case "draw": markDraw(el); break;
      }
    }
    root.classList.add("rv");
    if (root.querySelector("[data-rv]")) root.classList.add("rv-c");
  }

  type Roll = { el: HTMLElement; text: string; from: number; start: number; dur: number; hex: boolean; frame: number; cur: string };
  const rolls = new Set<Roll>();
  let raf = 0;

  /** count 롤러: 재생 중인 항목이 있을 때만 rAF 를 돌리고, 끝나면 멈춘다. */
  function tick(now: number) {
    raf = 0;
    for (const r of rolls) {
      const p = (now - r.start) / r.dur;
      if (p < 0) continue;
      if (p >= 1) {
        r.el.textContent = r.text;
        rolls.delete(r);
        continue;
      }
      if (r.hex) {
        const f = Math.floor(p * 6);
        if (f !== r.frame) {
          r.frame = f;
          r.cur = scrambleHex(r.text, p);
          r.el.textContent = r.cur;
        }
      } else r.el.textContent = countText(r.text, p, r.from);
    }
    if (rolls.size) raf = requestAnimationFrame(tick);
  }

  function play(root: Element) {
    root.classList.add("in");
    const now = performance.now();
    for (const el of root.querySelectorAll<HTMLElement>('[data-rv="count"]')) {
      const text = (el.textContent ?? "").trim();
      const hex = isHex(text);
      if (!hex && !hasDigits(text)) continue;
      const d = parseFloat(getComputedStyle(el).getPropertyValue("--d")) || 0;
      const from = Number(el.dataset.from) || 0;
      const r: Roll = { el, text, from, start: now + d, dur: hex ? 360 : 900, hex, frame: -1, cur: "" };
      el.setAttribute("aria-label", text);
      el.textContent = hex ? scrambleHex(text, 0) : countText(text, 0, from);
      rolls.add(r);
    }
    if (rolls.size && !raf) raf = requestAnimationFrame(tick);
  }

  /** data-par: 가시 집합만 관리, scroll(passive) → rAF 1회. 멈추면 rAF 없음. */
  function initPar() {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-par]"));
    if (!els.length) return () => {};
    const vis = new Set<HTMLElement>();
    const cur = new WeakMap<HTMLElement, number>();
    let q = 0;
    const apply = () => {
      q = 0;
      const mid = innerHeight / 2;
      const next: [HTMLElement, number][] = [];
      for (const el of vis) {
        const k = parseFloat(el.dataset.par ?? "0");
        if (!k) continue;
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2 - (cur.get(el) ?? 0);
        next.push([el, clamp((center - mid) * k, -PAR_MAX, PAR_MAX)]);
      }
      for (const [el, y] of next) {
        cur.set(el, y);
        el.style.translate = `0 ${y.toFixed(1)}px`;
      }
    };
    const sched = () => {
      if (!q && vis.size) q = requestAnimationFrame(apply);
    };
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) vis.add(e.target as HTMLElement);
          else vis.delete(e.target as HTMLElement);
        }
        sched();
      },
      { rootMargin: "48px 0px" },
    );
    els.forEach((el) => io.observe(el));
    addEventListener("scroll", sched, { passive: true });
    addEventListener("resize", sched, { passive: true });
    return () => {
      io.disconnect();
      removeEventListener("scroll", sched);
      removeEventListener("resize", sched);
      cancelAnimationFrame(q);
    };
  }

  onMount(() => {
    if (reduced() || !("IntersectionObserver" in window)) return;
    const queue = new Set<Element>();
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          if (stage.open) play(e.target);
          else queue.add(e.target);
        }
      },
      { threshold: 0, rootMargin: "0px 0px -12% 0px" },
    );
    for (const el of document.querySelectorAll("[data-reveal]")) {
      prepare(el);
      io.observe(el);
    }
    const stopPar = initPar();
    const watch = $effect.root(() => {
      $effect(() => {
        if (stage.open) {
          queue.forEach(play);
          queue.clear();
        }
      });
    });
    return () => {
      io.disconnect();
      stopPar();
      watch();
      cancelAnimationFrame(raf);
    };
  });
</script>
