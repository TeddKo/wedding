<script lang="ts">
  import { tick } from "svelte";
  import { Spring } from "svelte/motion";
  import { fade, fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { lerp, reduced } from "../lib/motion";
  import { portal } from "../lib/portal";

  type Item = { thumb: string; srcset: string; full: string; w: number; h: number };
  type Props = {
    items: Item[];
    /** true 면 그리드를 그리지 않고 라이트박스만 사용 (호출 쪽이 openAt 호출) */
    bare?: boolean;
    /** bare 일 때 FLIP·포커스 복귀에 쓸 i 번째 썸네일 요소 */
    thumbAt?: (i: number) => HTMLElement | null | undefined;
    /** 아직 불러올 항목이 남았는지 여부. 끝에 닿으면 순환 대신 onindex 로 추가 로드 대기 */
    more?: boolean;
    /** 라이트박스가 보여 주는 인덱스가 바뀔 때 */
    onindex?: (i: number) => void;
    /** 카운터에 표시할 전체 장수 (없으면 items 길이) */
    total?: number;
    /** 있으면 라이트박스에 삭제 버튼 표시. 성공 시 null, 실패 시 보여 줄 메시지 반환 */
    remove?: (i: number, pw?: string) => Promise<string | null>;
    /** i 번째 사진 삭제에 필요한 확인: "pw" 비밀번호 입력, "confirm" 확인만, null 삭제 버튼 숨김 */
    need?: (i: number) => "pw" | "confirm" | null;
  };
  let { items, bare = false, thumbAt, more = false, onindex, total, remove, need }: Props = $props();

  const n = $derived(items.length);

  /* ---------- 라이트박스 ---------- */
  let open = $state(false);
  let idx = $state(0);
  let dir = $state(1);
  let fullReady = $state(false);
  let closing = false;
  let lb = $state<HTMLElement>();
  let SW = $state(390);
  let SH = $state(800);
  const btns: HTMLElement[] = [];

  const p = new Spring(0, { stiffness: 0.11, damping: 0.8 });
  const view = new Spring({ x: 0, y: 0, s: 1 }, { stiffness: 0.12, damping: 0.62 });
  const instant = { instant: true } as const;

  const cur = $derived(items[idx]);
  const fit = $derived.by(() => {
    if (!cur) return { w: 0, h: 0 };
    const k = Math.min((SW - 16) / cur.w, (SH - 88) / cur.h);
    return { w: cur.w * k, h: cur.h * k };
  });

  function thumbRect(i: number) {
    const img = (bare ? thumbAt?.(i) : btns[i])?.querySelector("img");
    const r = img?.getBoundingClientRect();
    return r && r.bottom > 0 && r.top < innerHeight ? r : null;
  }
  /* FLIP: 썸네일 사각형에 맞춘 시작 변환 */
  const flipFrom = $derived.by(() => {
    const r = open ? thumbRect(idx) : null;
    if (!r || !fit.w) return null;
    const s0 = Math.max(r.width / fit.w, r.height / fit.h);
    return {
      dx: r.left + r.width / 2 - SW / 2,
      dy: r.top + r.height / 2 - (SH / 2 - 24),
      s0,
      ix: Math.max(0, (fit.w - r.width / s0) / 2),
      iy: Math.max(0, (fit.h - r.height / s0) / 2),
    };
  });

  const style = $derived.by(() => {
    const k = Math.min(p.current, 1.12);
    const f = flipFrom;
    const v = view.current;
    if (!f || p.current >= 1 || reduced()) return `transform: translate3d(${v.x}px, ${v.y}px, 0) scale(${v.s});`;
    const q = 1 - p.current;
    return `transform: translate3d(${lerp(f.dx, 0, k) + v.x}px, ${lerp(f.dy, 0, k) + v.y}px, 0) scale(${lerp(f.s0, 1, k) * v.s}); clip-path: inset(${Math.max(0, f.iy * q)}px ${Math.max(0, f.ix * q)}px);`;
  });
  const dim = $derived(Math.max(0, Math.min(1, p.current)) * (1 - Math.min(1, Math.abs(view.current.y) / 420)));

  function setInert(on: boolean) {
    for (const el of document.querySelectorAll(".page, .footer")) on ? el.setAttribute("inert", "") : el.removeAttribute("inert");
    document.documentElement.style.overflow = on ? "hidden" : "";
  }

  function preload() {
    fullReady = false;
    const f = cur?.full;
    if (!f) return;
    const im = new Image();
    im.onload = () => cur?.full === f && (fullReady = true);
    im.src = f;
  }

  /* 확대 상태를 기록에 한 칸 쌓아, 휴대폰 뒤로가기가 페이지 이탈 대신 확대만 닫게 함 */
  let pushed = false;
  const releaseHistory = () => {
    if (!pushed) return;
    pushed = false;
    history.back();
  };
  $effect(() => {
    const onPop = () => {
      if (!pushed) return;
      pushed = false;
      if (open) void close();
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  });

  export async function openAt(i: number) {
    idx = i;
    onindex?.(i);
    dir = 1;
    closing = false;
    SW = innerWidth;
    SH = innerHeight;
    view.set({ x: 0, y: 0, s: 1 }, instant);
    p.set(0, instant);
    open = true;
    setInert(true);
    if (!pushed) {
      history.pushState({ ...history.state, lightbox: true }, "");
      pushed = true;
    }
    preload();
    await tick();
    lb?.focus({ preventScroll: true });
    if (reduced()) p.set(1, instant);
    else p.target = 1;
  }

  async function close() {
    if (closing) return;
    closing = true;
    releaseHistory();
    view.target = { x: 0, y: 0, s: 1 };
    const visible = !!thumbRect(idx) && !reduced();
    /* 닫는 도중 go/openAt 이 p 를 건드리면 Spring 이 "Aborted" 로 거부함. 정리를 건너뛰면 inert·스크롤 잠금이 남아 화면이 멈춤 */
    if (visible) await p.set(0).catch(() => {});
    else await new Promise<void>((r) => setTimeout(r, reduced() ? 0 : 160));
    if (!closing) return;
    const back = idx;
    open = false;
    setInert(false);
    (bare ? thumbAt?.(back) : btns[back])?.focus({ preventScroll: true });
  }

  let delOpen = $state(false);
  let delPw = $state("");
  let delShow = $state(false);
  let delErr = $state("");
  let delBusy = $state(false);
  let delBtn = $state<HTMLElement>();
  let delInput = $state<HTMLElement>();
  let delNo = $state<HTMLElement>();
  const ask = $derived(need?.(idx) ?? null);

  async function askDel() {
    delPw = "";
    delShow = false;
    delErr = "";
    delOpen = true;
    await tick();
    (ask === "confirm" ? delNo : delInput)?.focus();
  }

  async function closeDel() {
    delOpen = false;
    delPw = "";
    await tick();
    (delBtn ?? lb)?.focus();
  }

  async function doDel(e: SubmitEvent) {
    e.preventDefault();
    if (delBusy || !remove) return;
    const pw = delPw.trim();
    if (ask === "pw" && !pw) {
      delErr = "비밀번호를 입력해 주세요";
      return;
    }
    delBusy = true;
    delErr = "";
    try {
      const err = await remove(idx, ask === "pw" ? pw : undefined);
      if (err) return void (delErr = err);
      delPw = "";
      delOpen = false;
      open = false;
      closing = false;
      setInert(false);
      releaseHistory();
      await tick();
      const back = Math.min(idx, n - 1);
      ((bare ? thumbAt?.(back) : btns[back]) ?? document.querySelector<HTMLElement>(".pick"))?.focus({ preventScroll: true });
    } finally {
      delBusy = false;
    }
  }

  let waiting = $state(false);
  function go(d: number) {
    if (n < 2) return;
    delOpen = false;
    if (more && idx + d >= n) {
      waiting = true;
      onindex?.(n - 1);
      return;
    }
    dir = d;
    idx = (idx + d + n) % n;
    onindex?.(idx);
    view.set({ x: 0, y: 0, s: 1 }, instant);
    p.set(1, instant);
    preload();
  }

  $effect(() => {
    if (waiting && open && idx < n - 1) {
      waiting = false;
      go(1);
    }
  });

  /* ---------- 제스처: 스와이프 / 핀치 / 드래그 / 더블탭 / 휠 ---------- */
  const ptrs = new Map<number, { x: number; y: number }>();
  let start = { x: 0, y: 0, vx: 0, vy: 0, s: 1, d: 0, mx: 0, my: 0, t: 0, moved: false };
  let hist: { x: number; y: number; t: number }[] = [];
  let lastTap = 0;

  const bound = (s: number) => ({ x: Math.max(0, (fit.w * s - SW) / 2), y: Math.max(0, (fit.h * s - (SH - 88)) / 2) });
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  const dist = () => {
    const [a, b] = [...ptrs.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const mid = () => {
    const [a, b] = [...ptrs.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  function down(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = view.current;
    if (ptrs.size === 1) {
      start = { ...start, x: v.x, y: v.y, s: v.s, vx: e.clientX, vy: e.clientY, t: performance.now(), moved: false };
      hist = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    } else if (ptrs.size === 2) {
      const m = mid();
      start = { ...start, x: v.x, y: v.y, s: v.s, d: dist(), mx: m.x, my: m.y };
    }
  }
  function move(e: PointerEvent) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = view.current;
    if (ptrs.size >= 2) {
      const s = Math.max(0.8, Math.min(5, (start.s * dist()) / start.d));
      const m = mid();
      view.set({ s, x: start.x + (m.x - start.mx), y: start.y + (m.y - start.my) }, instant);
      start.moved = true;
      return;
    }
    const dx = e.clientX - start.vx;
    const dy = e.clientY - start.vy;
    if (Math.abs(dx) + Math.abs(dy) > 6) start.moved = true;
    hist.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (hist.length > 6) hist.shift();
    if (v.s > 1.02) {
      const b = bound(v.s);
      const nx = start.x + dx, ny = start.y + dy;
      /* 경계 밖은 고무줄처럼 1/3 만 추종 */
      const rb = (val: number, m: number) => (Math.abs(val) > m ? Math.sign(val) * (m + (Math.abs(val) - m) / 3) : val);
      view.set({ s: v.s, x: rb(nx, b.x), y: rb(ny, b.y) }, instant);
    } else if (Math.abs(dx) > Math.abs(dy) * 0.8 || Math.abs(v.x) > 0) {
      view.set({ s: 1, x: dx, y: 0 }, instant);
    } else {
      view.set({ s: 1, x: 0, y: dy }, instant);
    }
  }
  function up(e: PointerEvent) {
    if (!ptrs.has(e.pointerId)) return;
    const wasPinch = ptrs.size >= 2;
    ptrs.delete(e.pointerId);
    const v = view.current;
    if (wasPinch) {
      const [rest] = [...ptrs.values()];
      if (rest) start = { ...start, x: v.x, y: v.y, vx: rest.x, vy: rest.y, s: v.s };
      if (ptrs.size === 0) settleZoom();
      return;
    }
    if (ptrs.size > 0) return;
    const now = performance.now();
    const a = hist[0], z = hist[hist.length - 1];
    const dt = Math.max(1, z.t - a.t);
    const vx = ((z.x - a.x) / dt) * 1, vy = ((z.y - a.y) / dt) * 1;
    if (!start.moved) {
      const r = lb?.querySelector(".lbp")?.getBoundingClientRect();
      if (!r || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return void close();
      if (now - lastTap < 300) {
        lastTap = 0;
        return void toggleZoom(e.clientX, e.clientY);
      }
      lastTap = now;
      return;
    }
    if (v.s > 1.02) {
      /* 관성: 속도에 비례한 거리만큼 더 미끄러진 뒤 경계 안으로 */
      const b = bound(v.s);
      view.target = { s: v.s, x: clamp(v.x + vx * 260, b.x), y: clamp(v.y + vy * 260, b.y) };
    } else if (Math.abs(v.y) > Math.abs(v.x) && (Math.abs(v.y) > 110 || Math.abs(vy) > 0.8)) {
      void close();
    } else if (Math.abs(v.x) > SW * 0.2 || Math.abs(vx) > 0.5) {
      go(v.x < 0 || vx < -0.5 ? 1 : -1);
    } else view.target = { s: 1, x: 0, y: 0 };
  }
  function settleZoom() {
    const v = view.current;
    if (v.s < 1.05) view.target = { s: 1, x: 0, y: 0 };
    else {
      const b = bound(v.s);
      view.target = { s: v.s, x: clamp(v.x, b.x), y: clamp(v.y, b.y) };
    }
  }
  function toggleZoom(cx: number, cy: number) {
    if (view.current.s > 1.1) return void (view.target = { s: 1, x: 0, y: 0 });
    const s = 2.6;
    const b = bound(s);
    view.target = { s, x: clamp((SW / 2 - cx) * (s - 1), b.x), y: clamp((SH / 2 - cy) * (s - 1), b.y) };
  }
  function wheel(e: WheelEvent) {
    e.preventDefault();
    const s = Math.max(1, Math.min(5, view.current.s * Math.exp(-e.deltaY * 0.0022)));
    const b = bound(s);
    view.set({ s, x: s === 1 ? 0 : clamp(view.current.x, b.x), y: s === 1 ? 0 : clamp(view.current.y, b.y) }, instant);
  }

  function key(e: KeyboardEvent) {
    if (e.key === "Escape") return void (e.preventDefault(), delOpen ? closeDel() : close());
    if ((e.target as HTMLElement).closest?.("input")) return;
    if (e.key === "ArrowRight") return void (e.preventDefault(), go(1));
    if (e.key === "ArrowLeft") return void (e.preventDefault(), go(-1));
    if (e.key === "Tab" && lb) {
      const f = [...lb.querySelectorAll<HTMLElement>("button:not(:disabled), input")];
      const i = f.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : i === f.length - 1 ? 0 : i + 1;
      e.preventDefault();
      f[next]?.focus();
    }
  }
</script>

{#if !bare}
<ul class="gallery">
  {#each items as it, i}
    <li class="cell" data-rv="curtain" style="--d:{320 + Math.min(i, 8) * 60}ms">
      <a
        bind:this={btns[i]}
        class="thumb"
        href={it.full}
        aria-label="사진 {i + 1} 크게 보기"
        onclick={(e) => {
          e.preventDefault();
          void openAt(i);
        }}
      >
        <img src={it.thumb} srcset={it.srcset} sizes="(max-width: 480px) 33vw, 160px" width="360" height="360" alt="갤러리 사진 {i + 1}" loading="lazy" decoding="async" />
      </a>
    </li>
  {/each}
</ul>
{/if}

{#if open && cur}
  <div
    bind:this={lb}
    use:portal
    class="lb"
    role="dialog"
    aria-modal="true"
    aria-label="사진 크게 보기"
    tabindex="-1"
    onkeydown={key}
  >
    <div class="backdrop" style:opacity={dim}></div>
    <div
      class="stage"
      bind:clientWidth={SW}
      bind:clientHeight={SH}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
      onwheel={wheel}
      role="presentation"
    >
      {#key idx}
        <img
          class="lbp"
          src={fullReady ? cur.full : cur.thumb}
          alt="갤러리 사진 {idx + 1}"
          draggable="false"
          style="width:{fit.w}px;height:{fit.h}px;left:{(SW - fit.w) / 2}px;top:{(SH - 88 - fit.h) / 2 + 20}px;{style}"
          in:fly={{ x: reduced() ? 0 : dir * 70, opacity: 0.6, duration: reduced() ? 0 : 340, easing: cubicOut }}
          out:fade={{ duration: reduced() ? 0 : 140 }}
        />
      {/key}
    </div>
    <div class="ui" style:opacity={dim}>
      <span class="count latin" aria-live="polite">{idx + 1} / {Math.max(total ?? 0, n)}</span>
      <button type="button" class="b close" aria-label="닫기" onclick={close}>×</button>
      {#if remove && ask}
        <button type="button" class="del-btn" bind:this={delBtn} aria-haspopup="dialog" aria-expanded={delOpen} onclick={askDel}>삭제</button>
      {/if}
      {#if n > 1}
        <button type="button" class="b prev" aria-label="이전 사진" onclick={() => go(-1)}>‹</button>
        <button type="button" class="b next" aria-label="다음 사진" onclick={() => go(1)}>›</button>
      {/if}
      {#if delOpen}
        <form class="del" role="group" aria-label="사진 삭제" onsubmit={doDel}>
          {#if ask === "confirm"}
            <p class="del-q" id="gdel-q">이 사진을 삭제할까요?</p>
          {:else}
            <label class="del-q" for="gdel-pw">올릴 때 정한 비밀번호를 입력해 주세요</label>
            <div class="pwbox">
              <input id="gdel-pw" type={delShow ? "text" : "password"} bind:this={delInput} bind:value={delPw} maxlength="64" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" aria-invalid={!!delErr} />
              <button type="button" class="pw-eye" aria-pressed={delShow} aria-label={delShow ? "비밀번호 숨기기" : "비밀번호 보기"} onclick={() => (delShow = !delShow)}>{delShow ? "숨기기" : "보기"}</button>
            </div>
            <p class="del-note">비밀번호를 잊으셨다면 신랑·신부에게 말씀해 주세요</p>
          {/if}
          <div class="del-row">
            <button type="submit" class="del-go" disabled={delBusy}>{delBusy ? "삭제 중…" : "삭제"}</button>
            <button type="button" class="del-no" bind:this={delNo} onclick={closeDel}>취소</button>
          </div>
          <p class="del-note">삭제한 사진은 반영까지 시간이 걸릴 수 있어요.</p>
          {#if delErr}<p class="del-err" role="alert">{delErr}</p>{/if}
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .gallery { list-style: none; margin: 32px 0 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .cell { aspect-ratio: 1; position: relative; overflow: hidden; border-radius: 6px; }
  .thumb { display: block; width: 100%; height: 100%; cursor: zoom-in; overflow: hidden; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1); }
  .thumb:hover img, .thumb:focus-visible img { transform: scale(1.07); }

  .lb { position: fixed; inset: 0; z-index: 200; color: #fff; outline: none; }
  .backdrop { position: absolute; inset: 0; background: #0c0b0e; }
  .stage { position: absolute; inset: 0; touch-action: none; overflow: hidden; cursor: grab; }
  .lbp { position: absolute; max-width: none; user-select: none; -webkit-user-drag: none; will-change: transform; box-shadow: 0 10px 50px rgb(0 0 0 / 0.7); }
  .ui { position: absolute; inset: 0; pointer-events: none; }
  .b {
    position: absolute; pointer-events: auto; width: 48px; height: 48px; border-radius: 50%; border: 1px solid rgb(255 255 255 / 0.4);
    background: rgb(0 0 0 / 0.4); color: #fff; font-size: 28px; line-height: 1; cursor: pointer; padding: 0 0 3px;
    transition: background 0.2s, transform 0.2s;
  }
  .b:hover { background: #fff; color: #111; }
  .b:active { transform: scale(0.92); }
  .close { top: max(14px, env(safe-area-inset-top)); right: 14px; }
  .del-btn {
    position: absolute; pointer-events: auto; top: max(14px, env(safe-area-inset-top)); left: 14px; min-width: 56px; height: 48px; padding: 0 16px; border-radius: 24px;
    border: 1px solid rgb(255 255 255 / 0.4); background: rgb(0 0 0 / 0.4); color: #fff; font: inherit; font-size: 15px; font-weight: 500; line-height: 1; cursor: pointer;
  }
  .del-btn:hover { background: #fff; color: #111; }
  .del-btn:focus-visible, .b:focus-visible, .del button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .del {
    position: absolute; pointer-events: auto; left: 16px; right: 16px; bottom: max(64px, calc(env(safe-area-inset-bottom) + 44px)); margin: 0 auto; max-width: 360px;
    display: grid; gap: 10px; padding: 16px; border-radius: 14px; background: rgb(24 22 28 / 0.96); border: 1px solid rgb(255 255 255 / 0.25);
  }
  .del-q { margin: 0; font-size: 14px; line-height: 1.5; color: #fff; }
  .del input { width: 100%; min-height: 48px; padding: 12px 14px; box-sizing: border-box; border-radius: 10px; border: 1px solid rgb(255 255 255 / 0.4); background: #fff; color: #111; font: inherit; font-size: 16px; }
  .del input[aria-invalid="true"] { border-color: #ff8a7a; }
  .del-row { display: flex; gap: 8px; }
  .del-go, .del-no { flex: 1; min-height: 48px; border-radius: 10px; font: inherit; font-size: 15px; font-weight: 500; line-height: 1; cursor: pointer; border: 1px solid rgb(255 255 255 / 0.4); }
  .del-go { background: #c0392b; border-color: #c0392b; color: #fff; }
  .del-go:disabled { opacity: 0.6; cursor: progress; }
  .del-no { background: transparent; color: #fff; }
  .del-note { margin: 0; font-size: 12.5px; line-height: 1.5; color: rgb(255 255 255 / 0.7); }
  .del-err { margin: 0; font-size: 14px; line-height: 1.5; color: #ffb4a8; }
  .prev { left: 10px; top: 50%; margin-top: -24px; }
  .next { right: 10px; top: 50%; margin-top: -24px; }
  .count { position: absolute; left: 0; right: 0; bottom: max(22px, env(safe-area-inset-bottom)); text-align: center; color: rgb(255 255 255 / 0.8); font: 400 14px/1.4 var(--f-latin); }
  @media (prefers-reduced-motion: reduce) { .thumb img { transition: none; } }
  /* 비밀번호 마스킹 + 보기 토글 */
  .pwbox { position: relative; }
  .pwbox input { width: 100%; padding-right: 64px; box-sizing: border-box; }
  .pw-eye { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); min-width: 52px; min-height: 44px; padding: 0 8px; border: 0; background: none; color: var(--ink-3); font: 500 13px/1 var(--f-ui, inherit); cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .pw-eye:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 8px; }
</style>
