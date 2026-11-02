<script lang="ts">
  import { onMount, tick } from "svelte";
  import { flip } from "svelte/animate";
  import { slide } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import Toast from "./ui/Toast.svelte";
  import { reduced } from "../lib/motion";
  import { portal } from "../lib/portal";

  type Entry = { id: number; name: string; message: string; created_at: number };
  let { api }: { api: string } = $props();

  const HEAD = 5;
  const PAGE = 10;
  const CTRL = /[\u0000-\u001f\u007f-\u009f]/;
  const JSON_HEADERS = { "Content-Type": "application/json" };

  let mounted = $state(false);
  let status = $state<"loading" | "ready" | "error">("loading");
  let items = $state<Entry[]>([]);
  let cursor = $state<number | null>(null);
  let expanded = $state(false);
  let moreLoading = $state(false);
  let moreErr = $state(false);
  let inflight = false;
  let batchFrom = 0;
  let freshId = $state(0);
  let deleting = false;
  let sentinel = $state<HTMLElement>();
  let announce = $state("");

  let name = $state("");
  let message = $state("");
  let password = $state("");
  let errs = $state<{ name?: string; message?: string; password?: string; form?: string }>({});
  let busy = $state(false);

  let confirmId = $state<number | null>(null);
  let delPw = $state("");
  let delErr = $state("");
  let delBusy = $state(false);

  let toast = $state<{ id: number; msg: string; warn: boolean } | null>(null);
  let formOpen = $state(false);
  let seq = 0;

  const canExpand = $derived(items.length > HEAD || cursor !== null);
  const open = $derived(expanded && canExpand);
  const visible = $derived(open ? items : items.slice(0, HEAD));
  const hiddenN = $derived(Math.max(items.length - HEAD, 0));
  const toggleLabel = $derived(`메시지 더보기${cursor !== null ? ` (${hiddenN}+)` : hiddenN ? ` (${hiddenN})` : ""}`);

  const motion = (ms: number) => (reduced() ? 0 : ms);
  const say = (s: string) => {
    announce = "";
    requestAnimationFrame(() => (announce = s));
  };
  const notify = (msg: string, warn = false) => {
    toast = { id: ++seq, msg, warn };
  };
  const heading = () => document.getElementById("gb-h");

  /* 서버는 KST 날짜 그대로 표시하므로 UTC+9 로 밀어 UTC getter 로 읽는다 */
  function dateKst(ms: number) {
    const d = new Date(ms + 9 * 3600e3);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())}`;
  }

  /* 서버 검증과 동일: trim 후 길이 범위, 제어문자 불가(메시지만 줄바꿈 허용) */
  function bad(v: string, min: number, max: number, multiline = false) {
    const c = multiline ? v.replace(/\r?\n/g, "") : v;
    return v.length < min || v.length > max || CTRL.test(c);
  }
  function check(v: { name: string; message: string; password: string }) {
    const e: typeof errs = {};
    if (bad(v.name, 1, 20)) e.name = "이름을 20자 이내로 입력해 주세요";
    if (bad(v.message, 1, 300, true)) e.message = CTRL.test(v.message.replace(/\r?\n/g, "")) ? "제어 문자는 사용할 수 없어요" : "메시지를 300자 이내로 입력해 주세요";
    if (bad(v.password, 4, 64)) e.password = "비밀번호는 4~64자로 입력해 주세요";
    return e;
  }
  const SERVER_MSG: Record<string, [keyof typeof errs, string]> = {
    "invalid name": ["name", "이름을 1~20자로 확인해 주세요"],
    "invalid message": ["message", "메시지를 1~300자로 확인해 주세요"],
    "invalid password": ["password", "비밀번호를 4~64자로 확인해 주세요"],
  };

  async function load(first: boolean) {
    if (inflight) return;
    inflight = true;
    if (first) status = "loading";
    else {
      moreLoading = true;
      moreErr = false;
    }
    try {
      const q = new URLSearchParams({ limit: String(PAGE) });
      if (!first && cursor !== null) q.set("cursor", String(cursor));
      const r = await fetch(`${api}/entries?${q}`);
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as { items: Entry[]; nextCursor: number | null };
      if (!Array.isArray(d.items)) throw new Error("shape");
      batchFrom = first ? 0 : items.length;
      items = first ? d.items : [...items, ...d.items];
      cursor = d.nextCursor ?? null;
      status = "ready";
      if (!first) say(`${d.items.length}개의 축하 글을 더 불러왔어요`);
    } catch {
      if (first) status = "error";
      else moreErr = true;
    } finally {
      inflight = false;
      moreLoading = false;
    }
  }

  onMount(() => {
    mounted = true;
    void load(true);
  });

  /* 펼친 목록 끝의 sentinel 이 보이면 다음 페이지. 로딩이 끝날 때마다 새 observer 로 재판정한다 */
  $effect(() => {
    if (!open || cursor === null || moreLoading || moreErr || !sentinel) return;
    const io = new IntersectionObserver(([x]) => x.isIntersecting && void load(false), { rootMargin: "300px" });
    io.observe(sentinel);
    return () => io.disconnect();
  });

  /* 삭제로 5개 미만이 됐는데 서버에 더 있으면 채운다 */
  $effect(() => {
    if (status === "ready" && !open && items.length < HEAD && cursor !== null) void load(false);
  });

  async function openForm() {
    formOpen = true;
    await tick();
    document.getElementById("gb-name")?.focus();
  }
  async function closeForm() {
    formOpen = false;
    await tick();
    document.getElementById("gb-open")?.focus();
  }

  function expand() {
    batchFrom = HEAD;
    expanded = true;
    say("축하 글을 모두 펼쳤어요");
  }

  async function collapse() {
    expanded = false;
    say("축하 글을 접었어요");
    const h = heading();
    h?.scrollIntoView({ behavior: reduced() ? "instant" : "smooth", block: "start" });
    await tick();
    h?.focus({ preventScroll: true });
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (busy) return;
    const v = { name: name.trim(), message: message.trim(), password: password.trim() };
    errs = check(v);
    const first = (["name", "message", "password"] as const).find((k) => errs[k]);
    if (first) {
      document.getElementById(`gb-${first}`)?.focus();
      return;
    }
    busy = true;
    try {
      const r = await fetch(`${api}/entries`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(v) });
      if (r.status === 201) {
        const entry = (await r.json()) as Entry;
        deleting = false;
        batchFrom = 0;
        freshId = entry.id;
        items = [entry, ...items];
        name = message = password = "";
        formOpen = false;
        notify("축하 글이 등록되었습니다");
        await tick();
        document.getElementById("gb-open")?.focus({ preventScroll: true });
        document.getElementById(`gb-c-${entry.id}`)?.scrollIntoView({ behavior: reduced() ? "instant" : "smooth", block: "nearest" });
      } else if (r.status === 429) {
        notify("잠시 후 다시 작성해 주세요", true);
      } else if (r.status === 400) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        const k = SERVER_MSG[d.error ?? ""];
        errs = k ? { [k[0]]: k[1] } : { form: "입력 내용을 다시 확인해 주세요" };
      } else {
        notify("잠시 후 다시 시도해 주세요", true);
      }
    } catch {
      notify("잠시 후 다시 시도해 주세요", true);
    } finally {
      busy = false;
    }
  }

  function askDelete(id: number) {
    confirmId = id;
    delPw = "";
    delErr = "";
    void tick().then(() => document.getElementById(`gb-dp-${id}`)?.focus());
  }
  function cancelDelete() {
    const id = confirmId;
    confirmId = null;
    void tick().then(() => document.getElementById(`gb-del-${id}`)?.focus());
  }

  async function drop(id: number) {
    const idx = visible.findIndex((x) => x.id === id);
    const near = visible[idx + 1] ?? visible[idx - 1];
    deleting = true;
    confirmId = null;
    items = items.filter((x) => x.id !== id);
    say("축하 글을 삭제했어요");
    setTimeout(() => (deleting = false), 500);
    await tick();
    const t = near && document.getElementById(`gb-c-${near.id}`);
    (t || heading())?.focus({ preventScroll: true });
  }

  async function remove(e: SubmitEvent, id: number) {
    e.preventDefault();
    if (delBusy) return;
    const pw = delPw.trim();
    if (!pw) {
      delErr = "비밀번호를 입력해 주세요";
      return;
    }
    delBusy = true;
    delErr = "";
    try {
      const r = await fetch(`${api}/entries/${id}`, { method: "DELETE", headers: JSON_HEADERS, body: JSON.stringify({ password: pw }) });
      if (r.status === 204 || r.status === 404) {
        delBusy = false;
        await drop(id);
        if (r.status === 204) notify("삭제했어요");
      } else if (r.status === 403) delErr = "비밀번호가 맞지 않아요";
      else if (r.status === 400) delErr = "비밀번호를 입력해 주세요";
      else delErr = "잠시 후 다시 시도해 주세요";
    } catch {
      delErr = "잠시 후 다시 시도해 주세요";
    } finally {
      delBusy = false;
    }
  }

  /* 목록 카드는 rise 스태거(배치 내 6개까지 60ms, 나머지 즉시), 새 글은 scale .98 → 1 */
  function enter(node: Element, p: { i: number; fresh: boolean }) {
    if (reduced()) return { duration: 0 };
    if (p.fresh) return { duration: 320, easing: cubicOut, css: (t: number) => `opacity:${t};transform:scale(${0.98 + 0.02 * t})` };
    const n = Math.max(p.i - batchFrom, 0);
    if (n >= 6) return { duration: 0 };
    return { delay: n * 60, duration: 420, easing: cubicOut, css: (t: number, u: number) => `opacity:${t};transform:translateY(${12 * u}px)` };
  }
  /* 삭제는 흐름에서 빼서 나머지가 flip 으로 올라오게 하고, 접기는 높이를 줄인다 */
  function leave(node: Element) {
    if (reduced()) return { duration: 0 };
    if (!deleting) return slide(node, { duration: 360, easing: cubicOut });
    const el = node as HTMLElement;
    Object.assign(el.style, { position: "absolute", top: `${el.offsetTop}px`, left: `${el.offsetLeft}px`, width: `${el.offsetWidth}px`, margin: "0", pointerEvents: "none" });
    return { duration: 300, css: (t: number, u: number) => `opacity:${t};transform:translateY(${-10 * u}px) scale(${1 - 0.05 * u})` };
  }
</script>

<div class="gb">
  <p class="sr" role="status" aria-live="polite">{announce}</p>

  {#if mounted && !formOpen}
    <button type="button" id="gb-open" class="btn-outline open-form" data-press aria-expanded="false" aria-controls="gb-form" onclick={openForm}>방명록 작성하기</button>
  {/if}

  {#if mounted && formOpen}
    <form class="form" id="gb-form" onsubmit={submit} novalidate aria-label="축하 글 쓰기">
      <div class="field">
        <label for="gb-name">이름</label>
        <input id="gb-name" bind:value={name} maxlength="20" autocomplete="name" aria-invalid={!!errs.name} aria-describedby={errs.name ? "gb-name-e" : undefined} />
        {#if errs.name}<p class="err" id="gb-name-e" role="alert">{errs.name}</p>{/if}
      </div>
      <div class="field">
        <label for="gb-message">메시지</label>
        <textarea
          id="gb-message"
          bind:value={message}
          rows="4"
          maxlength="300"
          aria-invalid={!!errs.message}
          aria-describedby={errs.message ? "gb-message-e gb-count" : "gb-count"}        ></textarea>
        <p class="count" id="gb-count">{message.length} / 300</p>
        {#if errs.message}<p class="err" id="gb-message-e" role="alert">{errs.message}</p>{/if}
      </div>
      <div class="field">
        <label for="gb-password">비밀번호</label>
        <input
          id="gb-password"
          type="password"
          bind:value={password}
          maxlength="64"
          autocomplete="new-password"
          aria-invalid={!!errs.password}
          aria-describedby={errs.password ? "gb-password-e gb-pw-hint" : "gb-pw-hint"}
        />
        <p class="hint" id="gb-pw-hint">삭제할 때 필요해요 (4~64자)</p>
        {#if errs.password}<p class="err" id="gb-password-e" role="alert">{errs.password}</p>{/if}
      </div>
      {#if errs.form}<p class="err" role="alert">{errs.form}</p>{/if}
      <div class="form-btns">
        <button type="button" class="gbtn" data-press onclick={closeForm}>닫기</button>
        <button type="submit" class="gbtn solid" data-press disabled={busy} aria-busy={busy}>{busy ? "등록 중…" : "등록하기"}</button>
      </div>
    </form>
  {/if}

  <div class="list" id="gb-list">
    {#if status === "loading" || !mounted}
      <div class="skel" aria-hidden="true" class:live={mounted}>
        {#each [0, 1, 2] as k (k)}
          <i class="sk"></i>
        {/each}
      </div>
      {#if mounted}<p class="sr">축하 글을 불러오는 중이에요</p>{/if}
    {:else if status === "error"}
      <p class="cap err-line" role="alert">방명록을 불러오지 못했어요 · <button type="button" class="btn-text" onclick={() => load(true)}>다시 시도</button></p>
    {:else if items.length === 0}
      <div class="empty">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3.5V16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z" /></svg>
        <p class="cap">첫 축하 글을 남겨 주세요.</p>
      </div>
    {:else}
      <ul class="cards">
        {#each visible as e, i (e.id)}
          <li
            class="card"
            class:fresh={e.id === freshId}
            id="gb-c-{e.id}"
            tabindex="-1"
            in:enter={{ i, fresh: e.id === freshId }}
            out:leave
            animate:flip={{ duration: motion(320) }}
          >
            <div class="meta">
              <b class="who">{e.name}</b>
              <time class="when" datetime={new Date(e.created_at + 9 * 3600e3).toISOString().slice(0, 10)}>{dateKst(e.created_at)}</time>
            </div>
            <p class="msg">{e.message}</p>
            {#if confirmId === e.id}
              <form class="del" onsubmit={(ev) => remove(ev, e.id)} transition:slide={{ duration: motion(240) }} aria-label="축하 글 삭제 확인">
                <label for="gb-dp-{e.id}">글을 쓸 때 입력한 비밀번호</label>
                <div class="del-row">
                  <input
                    id="gb-dp-{e.id}"
                    type="password"
                    bind:value={delPw}
                    maxlength="64"
                    autocomplete="current-password"
                    aria-invalid={!!delErr}
                    aria-describedby={delErr ? `gb-de-${e.id}` : undefined}
                    onkeydown={(ev) => ev.key === "Escape" && cancelDelete()}
                  />
                  <button type="submit" class="btn-text" disabled={delBusy}>{delBusy ? "확인 중…" : "삭제"}</button>
                  <button type="button" class="btn-text" onclick={cancelDelete}>취소</button>
                </div>
                {#if delErr}<p class="err" id="gb-de-{e.id}" role="alert">{delErr}</p>{/if}
              </form>
            {:else}
              <button type="button" class="rm" id="gb-del-{e.id}" aria-label="{e.name}님의 글 삭제" onclick={() => askDelete(e.id)}>&times;</button>
            {/if}
          </li>
        {/each}
      </ul>

      {#if canExpand && !open}
        <button type="button" class="gbtn more" data-press aria-expanded="false" aria-controls="gb-list" onclick={expand}>{toggleLabel}</button>
      {/if}

      {#if open}
        <div class="stick"><button type="button" class="gbtn fold" data-press onclick={collapse}>접기</button></div>
        {#if cursor !== null}
          <div class="tail" bind:this={sentinel}>
            {#if moreErr}
              <p>불러오지 못했어요</p>
              <button type="button" class="btn-text" onclick={() => load(false)}>다시 시도</button>
            {:else}
              <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
              <span>불러오는 중…</span>
            {/if}
          </div>
        {:else}
          <div class="tail end">
            <p>모든 축하 글을 다 보았어요</p>
            <button type="button" class="btn-text" onclick={collapse}>접기</button>
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</div>

{#if toast}
  <div class="toasts" use:portal>
    {#key toast.id}
      <Toast msg={toast.msg} warn={toast.warn} onend={() => (toast = null)} />
    {/key}
  </div>
{/if}

<style>
  .gb { text-align: left; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

  .gbtn {
    display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; height: 48px; padding: 0 20px; border: 1px solid var(--line); border-radius: 12px;
    background: var(--surface); color: var(--ink); font: 400 14.5px/1 var(--f-ui, inherit); cursor: pointer; -webkit-tap-highlight-color: transparent;
  }
  .gbtn.solid { background: var(--ink); border-color: var(--ink); color: var(--bg); }
  .gbtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .open-form { display: flex; width: 100%; max-width: 280px; min-height: 48px; margin: 0 auto 24px; border-radius: 9999px; }
  .form { display: grid; gap: 16px; margin-bottom: 28px; animation: gb-in 320ms var(--e-out, ease) both; }
  @keyframes gb-in { from { opacity: 0; transform: translateY(8px); } }
  .field { display: grid; gap: 8px; }
  label { font-size: 13px; line-height: 1.5; color: var(--ink-2); }
  input, textarea {
    width: 100%; min-height: 48px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--ink);
    font: inherit; font-size: 16px; line-height: 1.5; box-sizing: border-box;
  }
  textarea { resize: vertical; min-height: 112px; }
  input:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 0; }
  input[aria-invalid="true"], textarea[aria-invalid="true"] { border-color: #c0392b; }
  .count, .hint { font-size: 12.5px; color: var(--ink-3); line-height: 1.5; margin: 0; }
  .count { text-align: right; }
  .err { margin: 0; font-size: 14px; color: #c0392b; line-height: 1.5; }

  .form-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .form-btns :global(button:disabled) { opacity: 0.7; cursor: progress; }

  .list { position: relative; }
  .cards { list-style: none; margin: 0; padding: 0; position: relative; display: grid; gap: 10px; }
  .card { position: relative; padding: 16px 18px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); outline: none; }
  .card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .meta { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .who { font-size: 14px; font-weight: 700; color: var(--ink); overflow-wrap: anywhere; line-height: 1.5; }
  .when { flex: none; font-size: 12px; color: var(--ink-3); letter-spacing: 0; }
  .msg { margin: 6px 0 0; font-size: 14px; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; color: var(--ink-2); }
  .rm {
    all: unset; box-sizing: border-box; position: absolute; top: 6px; right: 6px; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; cursor: pointer;
    font-size: 18px; line-height: 1; color: var(--ink-3);
  }
  .meta { padding-right: 28px; }
  .rm:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .del { display: grid; gap: 6px; margin-top: 8px; padding-top: 8px; }
  .del-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .del-row input { flex: 1 1 140px; width: auto; min-width: 0; }
  .del-row :global(.btn-text) { all: unset; box-sizing: border-box; min-height: 44px; padding: 0 10px; display: inline-flex; align-items: center; font-size: 14px; color: var(--ink); cursor: pointer; }

  .del-row :global(.btn-text:focus-visible), .tail :global(.btn-text:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }

  .more { display: flex; width: 100%; margin-top: 10px; }
  .stick { position: sticky; bottom: calc(14px + env(safe-area-inset-bottom)); z-index: 5; display: flex; justify-content: center; pointer-events: none; margin: 4px 0; }
  .fold { pointer-events: auto; width: auto; padding: 0 24px; }
  .tail { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px 0 6px; font-size: 13px; color: var(--ink-3); }
  .tail p { margin: 0; }
  .tail.end { padding-top: 10px; }
  .tail :global(.btn-text) { all: unset; min-height: 44px; padding: 0 10px; display: inline-flex; align-items: center; font-size: 14px; color: var(--ink); cursor: pointer; }
  .dots { display: inline-flex; gap: 6px; }
  .dots i { width: 5px; height: 5px; border-radius: 50%; background: var(--ink-3); }

  .err-line { margin: 20px 0 0; text-align: center; }
  .err-line :global(.btn-text) { all: unset; cursor: pointer; padding: 14px 4px; margin: -14px 0; color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }
  .err-line :global(.btn-text:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
  .empty { display: grid; justify-items: center; gap: 8px; padding: 12px 0; animation: gb-in 420ms var(--e-out, ease) both; }
  .empty svg { width: 28px; height: 28px; fill: none; stroke: var(--ink-3); stroke-width: 1.3; stroke-linejoin: round; opacity: 0.7; }
  .empty p { margin: 0; }

  .skel { display: grid; gap: 10px; }
  .sk { display: block; height: 72px; border-radius: 12px; background: var(--track); opacity: 0.5; }
  .skel.live .sk { animation: gb-pulse 1.2s ease-in-out infinite alternate; }
  .skel.live .sk:nth-child(2) { animation-delay: 150ms; }
  .skel.live .sk:nth-child(3) { animation-delay: 300ms; }
  @keyframes gb-pulse { from { opacity: 0.5; } to { opacity: 0.8; } }

  .card.fresh::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; border-radius: 12px 12px 0 0; background: var(--accent); transform-origin: 0 50%; animation: gb-bar 1800ms var(--e-io, ease) both; }
  @keyframes gb-bar { 0% { transform: scaleX(0); opacity: 1; } 25%, 70% { transform: scaleX(1); opacity: 1; } 100% { transform: scaleX(1); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .skel.live .sk, .form, .empty { animation: none; }
    .card.fresh::before { display: none; }
  }

  .toasts { position: fixed; left: 0; right: 0; bottom: var(--toast-bottom, 24px); display: grid; justify-items: center; z-index: 150; pointer-events: none; }
</style>
