<script lang="ts">
  import { onMount, tick } from "svelte";
  
  type Opt = { id: number; text: string; votes: number; mine: boolean };
  type Data = { mode: "kakao" | "device"; options: Opt[]; total: number; myVote: number | null };
  let { api, question, kakaoKey }: { api: string; question: string; kakaoKey: string } = $props();

  const MAX_LEN = 30;
  const MAX_OPTS = 20;
  const REFRESH_MS = 20000;
  const SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js";
  const SDK_SRI = "sha384-BGX7Wb16GmRFagri4bLJV2DgipVZaU2AI812GZtHtHzzDQJnfHasDXN5houxv45w";
  const ADD_ERR: Record<string, string> = {
    duplicate: "이미 있는 후보예요",
    full: `후보가 가득 찼어요 (최대 ${MAX_OPTS}개)`,
    limit: "후보는 한 사람당 2개까지 추가할 수 있어요",
    "too many": "잠시 후 다시 시도해 주세요",
  };

  let root = $state<HTMLElement>();
  let status = $state<"loading" | "ready" | "error">("loading");
  let data = $state<Data>({ mode: "kakao", options: [], total: 0, myVote: null });
  let token = $state("");
  let sel = $state<number | null>(null);
  let text = $state("");
  let textErr = $state("");
  let busy = $state(false);
  let explain = $state(false);
  let note = $state("");
  let noteErr = $state(false);
  let visible = false;
  let gen = 0;

  const voted = $derived(data.myVote !== null);
  const norm = (s: string) => s.trim().normalize("NFKC").replace(/\s+/g, " ");
  const pct = (o: Opt) => (data.total ? Math.round((o.votes / data.total) * 100) : 0);
  const redirectUri = () => new URL(import.meta.env.BASE_URL, location.origin).href.replace(/\/*$/, "/");

  const store = {
    get: (k: string, s = localStorage) => { try { return s.getItem(k) ?? ""; } catch { return ""; } },
    set: (k: string, v: string, s = localStorage) => { try { v ? s.setItem(k, v) : s.removeItem(k); } catch {} },
  };
  const say = (m: string, err = false) => ((note = ""), (noteErr = err), requestAnimationFrame(() => (note = m)));

  async function call(path: string, init: RequestInit = {}): Promise<{ status: number; body: any }> {
    const r = await fetch(api + path, {
      ...init,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  }

  /* 상태를 바꿀 때마다 gen 을 올려, 그 전에 시작한 조회 응답은 폐기 */
  const apply = (b: Data) => (gen++, (data = { mode: b.mode, options: b.options, total: b.total, myVote: b.myVote }), (status = "ready"));

  async function load(quiet = false) {
    const g = ++gen;
    try {
      const { status: s, body } = await call("/poll");
      if (s !== 200 || !Array.isArray(body.options)) throw new Error(String(s));
      if (g === gen) apply(body);
    } catch {
      if (!quiet) status = "error";
    }
  }

  function expire() {
    token = "";
    store.set("poll-token", "");
    data.myVote = null;
    explain = true;
    say("로그인이 만료됐어요. 다시 로그인해 주세요.", true);
  }

  /* 로그인 필요 시 false. device 모드는 즉시 토큰 수령 */
  async function ensureAuth() {
    if (token) return true;
    if (data.mode === "device") {
      const { status: s, body } = await call("/auth/device", { method: "POST" });
      if (s !== 200 || !body.token) throw new Error("device");
      token = body.token;
      store.set("poll-token", token);
      return true;
    }
    explain = true;
    await tick();
    document.getElementById("poll-explain")?.focus();
    return false;
  }

  async function act(fn: () => Promise<void>) {
    if (busy) return;
    busy = true;
    note = "";
    try {
      if (await ensureAuth()) await fn();
    } catch {
      say("잠시 후 다시 시도해 주세요", true);
    } finally {
      busy = false;
    }
  }

  const vote = () =>
    act(async () => {
      if (sel === null) return;
      const { status: s, body } = await call("/poll/vote", { method: "POST", body: JSON.stringify({ optionId: sel }) });
      if (s === 401) return expire();
      if (s === 200 || s === 409) {
        apply(body);
        if (s === 409) say("이미 투표하셨어요");
      } else if (s === 404) {
        await load(true);
        sel = null;
        say("후보가 사라졌어요. 다시 선택해 주세요.", true);
      } else say("잠시 후 다시 시도해 주세요", true);
    });

  const add = (e: SubmitEvent) => {
    e.preventDefault();
    const t = norm(text);
    textErr = !t ? "후보를 입력해 주세요" : t.length > MAX_LEN ? `${MAX_LEN}자 이내로 입력해 주세요` : /[\u0000-\u001f\u007f-\u009f]|\p{Cf}/u.test(text.normalize("NFKC")) ? "사용할 수 없는 문자가 있어요" : "";
    if (textErr) return document.getElementById("poll-add")?.focus();
    void act(async () => {
      const { status: s, body } = await call("/poll/options", { method: "POST", body: JSON.stringify({ text: t }) });
      if (s === 401) return expire();
      if (s === 201) {
        apply(body);
        text = "";
        say("후보를 추가했어요");
      } else {
        textErr = s === 429 ? ADD_ERR["too many"] : (ADD_ERR[body.error] ?? "잠시 후 다시 시도해 주세요");
        document.getElementById("poll-add")?.focus();
      }
    });
  };

  async function login() {
    const st = `poll-${crypto.randomUUID()}`;
    store.set("poll-state", st, sessionStorage);
    store.set("poll-return", "1", sessionStorage);
    store.set("poll-draft", JSON.stringify({ sel, text }), sessionStorage);
    try {
      let K = (window as any).Kakao;
      if (!K) {
        await new Promise<void>((ok, fail) => {
          const s = document.createElement("script");
          s.src = SDK;
          s.integrity = SDK_SRI;
          s.crossOrigin = "anonymous";
          s.onload = () => ok();
          s.onerror = () => fail();
          document.head.append(s);
        });
        K = (window as any).Kakao;
      }
      if (!K.isInitialized()) K.init(kakaoKey);
      K.Auth.authorize({ redirectUri: redirectUri(), state: st });
    } catch {
      say("카카오 로그인을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.", true);
    }
  }

  /* intro 게이트가 열린 뒤 투표 섹션으로 복귀 */
  function backToPoll() {
    /* 위쪽 이미지·지도가 늦게 자리를 잡으며 밀어낼 수 있어 한 번 더 맞춤 */
    const go = () => {
      const to = () => root?.closest("section")?.scrollIntoView({ block: "start" });
      to();
      setTimeout(to, 700);
    };
    const h = document.documentElement;
    if (!h.classList.contains("gated")) return go();
    const mo = new MutationObserver(() => !h.classList.contains("gated") && (mo.disconnect(), go()));
    mo.observe(h, { attributes: true, attributeFilter: ["class"] });
  }

  /* 카카오 리다이렉트 복귀 파라미터를 즉시 URL 에서 지우고 값만 반환 */
  function takeReturn() {
    const q = new URLSearchParams(location.search);
    const state = q.get("state") ?? "";
    if (!state.startsWith("poll-") || !(q.has("code") || q.has("error"))) return null;
    const code = q.get("code");
    for (const k of ["code", "state", "error", "error_description"]) q.delete(k);
    history.replaceState(history.state, "", location.pathname + (q.size ? `?${q}` : "") + location.hash);
    return { state, code };
  }

  async function finishLogin({ state, code }: { state: string; code: string | null }) {
    const draft = (() => { try { return JSON.parse(store.get("poll-draft", sessionStorage) || "{}"); } catch { return {}; } })();
    const expected = store.get("poll-state", sessionStorage);
    if (store.get("poll-return", sessionStorage)) backToPoll();
    for (const k of ["poll-return", "poll-draft", "poll-state"]) store.set(k, "", sessionStorage);
    if (!expected || state !== expected) return say("로그인을 확인하지 못했어요. 다시 로그인해 주세요.", true);
    if (!code) return say("로그인을 취소했어요", true);
    try {
      const { status: s, body } = await call("/auth/kakao", { method: "POST", body: JSON.stringify({ code, redirectUri: redirectUri() }) });
      if (s !== 200 || !body.token) throw new Error(String(s));
      token = body.token;
      store.set("poll-token", token);
      if (typeof draft.sel === "number") sel = draft.sel;
      if (typeof draft.text === "string") text = draft.text.slice(0, MAX_LEN);
      await load(true);
      say("로그인됐어요. 이어서 진행해 주세요.");
    } catch {
      say("로그인에 실패했어요. 다시 시도해 주세요.", true);
    }
  }

  onMount(() => {
    token = store.get("poll-token");
    const ret = takeReturn();
    const first = load();
    if (ret) void first.then(() => finishLogin(ret));
    const io = new IntersectionObserver((e) => (visible = !!e[0]?.isIntersecting));
    if (root) io.observe(root);
    const t = setInterval(() => visible && document.visibilityState === "visible" && !busy && void load(true), REFRESH_MS);
    return () => (io.disconnect(), clearInterval(t));
  });

  $effect(() => {
    if (voted && sel === null) sel = data.myVote;
  });
</script>

<div class="poll" bind:this={root}>
  {#if status === "loading"}
    <div class="skel" aria-hidden="true">{#each [0, 1, 2] as k (k)}<i></i>{/each}</div>
  {:else if status === "error"}
    <p class="cap err-line" role="alert">투표를 불러오지 못했어요 · <button type="button" class="act" onclick={() => ((status = "loading"), load())}>다시 시도</button></p>
  {:else}
    {#if data.options.length === 0}
      <p class="cap empty">아직 후보가 없어요. 첫 후보를 추가해 주세요.</p>
    {:else}
      <div class="opts" role="radiogroup" aria-label={question}>
        {#each data.options as o (o.id)}
          <label class="opt" class:picked={sel === o.id} class:disabled={voted}>
            <input type="radio" name="poll-opt" value={o.id} bind:group={sel} disabled={voted || busy} />
            <span class="top">
              <span class="txt">{o.text}{#if voted && data.myVote === o.id}<b class="mine-tag">✓ 내 선택</b>{/if}</span>
              <span class="num">{o.votes}표 · {pct(o)}%</span>
            </span>
            <span class="bar" aria-hidden="true"><i style:width="{pct(o)}%"></i></span>
          </label>
        {/each}
      </div>
      <p class="hint total">총 {data.total}표</p>
      {#if voted}
        <p class="thanks" role="status">투표해 주셔서 감사해요</p>
      {:else}
        <button type="button" class="pbtn solid" disabled={sel === null || busy} onclick={vote}>{busy ? "처리 중…" : "투표하기"}</button>
      {/if}
    {/if}

    {#if explain && !token}
      <div class="explain" id="poll-explain" tabindex="-1" role="group" aria-label="카카오 로그인 안내">
        <p>중복 투표를 막기 위해 카카오 로그인이 필요해요. 이름·프로필은 가져오지 않아요.</p>
        <div class="row">
          <button type="button" class="pbtn kakao" onclick={login}>카카오로 계속하기</button>
          <button type="button" class="act" onclick={() => (explain = false)}>닫기</button>
        </div>
      </div>
    {/if}

    <form class="add" onsubmit={add} novalidate>
      <label for="poll-add">후보 추가</label>
      <div class="row">
        <input id="poll-add" type="text" bind:value={text} oninput={() => (textErr = "")} maxlength={MAX_LEN} autocomplete="off" enterkeyhint="send" disabled={data.options.length >= MAX_OPTS}
          aria-invalid={!!textErr} aria-describedby={textErr ? "poll-add-e poll-add-c" : "poll-add-c"} placeholder="예: 마녀로 변신한 OO" />
        <button type="submit" class="pbtn" disabled={busy || data.options.length >= MAX_OPTS}>추가</button>
      </div>
      <p class="hint cnt" id="poll-add-c">{data.options.length >= MAX_OPTS ? `후보가 가득 찼어요 (최대 ${MAX_OPTS}개)` : `${text.length} / ${MAX_LEN}`}</p>
      {#if textErr}<p class="err" id="poll-add-e" role="alert">{textErr}</p>{/if}
    </form>
  {/if}
  <p class="msg" class:bad={noteErr} role="status" aria-live="polite">{note}</p>
</div>

<style>
  .poll { text-align: left; }
  label { font-size: 13px; line-height: 1.5; color: var(--ink-2); }
  .opts { display: grid; gap: 10px; }
  .opt {
    position: relative; display: grid; gap: 10px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--ink);
    cursor: pointer; -webkit-tap-highlight-color: transparent;
  }
  .opt.disabled { cursor: default; }
  .opt input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: inherit; }
  .opt.picked { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
  .opt:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
  .top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .txt { font-size: 15px; line-height: 1.5; overflow-wrap: anywhere; min-width: 0; }
  .mine-tag { margin-left: 8px; font-size: 12.5px; color: var(--accent-text); white-space: nowrap; }
  .num { flex: none; font-size: 13px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .bar { display: block; height: 6px; border-radius: 3px; background: var(--track); overflow: hidden; }
  .bar i { display: block; height: 100%; border-radius: 3px; background: var(--accent); transition: width 500ms var(--e-out, ease); }
  .hint { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--ink-3); }
  .total { margin: 10px 0 14px; text-align: right; }
  .thanks { margin: 0; text-align: center; font-size: 14px; font-weight: 700; color: var(--accent-text); }
  .empty { margin: 8px 0 20px; text-align: center; }
  .err-line { margin: 20px 0 0; text-align: center; }

  .pbtn {
    display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; min-height: 48px; padding: 0 20px; border: 1px solid var(--line); border-radius: 12px;
    background: var(--surface); color: var(--ink); font: 400 14.5px/1 var(--f-ui, inherit); cursor: pointer; -webkit-tap-highlight-color: transparent;
  }
  .pbtn.solid { display: flex; width: 100%; max-width: 280px; margin: 0 auto; border-radius: 9999px; background: var(--ink); border-color: var(--ink); color: var(--bg); }
  .pbtn.kakao { background: #fee500; border-color: #fee500; color: #191919; }
  .pbtn:disabled { opacity: 0.5; cursor: default; }
  .pbtn:focus-visible, .act:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .act { all: unset; box-sizing: border-box; min-height: 44px; min-width: 44px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; color: var(--ink); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }

  .explain { display: grid; gap: 10px; margin: 16px 0 0; padding: 14px 16px; border: 1px solid var(--accent); border-radius: 12px; background: var(--surface); outline: none; }
  .explain p { margin: 0; font-size: 14px; line-height: 1.7; color: var(--ink-2); }
  .explain:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

  .add { display: grid; gap: 8px; margin-top: 28px; }
  .add .row { flex-wrap: nowrap; }
  input[type="text"] {
    flex: 1 1 0; width: 100%; min-width: 0; min-height: 48px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--ink);
    font: inherit; font-size: 16px; line-height: 1.5; box-sizing: border-box;
  }
  input[type="text"]:focus { outline: 2px solid var(--accent); outline-offset: 0; }
  input[type="text"]:disabled { opacity: 0.6; }
  input[aria-invalid="true"] { border-color: #c0392b; }
  .cnt { text-align: right; }
  .err { margin: 0; font-size: 14px; line-height: 1.5; color: #c0392b; }
  .msg { margin: 14px 0 0; min-height: 1.5em; text-align: center; font-size: 14px; line-height: 1.5; color: var(--ink-2); }
  .msg.bad { color: #c0392b; }

  .skel { display: grid; gap: 10px; }
  .skel i { display: block; height: 62px; border-radius: 12px; background: var(--track); opacity: 0.5; animation: poll-pulse 1.2s ease-in-out infinite alternate; }
  @keyframes poll-pulse { from { opacity: 0.5; } to { opacity: 0.8; } }
  @media (prefers-reduced-motion: reduce) { .skel i { animation: none; } .bar i { transition: none; } }
</style>
