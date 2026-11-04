<script lang="ts">
  import { onMount } from "svelte";
  import { reduced } from "../lib/motion";
  import Gallery from "./Gallery.svelte";
  import Toast from "./ui/Toast.svelte";
  import { compress, type Compressed } from "../lib/compress";
  import { portal } from "../lib/portal";

  type Photo = { id: number; uuid: string; w: number; h: number; ext: string; thumb: string; full: string };
  type State = "wait" | "compress" | "upload" | "done" | "fail";
  type Job = { id: number; file: File; uuid: string; state: State; pct: number; orig: number; out: number; err: string; url: string; pw: string };
  let { api, cdn = "" }: { api: string; cdn?: string } = $props();

  const MAX_PICK = 20;
  const CONCURRENCY = 2;
  const RETRIES = 3;
  const PAGE = 30;
  const PREFETCH = 6;
  const GENERIC = "업로드에 실패했어요. 다시 시도해 주세요.";
  const JSON_HEADERS = { "Content-Type": "application/json" };

  let mounted = $state(false);
  let status = $state<"loading" | "ready" | "error">("loading");
  let photos = $state<Photo[]>([]);
  let cursor = $state<number | null>(null);
  let moreBusy = $state(false);
  let moreFailed = $state(false);
  let overall = $state(0);
  let cur = $state(0);
  let live = $state("");
  let track = $state<HTMLElement>();
  let sentinel = $state<HTMLElement>();
  let gal = $state<{ openAt(i: number): void }>();
  let raf = 0;
  let liveTimer: ReturnType<typeof setTimeout> | undefined;
  let jobs = $state<Job[]>([]);
  let pw = $state("");
  let pwErr = $state("");
  let announce = $state("");
  let toast = $state<{ id: number; msg: string; warn: boolean } | null>(null);
  let delId = $state<number | null>(null);
  let delPw = $state("");
  let delErr = $state("");
  let delBusy = $state(false);
  let input = $state<HTMLInputElement>();
  let seq = 0;
  let running = 0;
  let wake: { release(): Promise<void> } | null = null;
  const packed = new Map<number, Compressed>();
  /* 압축은 한 번에 하나씩(대용량 디코드 메모리 보호). 업로드는 CONCURRENCY 개까지 병렬 */
  let zq: Promise<unknown> = Promise.resolve();
  const compressSerial = (f: File) => {
    const p = zq.then(() => compress(f));
    zq = p.then(() => {}, () => {});
    return p;
  };

  const busy = $derived(jobs.some((j) => j.state === "wait" || j.state === "compress" || j.state === "upload"));
  const doneN = $derived(jobs.filter((j) => j.state === "done").length);
  const failN = $derived(jobs.filter((j) => j.state === "fail").length);
  const LABEL: Record<State, string> = { wait: "대기", compress: "압축 중", upload: "업로드 중", done: "완료", fail: "실패" };

  const notify = (msg: string, warn = false) => (toast = { id: ++seq, msg, warn });
  const mb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
  const saved = (j: Job) => `${mb(j.orig)} → ${mb(j.out)} (−${Math.min(99, Math.max(0, Math.round((1 - j.out / j.orig) * 100)))}%)`;
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  function deviceId() {
    try {
      let d = localStorage.getItem("snap-device");
      if (!d) localStorage.setItem("snap-device", (d = crypto.randomUUID()));
      return d;
    } catch {
      return (deviceMem ||= crypto.randomUUID());
    }
  }
  let deviceMem = "";

  class HttpErr extends Error {
    status: number;
    constructor(status: number) {
      super(String(status));
      this.status = status;
    }
  }

  const base = cdn.replace(/\/+$/, "");
  const toPhoto = (e: Photo): Photo => ({
    id: e.id, uuid: e.uuid, w: e.w, h: e.h, ext: e.ext,
    thumb: base ? `${base}/thumb/${e.uuid}.${e.ext}` : e.thumb,
    full: base ? `${base}/full/${e.uuid}.${e.ext}` : e.full,
  });
  const items = $derived(photos.map((p) => ({ thumb: p.thumb, srcset: `${p.thumb} 480w`, full: p.full, w: p.w, h: p.h })));
  const count = $derived(Math.max(overall, photos.length));

  async function load(first: boolean) {
    if (!first) {
      if (moreBusy || cursor === null) return;
      moreBusy = true;
      moreFailed = false;
    }
    try {
      const q = new URLSearchParams({ limit: String(PAGE) });
      if (!first && cursor !== null) q.set("cursor", String(cursor));
      const r = await fetch(`${api}/photos?${q}`);
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as { items: Photo[]; nextCursor: number | null; total?: number };
      if (!Array.isArray(d.items)) throw new Error("shape");
      const have = new Set(photos.map((p) => p.uuid));
      photos = first ? d.items.map(toPhoto) : [...photos, ...d.items.filter((p) => !have.has(p.uuid)).map(toPhoto)];
      cursor = d.nextCursor ?? null;
      if (typeof d.total === "number") overall = d.total;
      status = "ready";
    } catch {
      if (first) status = "error";
      else moreFailed = true;
    } finally {
      moreBusy = false;
    }
  }

  /* 끝에서 PREFETCH 장 이내로 다가오면 다음 페이지를 미리 불러온다 */
  $effect(() => {
    void photos.length;
    void moreBusy;
    if (!sentinel || !track || cursor === null || moreFailed) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && void load(false), { root: track, rootMargin: "0px 1500px 0px 0px" });
    io.observe(sentinel);
    return () => io.disconnect();
  });

  const step = () => {
    const li = track?.querySelectorAll<HTMLElement>("li.it");
    return li && li.length > 1 ? li[1].offsetLeft - li[0].offsetLeft : (li?.[0]?.offsetWidth ?? 1);
  };

  function sync() {
    raf = 0;
    if (!track) return;
    const last = photos.length - 1;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    cur = Math.max(0, Math.min(last, atEnd && cursor === null ? last : Math.round(track.scrollLeft / step())));
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => (live = `${cur + 1} / ${count}`), 250);
  }

  const onscroll = () => (raf ||= requestAnimationFrame(sync));

  function slide(d: number) {
    const per = Math.max(1, Math.floor((track?.clientWidth ?? 0) / step()));
    track?.scrollBy({ left: d * per * step(), behavior: reduced() ? "auto" : "smooth" });
  }

  function onkey(e: KeyboardEvent) {
    if ((e.key !== "ArrowRight" && e.key !== "ArrowLeft") || (e.target as HTMLElement).closest("input")) return;
    e.preventDefault();
    slide(e.key === "ArrowRight" ? 1 : -1);
  }

  const thumbAt = (i: number) => track?.querySelectorAll<HTMLElement>("li.it .card")[i];

  function follow(i: number) {
    thumbAt(i)?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "instant" as ScrollBehavior });
    if (i >= photos.length - PREFETCH) void load(false);
  }

  onMount(() => {
    mounted = true;
    void load(true);
    const warn = (e: BeforeUnloadEvent) => busy && e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => {
      removeEventListener("beforeunload", warn);
      jobs.forEach((j) => URL.revokeObjectURL(j.url));
    };
  });

  /* 업로드 중에만 화면 켜짐 유지 */
  $effect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } };
    if (busy && !wake && nav.wakeLock) {
      void nav.wakeLock.request("screen").then((l) => (busy ? (wake = l) : void l.release()), () => {});
    } else if (!busy && wake) {
      void wake.release().catch(() => {});
      wake = null;
    }
  });

  $effect(() => {
    if (!mounted || jobs.length === 0) return;
    if (!busy) announce = `${doneN}장 업로드 완료${failN ? `, ${failN}장 실패` : ""}`;
  });

  function pick(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const files = [...(el.files ?? [])];
    el.value = "";
    if (!files.length) return;
    if (files.length > MAX_PICK) notify(`한 번에 ${MAX_PICK}장까지 올릴 수 있어요`, true);
    const add = files.slice(0, MAX_PICK).map(
      (file): Job => ({ id: ++seq, file, uuid: crypto.randomUUID(), state: "wait", pct: 0, orig: file.size, out: 0, err: "", url: "", pw: pw.trim() }),
    );
    jobs = [...jobs, ...add];
    pump();
  }

  function openPicker() {
    const v = pw.trim();
    if (v && (v.length < 4 || v.length > 64)) {
      pwErr = "비밀번호는 4~64자로 입력해 주세요";
      document.getElementById("snap-pw")?.focus();
      return;
    }
    pwErr = "";
    input?.click();
  }

  function pump() {
    while (running < CONCURRENCY) {
      const j = jobs.find((x) => x.state === "wait");
      if (!j) return;
      running++;
      j.state = "compress";
      void run(j).finally(() => {
        running--;
        pump();
      });
    }
  }

  function retry(j: Job) {
    j.state = "wait";
    j.err = "";
    pump();
  }

  /* 네트워크/5xx 만 1·2·4초 뒤 재시도. 429(한도)는 재시도하지 않는다 */
  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let i = 0; ; i++) {
      try {
        return await fn();
      } catch (e) {
        const s = e instanceof HttpErr ? e.status : 0;
        if (!(s === 0 || s >= 500) || i >= RETRIES) throw e;
        await sleep(1000 * 2 ** i);
      }
    }
  }

  function putXhr(j: Job, kind: "full" | "thumb", blob: Blob, onProgress: (loaded: number) => void) {
    return new Promise<void>((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open("PUT", `${api}/photos/${j.uuid}/${kind}`);
      x.setRequestHeader("X-Device", deviceId());
      x.upload.onprogress = (e) => onProgress(e.loaded);
      x.onerror = x.ontimeout = () => reject(new HttpErr(0));
      x.onload = () => (x.status < 300 || x.status === 409 ? resolve() : reject(new HttpErr(x.status)));
      x.send(blob);
    });
  }

  async function commit(j: Job, c: Compressed) {
    const r = await fetch(`${api}/photos/${j.uuid}/commit`, {
      method: "POST",
      headers: { ...JSON_HEADERS, "X-Device": deviceId() },
      body: JSON.stringify({ w: c.w, h: c.h, size: c.full.blob.size, ...(j.pw ? { pw: j.pw } : {}) }),
    }).catch(() => new HttpErr(0));
    if (r instanceof HttpErr) throw r;
    if (r.status !== 200 && r.status !== 201) throw new HttpErr(r.status);
    return toPhoto((await r.json()) as Photo);
  }

  async function run(j: Job) {
    try {
      let c = packed.get(j.id);
      if (!c) {
        c = await compressSerial(j.file);
        packed.set(j.id, c);
      }
      if (!j.url) j.url = URL.createObjectURL(c.thumb.blob);
      j.out = c.full.blob.size;
      j.state = "upload";
      const total = c.full.blob.size + c.thumb.blob.size;
      const fullN = c.full.blob.size;
      await withRetry(() => putXhr(j, "full", c.full.blob, (l) => (j.pct = Math.round((l / total) * 100))));
      await withRetry(() => putXhr(j, "thumb", c.thumb.blob, (l) => (j.pct = Math.round(((fullN + l) / total) * 100))));
      const p = await withRetry(() => commit(j, c));
      if (!photos.some((x) => x.uuid === p.uuid)) overall++;
      photos = [p, ...photos.filter((x) => x.uuid !== p.uuid)];
      j.pct = 100;
      j.state = "done";
      packed.delete(j.id);
    } catch (e) {
      const s = e instanceof HttpErr ? e.status : -1;
      j.err =
        e instanceof Error && s === -1 && e.message.startsWith("이 사진") ? e.message
        : s === 413 || s === 415 || s === 422 ? "이 사진은 올릴 수 없어요. 다른 사진을 선택해 주세요."
        : s === 429 ? "업로드 한도에 도달했어요. 잠시 후 다시 시도해 주세요."
        : GENERIC;
      j.state = "fail";
      if (s === -1 || s === 413 || s === 415 || s === 422) packed.delete(j.id);
    }
  }

  function clearDone() {
    jobs.filter((j) => j.state === "done").forEach((j) => URL.revokeObjectURL(j.url));
    jobs = jobs.filter((j) => j.state !== "done");
  }

  function askDelete(j: Job) {
    delId = j.id;
    delPw = "";
    delErr = "";
    void Promise.resolve().then(() => document.getElementById(`snap-dp-${j.id}`)?.focus());
  }

  async function remove(e: SubmitEvent, j: Job) {
    e.preventDefault();
    if (delBusy) return;
    const v = delPw.trim();
    if (!v) {
      delErr = "비밀번호를 입력해 주세요";
      return;
    }
    delBusy = true;
    delErr = "";
    try {
      const r = await fetch(`${api}/photos/${j.uuid}`, { method: "DELETE", headers: JSON_HEADERS, body: JSON.stringify({ pw: v }) });
      if (r.status === 204 || r.status === 404) {
        if (photos.some((p) => p.uuid === j.uuid)) overall = Math.max(0, overall - 1);
        photos = photos.filter((p) => p.uuid !== j.uuid);
        URL.revokeObjectURL(j.url);
        jobs = jobs.filter((x) => x.id !== j.id);
        delId = null;
        notify("삭제했어요");
      } else if (r.status === 403) delErr = "비밀번호가 맞지 않아요";
      else delErr = "잠시 후 다시 시도해 주세요";
    } catch {
      delErr = "잠시 후 다시 시도해 주세요";
    } finally {
      delBusy = false;
    }
  }
</script>

<div class="snap">
  <p class="sr" role="status" aria-live="polite">{announce}</p>

  {#if mounted}
    <div class="up">
      <div class="field">
        <label for="snap-pw">삭제 비밀번호 (선택)</label>
        <input id="snap-pw" type="password" bind:value={pw} maxlength="64" autocomplete="new-password" aria-invalid={!!pwErr} aria-describedby={pwErr ? "snap-pw-e snap-pw-h" : "snap-pw-h"} />
        <p class="hint" id="snap-pw-h">정하면 올린 사진을 나중에 직접 지울 수 있어요 (4~64자)</p>
        {#if pwErr}<p class="err" id="snap-pw-e" role="alert">{pwErr}</p>{/if}
      </div>
      <input bind:this={input} class="file" type="file" accept="image/*" multiple tabindex="-1" aria-hidden="true" onchange={pick} />
      <button type="button" class="btn-outline pick" data-press onclick={openPicker}>사진 올리기</button>
      <p class="hint">한 번에 {MAX_PICK}장까지 · 용량은 자동으로 줄여서 올려요</p>
    </div>
  {/if}

  {#if jobs.length}
    <div class="queue">
      <p class="sum">{doneN} / {jobs.length}장 완료{failN ? ` · 실패 ${failN}` : ""}</p>
      {#if busy}<p class="keep">업로드가 끝날 때까지 화면을 켜 두세요</p>{/if}
      <ul class="jobs">
        {#each jobs as j (j.id)}
          <li class="job" data-state={j.state}>
            {#if j.url}<img class="pv" src={j.url} alt="" width="56" height="56" />{:else}<span class="pv" aria-hidden="true"></span>{/if}
            <div class="info">
              <div class="line">
                <span class="st">{LABEL[j.state]}</span>
                {#if j.out}<span class="sz">{saved(j)}</span>{/if}
              </div>
              {#if j.state === "upload" || j.state === "done"}
                <progress max="100" value={j.pct} aria-label="{j.file.name} 업로드 진행률">{j.pct}%</progress>
              {/if}
              {#if j.err}<p class="err" role="alert">{j.err}</p>{/if}
            </div>
            {#if j.state === "fail"}
              <button type="button" class="act" onclick={() => retry(j)}>다시 시도</button>
            {:else if j.state === "done" && j.pw}
              <button type="button" class="act" onclick={() => askDelete(j)}>삭제</button>
            {/if}
            {#if delId === j.id}
              <form class="del" onsubmit={(ev) => remove(ev, j)} aria-label="사진 삭제 확인">
                <label for="snap-dp-{j.id}">사진을 올릴 때 정한 비밀번호</label>
                <div class="del-row">
                  <input id="snap-dp-{j.id}" type="password" bind:value={delPw} maxlength="64" autocomplete="current-password" aria-invalid={!!delErr} onkeydown={(ev) => ev.key === "Escape" && (delId = null)} />
                  <button type="submit" class="act" disabled={delBusy}>{delBusy ? "확인 중…" : "삭제"}</button>
                  <button type="button" class="act" onclick={() => (delId = null)}>취소</button>
                </div>
                <p class="hint">삭제한 사진은 반영까지 시간이 걸릴 수 있어요.</p>
                {#if delErr}<p class="err" role="alert">{delErr}</p>{/if}
              </form>
            {/if}
          </li>
        {/each}
      </ul>
      {#if !busy && doneN}<button type="button" class="act clear" onclick={clearDone}>완료 항목 지우기</button>{/if}
    </div>
  {/if}

  <div class="list">
    {#if status === "loading" || !mounted}
      <div class="skel" aria-hidden="true">
        {#each [0, 1, 2] as k (k)}<i class="sk"></i>{/each}
      </div>
    {:else if status === "error"}
      <p class="cap err-line" role="alert">스냅샷을 불러오지 못했어요 · <button type="button" class="act" onclick={() => ((status = "loading"), load(true))}>다시 시도</button></p>
    {:else if photos.length === 0}
      <p class="cap empty">아직 올라온 스냅샷이 없어요. 첫 사진을 남겨 주세요.</p>
    {:else}
      <div class="car" role="region" aria-roledescription="carousel" aria-label="하객 스냅샷" onkeydown={onkey}>
        <ul class="track" bind:this={track} {onscroll} tabindex="0" aria-label="스냅샷 목록 (좌우 방향키로 넘기기)">
          {#each photos as p, i (p.uuid)}
            <li class="it">
              <button type="button" class="card" aria-label="스냅샷 {i + 1} / {count} 크게 보기" onclick={() => gal?.openAt(i)}>
                <img src={p.thumb} width="480" height="600" alt="" loading="lazy" decoding="async" draggable="false" />
              </button>
            </li>
          {/each}
          {#if cursor !== null}<li class="sent" class:busy={moreBusy} bind:this={sentinel} aria-hidden="true"></li>{/if}
        </ul>
        <div class="nav">
          <button type="button" class="arrow" aria-label="이전 사진" disabled={cur <= 0} onclick={() => slide(-1)}>‹</button>
          <p class="count latin" aria-hidden="true">{cur + 1} / {count}</p>
          <button type="button" class="arrow" aria-label="다음 사진" disabled={cur >= photos.length - 1 && cursor === null} onclick={() => slide(1)}>›</button>
        </div>
        <p class="sr" role="status" aria-live="polite">{live}</p>
        {#if moreFailed}
          <p class="cap err-line" role="alert">사진을 더 불러오지 못했어요 · <button type="button" class="act" onclick={() => ((moreFailed = false), load(false))}>다시 시도</button></p>
        {/if}
      </div>
      <Gallery bind:this={gal} bare {items} more={cursor !== null} total={count} {thumbAt} onindex={follow} />
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
  .snap { text-align: left; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .up { display: grid; gap: 12px; justify-items: center; margin-bottom: 24px; }
  .field { display: grid; gap: 8px; width: 100%; }
  label { font-size: 13px; line-height: 1.5; color: var(--ink-2); }
  input[type="password"] {
    width: 100%; min-height: 48px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--ink);
    font: inherit; font-size: 16px; line-height: 1.5; box-sizing: border-box;
  }
  input[type="password"]:focus { outline: 2px solid var(--accent); outline-offset: 0; }
  input[aria-invalid="true"] { border-color: #c0392b; }
  .file { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .hint { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--ink-3); }
  .err { margin: 0; font-size: 14px; line-height: 1.5; color: #c0392b; }
  .pick { display: flex; width: 100%; max-width: 280px; min-height: 52px; border-radius: 9999px; }
  .pick:focus-visible, .act:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .queue { margin-bottom: 28px; }
  .sum { margin: 0 0 4px; font-size: 14px; font-weight: 700; color: var(--ink); }
  .keep { margin: 0 0 10px; font-size: 13px; color: var(--ink-2); }
  .jobs { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .job { display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
  .job[data-state="fail"] { border-color: #c0392b; }
  .pv { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; display: block; background: var(--track); }
  .info { min-width: 0; display: grid; gap: 6px; }
  .line { display: flex; flex-wrap: wrap; gap: 2px 10px; align-items: baseline; }
  .st { font-size: 13px; font-weight: 700; color: var(--ink); }
  .job[data-state="fail"] .st::before { content: "! "; }
  .job[data-state="done"] .st::before { content: "✓ "; }
  .sz { font-size: 12.5px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  progress { width: 100%; height: 6px; border: 0; border-radius: 3px; overflow: hidden; background: var(--track); accent-color: var(--accent); }
  progress::-webkit-progress-bar { background: var(--track); }
  progress::-webkit-progress-value { background: var(--accent); }
  progress::-moz-progress-bar { background: var(--accent); }
  .act { all: unset; box-sizing: border-box; min-height: 44px; min-width: 44px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; color: var(--ink); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .act:disabled { opacity: 0.6; cursor: progress; }
  .clear { display: flex; margin: 6px auto 0; }
  .del { grid-column: 1 / -1; display: grid; gap: 6px; }
  .del-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .del-row input { flex: 1 1 140px; width: auto; min-width: 0; }

  .car { min-width: 0; }
  .track {
    list-style: none; margin: 0; padding: 0; display: flex; gap: 10px; overflow-x: auto; overflow-y: hidden; position: relative;
    scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: none; border-radius: 10px;
  }
  .track::-webkit-scrollbar { display: none; }
  .track:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .it, .sent.busy { flex: 0 0 min(68%, 240px); aspect-ratio: 4 / 5; scroll-snap-align: start; }
  .card { display: block; width: 100%; height: 100%; padding: 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--track); cursor: zoom-in; }
  .card img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .card:focus-visible, .arrow:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .sent { flex: 0 0 1px; }
  .sent.busy { border-radius: 10px; background: var(--track); opacity: 0.5; animation: snap-pulse 1.2s ease-in-out infinite alternate; }
  .nav { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 14px; }
  .count { margin: 0; min-width: 7ch; text-align: center; font-size: 14px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .arrow {
    width: 44px; height: 44px; padding: 0 0 3px; border-radius: 50%; border: 1px solid var(--line); background: var(--surface); color: var(--ink);
    font-size: 26px; line-height: 1; cursor: pointer;
  }
  .arrow:disabled { opacity: 0.35; cursor: default; }
  .empty { margin: 8px 0; text-align: center; }
  .err-line { margin: 20px 0 0; text-align: center; }
  .skel { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .sk { display: block; aspect-ratio: 1; border-radius: 6px; background: var(--track); opacity: 0.5; animation: snap-pulse 1.2s ease-in-out infinite alternate; }
  @keyframes snap-pulse { from { opacity: 0.5; } to { opacity: 0.8; } }
  @media (prefers-reduced-motion: reduce) { .sk, .sent.busy { animation: none; } }

  .toasts { position: fixed; left: 0; right: 0; bottom: var(--toast-bottom, 24px); display: grid; justify-items: center; z-index: 150; pointer-events: none; }
</style>
