<script lang="ts">
  import { onMount } from "svelte";
  import { reduced } from "../lib/motion";
  import Gallery from "./Gallery.svelte";
  import Toast from "./ui/Toast.svelte";
  import { compress, preview, warm, type Compressed } from "../lib/compress";
  import { portal } from "../lib/portal";
  import { PHOTO } from "@wedding/shared";
  import type { Photo, PhotoList } from "@wedding/shared/schemas";
  import { request } from "../lib/api";

  type State = "wait" | "compress" | "upload" | "done" | "fail";
  type Job = { id: number; file: File; uuid: string; state: State; pct: number; err: string; url: string; pw: string };
  let { api, cdn = "" }: { api: string; cdn?: string } = $props();

  const CONCURRENCY = 2;
  const RETRIES = 3;
  const PAGE = PHOTO.defaultLimit;
  const PREFETCH = 6;
  const DONE_MS = 1200;
  const GENERIC = "업로드에 실패했어요. 다시 시도해 주세요.";

  let mounted = $state(false);
  let status = $state<"loading" | "ready" | "error">("loading");
  type Snap = Photo & { thumb0?: string; full0?: string };
  let photos = $state<Snap[]>([]);
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
  let pending = $state<File[]>([]);
  type Tile = { id: number; url: string; ok: boolean; fell: boolean; bad: boolean };
  let tileSeq = 0;
  const newTile = (): Tile => ({ id: ++tileSeq, url: "", ok: false, fell: false, bad: false });
  let zdlg = $state<HTMLDialogElement>();
  let zoomUrl = $state("");
  let addInput = $state<HTMLInputElement>();
  let tiles = $state<Tile[]>([]);
  let previewGen = 0;
  let left = $state<number>(PHOTO.perBatch);
  const allow = $derived(Math.max(0, left - jobs.filter((j) => j.state === "wait" || j.state === "compress").length));
  let sheetPw = $state("");
  let sheetShow = $state(false);
  let sheetErr = $state("");
  let dlg = $state<HTMLDialogElement>();
  let dlgTitle = $state<HTMLElement>();
  let pickBtn = $state<HTMLButtonElement>();
  let announce = $state("");
  let toast = $state<{ id: number; msg: string; warn: boolean } | null>(null);
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
  let batchN = $state(0);
  let okN = $state(0);
  let batchPw = $state(false);
  const failN = $derived(jobs.filter((j) => j.state === "fail").length);
  const LABEL: Record<State, string> = { wait: "대기", compress: "압축 중", upload: "업로드 중", done: "완료", fail: "실패" };

  const notify = (msg: string, warn = false) => (toast = { id: ++seq, msg, warn });
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

  /* 이 브라우저에서 올린 사진 uuid. 기기 ID 와 함께 서버에 보내 소유 증명 */
  const mineSet = (): string[] => {
    try {
      const v = JSON.parse(localStorage.getItem("snap-mine") ?? "[]");
      return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  };
  const rememberMine = (u: string, on = true) => {
    try {
      const v = mineSet().filter((x) => x !== u);
      localStorage.setItem("snap-mine", JSON.stringify(on ? [...v, u] : v));
    } catch {}
  };

  class HttpErr extends Error {
    status: number;
    constructor(status: number) {
      super(String(status));
      this.status = status;
    }
  }

  const base = cdn.replace(/\/+$/, "");
  const toPhoto = (e: Photo): Snap => ({
    id: e.id, uuid: e.uuid, w: e.w, h: e.h, ext: e.ext, locked: !!e.locked,
    thumb: base ? `${base}/thumb/${e.uuid}.${e.ext}` : e.thumb,
    full: base ? `${base}/full/${e.uuid}.${e.ext}` : e.full,
    ...(base ? { thumb0: e.thumb, full0: e.full } : {}),
  });
  const items = $derived(photos.map((p) => ({ thumb: p.thumb, srcset: `${p.thumb} 480w`, full: p.full, thumb0: p.thumb0, full0: p.full0, w: p.w, h: p.h })));
  /** CDN 이미지 로드 실패(r2.dev 429 등) 시 Worker URL 로 1회 재시도 */
  const fallback = (el: HTMLImageElement, url?: string) => url && el.getAttribute("src") !== url && (el.src = url);
  const count = $derived(Math.max(overall, photos.length));
  /** GRID_MIN 장 이상이면 6열 그리드, 미만이면 한 장씩 가로 스와이프 */
  const GRID_MIN = 9;
  const grid = $derived(count >= GRID_MIN);
  /** 그리드 한 페이지 최대 6열 × 3행. 18장 이하는 장수만큼 행이 늘고, 넘으면 페이지 단위 가로 스와이프 + 끝 근처에서 다음 묶음 로드 */
  const GRID_PAGE = 18;
  const pages = $derived(Array.from({ length: Math.ceil(photos.length / GRID_PAGE) }, (_, k) => photos.slice(k * GRID_PAGE, (k + 1) * GRID_PAGE)));
  const pageN = $derived(Math.ceil(count / GRID_PAGE));
  /** 하단 인디케이터: 최대 7개 점 창, 현재 위치는 캡슐. 창 밖으로 이어지는 쪽 끝 점은 작게 */
  const DOT_VIS = 7;
  const DOT_W = 16;
  const dotN = $derived(grid ? pageN : count);
  const dotStart = $derived(Math.max(0, Math.min(cur - 3, dotN - DOT_VIS)));
  const dotKind = (i: number) =>
    i === cur ? "on"
    : i < dotStart || i >= dotStart + DOT_VIS ? "out"
    : (i === dotStart && i > 0) || (i === dotStart + DOT_VIS - 1 && i < dotN - 1) ? "edge"
    : "";
  let mineIds = $state<string[]>([]);
  const need = (i: number) => {
    const p = photos[i];
    return !p ? null : p.locked ? "pw" : mineIds.includes(p.uuid) ? "confirm" : null;
  };

  async function load(first: boolean) {
    if (!first) {
      if (moreBusy || cursor === null) return;
      moreBusy = true;
      moreFailed = false;
    }
    try {
      const q = new URLSearchParams({ limit: String(PAGE) });
      if (!first && cursor !== null) q.set("cursor", String(cursor));
      const { status: st, body: d } = await request<PhotoList>(api, `/photos?${q}`);
      if (st < 200 || st >= 300) throw new Error(String(st));
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

  /* 끝에서 PREFETCH 장 이내로 다가오면 다음 페이지 미리 로드 */
  $effect(() => {
    void photos.length;
    void moreBusy;
    if (!sentinel || !track || cursor === null || moreFailed) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && void load(false), { root: track, rootMargin: "0px 1500px 0px 0px" });
    io.observe(sentinel);
    return () => io.disconnect();
  });

  const step = () => {
    const li = track?.querySelectorAll<HTMLElement>(grid ? "li.pg" : "li.it");
    return li && li.length > 1 ? li[1].offsetLeft - li[0].offsetLeft : (li?.[0]?.offsetWidth ?? 1);
  };

  function sync() {
    raf = 0;
    if (!track) return;
    const last = (grid ? pages.length : photos.length) - 1;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    cur = Math.max(0, Math.min(last, atEnd && cursor === null ? last : Math.round(track.scrollLeft / step())));
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => (live = grid ? `${cur + 1} / ${pageN} 페이지` : `${cur + 1} / ${count}`), 250);
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
    mineIds = mineSet();
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
    if (!mounted || !batchN) return;
    if (busy) return;
    announce = `${okN}장 업로드 완료${failN ? `, ${failN}장 실패` : ""}`;
    if (okN) notify(`${okN}장 올렸어요. ${batchPw ? "정한 비밀번호로" : "이 휴대폰에서"} 지울 수 있어요`);
  });

  /* 기기별 남은 업로드 수. 실패 시 기존 값 유지(서버가 최종 한도 판정) */
  async function refreshQuota() {
    try {
      const r = await request<{ left?: number }>(api, "/photos/quota", { headers: { "X-Device": deviceId() } });
      if (r.status === 200 && typeof r.body.left === "number") left = r.body.left;
    } catch {
      /* 네트워크 오류: 기존 값 유지 */
    }
  }

  function pick(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const files = [...(el.files ?? [])];
    el.value = "";
    if (!files.length) return;
    const add = files.map(newTile);
    if (dlg?.open) {
      pending = [...pending, ...files];
      tiles = [...tiles, ...add];
      files.forEach((f, i) => void fill(f, tiles[tiles.length - files.length + i], previewGen));
      return;
    }
    pending = files;
    const gen = ++previewGen;
    tiles = add;
    pending.forEach((f, i) => void fill(f, tiles[i], gen));
    sheetPw = sheetErr = "";
    pickBtn?.focus();
    dlg?.showModal();
    dlgTitle?.focus();
  }

  /** 원본 object URL 은 장마다 메인 스레드 풀해상도 디코드라 여러 장이면 버벅임 → 워커에서 112px 축소본 생성(직렬). 닫힌 뒤 도착한 결과는 무시. */
  const fill = (f: File, t: Tile, gen: number) => swap(f, t, gen);

  async function swap(f: File, t: Tile, gen: number) {
    if (t.fell) return;
    t.fell = true;
    try {
      const b = await preview(f, 112, () => gen !== previewGen);
      if (gen !== previewGen) return;
      if (t.url) URL.revokeObjectURL(t.url);
      t.ok = false;
      t.url = URL.createObjectURL(b);
    } catch {
      if (gen === previewGen) t.bad = true;
    }
  }

  function submit() {
    if (!allow) return;
    const v = sheetPw.trim();
    if (v && (v.length < 4 || v.length > 64)) {
      sheetErr = "비밀번호는 4~64자로 입력해 주세요";
      return;
    }
    const add = pending.slice(0, allow).map(
      (file): Job => ({ id: ++seq, file, uuid: crypto.randomUUID(), state: "wait", pct: 0, err: "", url: "", pw: v }),
    );
    if (!busy) (batchN = okN = 0), (batchPw = false);
    batchPw ||= !!v;
    batchN += add.length;
    jobs = [...jobs, ...add];
    pump();
    dlg?.close();
  }

  /** 모달에서 사진 한 장 빼기. 뒤쪽 한도 초과 사진이 앞으로 당겨져 업로드 대상이 됨 */
  function unpick(i: number) {
    const t = tiles[i];
    if (t?.url) URL.revokeObjectURL(t.url);
    tiles = tiles.filter((_, k) => k !== i);
    pending = pending.filter((_, k) => k !== i);
  }

  /** 원본 크게 보기. 브라우저가 못 그리는 형식(HEIC 등)은 워커 미리보기로 대체 */
  let zoomFile: File | null = null;
  function zoom(i: number) {
    zoomFile = pending[i] ?? null;
    if (!zoomFile) return;
    zoomUrl = URL.createObjectURL(zoomFile);
    zdlg?.showModal();
  }

  async function zoomFallback() {
    const f = zoomFile;
    if (!f || !zoomUrl) return;
    URL.revokeObjectURL(zoomUrl);
    zoomUrl = "";
    try {
      const b = await preview(f, 1080);
      if (zoomFile === f && zdlg?.open) zoomUrl = URL.createObjectURL(b);
    } catch {
      zdlg?.close();
    }
  }

  function onZoomClose() {
    if (zoomUrl) URL.revokeObjectURL(zoomUrl);
    zoomUrl = "";
    zoomFile = null;
  }

  function onclose() {
    previewGen++;
    tiles.forEach((t) => t.url && URL.revokeObjectURL(t.url));
    tiles = [];
    pending = [];
    sheetPw = sheetErr = "";
    sheetShow = false;
  }

  function trap(e: KeyboardEvent) {
    if (e.key !== "Tab" || !dlg) return;
    const f = [...dlg.querySelectorAll<HTMLElement>("input:not(.file), button")];
    const edge = e.shiftKey ? [dlgTitle, f[0]] : [f[f.length - 1]];
    if (!edge.includes(document.activeElement as HTMLElement)) return;
    e.preventDefault();
    (e.shiftKey ? f[f.length - 1] : f[0]).focus();
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

  /* 네트워크/5xx 만 1·2·4초 뒤 재시도. 429(한도)는 재시도 안 함 */
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
    const r = await request<Photo>(api, `/photos/${j.uuid}/commit`, {
      method: "POST",
      headers: { "X-Device": deviceId() },
      body: JSON.stringify({ w: c.w, h: c.h, size: c.full.blob.size, ...(j.pw ? { pw: j.pw } : {}) }),
    }).catch(() => new HttpErr(0));
    if (r instanceof HttpErr) throw r;
    if (r.status !== 200 && r.status !== 201) throw new HttpErr(r.status);
    j.pw = "";
    return toPhoto(r.body);
  }

  async function run(j: Job) {
    try {
      let c = packed.get(j.id);
      if (!c) {
        c = await compressSerial(j.file);
        packed.set(j.id, c);
      }
      if (!j.url) j.url = URL.createObjectURL(c.thumb.blob);
      j.state = "upload";
      const total = c.full.blob.size + c.thumb.blob.size;
      const fullN = c.full.blob.size;
      await withRetry(() => putXhr(j, "full", c.full.blob, (l) => (j.pct = Math.round((l / total) * 100))));
      await withRetry(() => putXhr(j, "thumb", c.thumb.blob, (l) => (j.pct = Math.round(((fullN + l) / total) * 100))));
      const p = await withRetry(() => commit(j, c));
      if (!photos.some((x) => x.uuid === p.uuid)) overall++;
      rememberMine(p.uuid);
      mineIds = [...mineIds, p.uuid];
      photos = [p, ...photos.filter((x) => x.uuid !== p.uuid)];
      j.pct = 100;
      j.state = "done";
      okN++;
      packed.delete(j.id);
      setTimeout(() => drop(j), DONE_MS);
    } catch (e) {
      const s = e instanceof HttpErr ? e.status : -1;
      j.err =
        e instanceof Error && s === -1 && e.message.startsWith("이 사진") ? e.message
        : s === 413 || s === 415 || s === 422 ? "이 사진은 올릴 수 없어요. 다른 사진을 선택해 주세요."
        : s === 403 ? "업로드 가능한 사진 수를 모두 채웠어요."
        : s === 429 ? `한 번에 ${PHOTO.perBatch}장까지 올릴 수 있어요. 10분 뒤 다시 시도해 주세요.`
        : GENERIC;
      j.state = "fail";
      if (s === -1 || s === 413 || s === 415 || s === 422) packed.delete(j.id);
    }
  }

  /* 완료된 항목은 잠시 보여 준 뒤 자동 제거 */
  function drop(j: Job) {
    URL.revokeObjectURL(j.url);
    jobs = jobs.filter((x) => x.id !== j.id);
  }

  async function removeAt(i: number, pw?: string): Promise<string | null> {
    const uuid = photos[i]?.uuid;
    if (!uuid) return null;
    try {
      const r = await request<{ error?: string }>(api, `/photos/${uuid}`, {
        method: "DELETE",
        headers: { "X-Device": deviceId() },
        ...(pw ? { body: JSON.stringify({ pw }) } : {}),
      });
      if (r.status === 429) return "시도 횟수가 많아요. 잠시 후 다시 시도해 주세요";
      if (r.status === 403) {
        return r.body.error === "no password" ? "이 휴대폰에서 올린 사진만 지울 수 있어요" : "비밀번호가 맞지 않아요";
      }
      if (r.status !== 204 && r.status !== 404) return "잠시 후 다시 시도해 주세요";
    } catch {
      return "잠시 후 다시 시도해 주세요";
    }
    if (photos.some((p) => p.uuid === uuid)) overall = Math.max(0, overall - 1);
    photos = photos.filter((p) => p.uuid !== uuid);
    mineIds = mineIds.filter((x) => x !== uuid);
    rememberMine(uuid, false);
    notify("삭제했어요");
    return null;
  }
</script>

<div class="snap">
  <p class="sr" role="status" aria-live="polite">{announce}</p>

  {#if mounted}
    <div class="up">
      <input bind:this={input} class="file" type="file" accept="image/*,.heic,.heif" multiple tabindex="-1" aria-hidden="true" onchange={pick} />
      <button type="button" class="btn-outline pick" bind:this={pickBtn} data-press onclick={() => (warm(), void refreshQuota(), input?.click())}>사진 올리기</button>
      <p class="hint">한 번에 {PHOTO.perBatch}장까지 올릴 수 있어요</p>
    </div>
  {/if}

  <dialog bind:this={dlg} class="sheet" aria-labelledby="snap-t" {onclose} onkeydown={trap}>
    <form method="dialog" onsubmit={(e) => (e.preventDefault(), submit())}>
      <h2 id="snap-t" class="ttl" tabindex="-1" bind:this={dlgTitle}>{!allow ? "10분 뒤 다시 올려 주세요" : pending.length ? `사진 ${Math.min(pending.length, allow)}장을 올릴까요?` : "올릴 사진을 골라 주세요"}</h2>
      <div class="pvs">
        {#each tiles as t, i (t.id)}
          <span class="pvt" class:ld={!t.ok && !t.bad} class:over={i >= allow}>
            <button type="button" class="pv-open" aria-label="사진 {i + 1} 크게 보기" onclick={() => zoom(i)}>{#if t.url}<img class:on={t.ok} src={t.url} alt="" width="56" height="56" onload={() => (t.ok = true)} onerror={() => swap(pending[i], t, previewGen)} />{/if}</button>
            {#if i >= allow}<b class="x" aria-hidden="true">!</b>{/if}
            <button type="button" class="pv-del" aria-label="사진 {i + 1} 빼기" onclick={() => unpick(i)}>×</button>
          </span>
        {/each}
        <button type="button" class="pvt pv-add" aria-label="사진 더 고르기" onclick={() => (void refreshQuota(), addInput?.click())}>+</button>
        <input bind:this={addInput} class="file" type="file" accept="image/*,.heic,.heif" multiple tabindex="-1" aria-hidden="true" onchange={pick} />
      </div>
      <p class="hint">한 번에 {PHOTO.perBatch}장까지 올릴 수 있어요{#if allow < PHOTO.perBatch}{" · "}방금 올린 사진이 있어 지금은 {allow}장, 10분 뒤 다시 {PHOTO.perBatch}장{/if}</p>
      {#if pending.length > allow}<p class="err">빨간 표시 {pending.length - allow}장은 올라가지 않아요</p>{/if}
      <label for="snap-pw">삭제 비밀번호 (선택)</label>
      <div class="pwbox">
        <input id="snap-pw" type={sheetShow ? "text" : "password"} bind:value={sheetPw} maxlength="64" autocomplete="new-password" autocapitalize="off" autocorrect="off" spellcheck="false" aria-invalid={!!sheetErr} aria-describedby={sheetErr ? "snap-pw-e snap-pw-h" : "snap-pw-h"} />
        <button type="button" class="pw-eye" aria-pressed={sheetShow} aria-label={sheetShow ? "비밀번호 숨기기" : "비밀번호 보기"} onclick={() => (sheetShow = !sheetShow)}>{sheetShow ? "숨기기" : "보기"}</button>
      </div>
      <p class="hint" id="snap-pw-h">정해 두면 나중에 어느 휴대폰에서든 이 비밀번호로 지울 수 있어요. 비워 두면 지금 이 휴대폰에서만 지울 수 있어요.</p>
      {#if sheetErr}<p class="err" id="snap-pw-e" role="alert">{sheetErr}</p>{/if}
      <button type="submit" class="go" disabled={!Math.min(pending.length, allow)}>{Math.min(pending.length, allow)}장 올리기</button>
      <button type="button" class="no" onclick={() => dlg?.close()}>취소</button>
    </form>
  </dialog>

  <dialog bind:this={zdlg} class="zoom" aria-label="사진 크게 보기" onclose={onZoomClose} onclick={() => zdlg?.close()}>
    {#if zoomUrl}<img src={zoomUrl} alt="" onerror={zoomFallback} />{/if}
    <button type="button" class="z-close" aria-label="닫기">×</button>
  </dialog>

  {#if jobs.length}
    <div class="queue">
      <p class="sum">{okN} / {batchN}장 완료{failN ? ` · 실패 ${failN}` : ""}</p>
      {#if busy}<p class="keep">업로드가 끝날 때까지 화면을 켜 두세요</p>{/if}
      <ul class="jobs">
        {#each jobs as j (j.id)}
          <li class="job" data-state={j.state}>
            {#if j.url}<img class="pv" src={j.url} alt="" width="56" height="56" />{:else}<span class="pv" aria-hidden="true"></span>{/if}
            <div class="info">
              <div class="line">
                <span class="st">{LABEL[j.state]}</span>
              </div>
              {#if j.state === "upload" || j.state === "done"}
                <progress max="100" value={j.pct} aria-label="{j.file.name} 업로드 진행률">{j.pct}%</progress>
              {/if}
              {#if j.err}<p class="err" role="alert">{j.err}</p>{/if}
            </div>
            {#if j.state === "fail"}
              <button type="button" class="act" onclick={() => retry(j)}>다시 시도</button>
            {/if}
          </li>
        {/each}
      </ul>
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
        <ul class="track" class:grid bind:this={track} {onscroll} tabindex="0" aria-label="스냅샷 목록 (좌우 방향키로 넘기기)">
          {#if grid}
            {#each pages as pg, k (k)}
              <li class="pg">
                <ul class="pgrid">
                  {#each pg as p, n (p.uuid)}
                    {@const i = k * GRID_PAGE + n}
                    <li class="it">
                      <button type="button" class="card" aria-label="스냅샷 {i + 1} / {count} 크게 보기" onclick={() => gal?.openAt(i)}>
                        <img src={p.thumb} width="480" height="600" alt="" loading="lazy" decoding="async" draggable="false" onerror={(e) => fallback(e.currentTarget, p.thumb0)} />
                      </button>
                    </li>
                  {/each}
                </ul>
              </li>
            {/each}
          {:else}
            {#each photos as p, i (p.uuid)}
              <li class="it">
                <button type="button" class="card" aria-label="스냅샷 {i + 1} / {count} 크게 보기" onclick={() => gal?.openAt(i)}>
                  <img src={p.thumb} width="480" height="600" alt="" loading="lazy" decoding="async" draggable="false" onerror={(e) => fallback(e.currentTarget, p.thumb0)} />
                </button>
              </li>
            {/each}
          {/if}
          {#if cursor !== null}<li class="sent" class:busy={moreBusy} bind:this={sentinel} aria-hidden="true"></li>{/if}
        </ul>
        {#if dotN > 1}
          <div class="dots" aria-hidden="true">
            <span class="dots-strip" style:transform="translateX({dotN <= DOT_VIS ? ((DOT_VIS - dotN) * DOT_W) / 2 : -dotStart * DOT_W}px)">
              {#each { length: dotN } as _, i (i)}<i class="dot {dotKind(i)}"></i>{/each}
            </span>
          </div>
          <p class="sr" role="status" aria-live="polite">{live}</p>
        {/if}
        {#if moreFailed}
          <p class="cap err-line" role="alert">사진을 더 불러오지 못했어요 · <button type="button" class="act" onclick={() => ((moreFailed = false), load(false))}>다시 시도</button></p>
        {/if}
      </div>
      <Gallery bind:this={gal} bare {items} remove={removeAt} need={need} more={cursor !== null} total={count} {thumbAt} onindex={follow} />
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
  label { font-size: 13px; line-height: 1.5; color: var(--ink-2); }
  .sheet {
    width: min(calc(100% - 32px), 360px); max-height: calc(100dvh - 32px); overflow-y: auto; margin: auto; padding: 20px; box-sizing: border-box;
    border: 1px solid var(--line); border-radius: 16px; background: var(--surface); color: var(--ink); animation: sheet-in 160ms ease;
  }
  .sheet::backdrop { background: rgb(0 0 0 / 0.5); animation: sheet-fade 160ms ease; }
  .sheet form { display: grid; gap: 10px; }
  .ttl { margin: 0; font-size: 17px; line-height: 1.4; font-weight: 700; outline: none; }
  .pvs { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .pvt { position: relative; width: 56px; height: 56px; border-radius: 8px; overflow: hidden; background: var(--track) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='18' height='14' rx='2'/%3E%3Ccircle cx='9' cy='11' r='1.6'/%3E%3Cpath d='m21 16-5-5-8 8'/%3E%3C/svg%3E") center / 22px no-repeat; }
  .pvt.ld { background: var(--track) linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.55) 50%, transparent 70%) 0 0 / 200% 100% no-repeat; animation: pv-shimmer 1.2s linear infinite; }
  .pvt img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 150ms ease-out; }
  .pvt img.on { opacity: 1; }
  @keyframes pv-shimmer { from { background-position: 150% 0; } to { background-position: -50% 0; } }
  @media (prefers-reduced-motion: reduce) { .pvt.ld { animation: none; background-image: none; } .pvt img { transition: none; } }
  .pvt.over::after { content: ""; position: absolute; inset: 0; border: 2px solid #c0392b; border-radius: inherit; background: rgb(192 57 43 / 0.25); }
  .pv-open { position: absolute; inset: 0; padding: 0; border: 0; background: none; cursor: zoom-in; }
  .pv-del { position: absolute; z-index: 2; top: 2px; right: 2px; width: 20px; height: 20px; padding: 0; border: 0; border-radius: 50%; background: rgb(0 0 0 / 0.6); color: #fff; font: 600 14px/20px system-ui, sans-serif; cursor: pointer; }
  .pv-add { display: grid; place-items: center; padding: 0; border: 1px dashed var(--line); background: transparent; color: var(--ink-2); font: 300 26px/1 system-ui, sans-serif; cursor: pointer; }
  .pv-open:focus-visible, .pv-del:focus-visible, .pv-add:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .zoom { width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: rgb(0 0 0 / 0.96); }
  .zoom::backdrop { background: transparent; }
  .zoom img { width: 100%; height: 100%; object-fit: contain; }
  .z-close { position: absolute; top: max(12px, env(safe-area-inset-top)); right: 12px; width: 40px; height: 40px; border: 0; border-radius: 50%; background: rgb(255 255 255 / 0.15); color: #fff; font: 400 26px/40px system-ui, sans-serif; cursor: pointer; }
  .pvt .x { position: absolute; z-index: 1; bottom: 3px; left: 3px; pointer-events: none; width: 16px; height: 16px; border-radius: 50%; background: #c0392b; color: #fff; font: 700 11px/16px system-ui, sans-serif; text-align: center; }
  .sheet input { width: 100%; min-height: 48px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--ink); font: inherit; font-size: 16px; line-height: 1.5; box-sizing: border-box; }
  .sheet input.file { width: 1px; min-height: 0; padding: 0; border: 0; }
  .sheet input:focus { outline: 2px solid var(--accent); outline-offset: 0; }
  .sheet input[aria-invalid="true"] { border-color: #c0392b; }
  .go, .no { min-height: 48px; border-radius: 12px; font: inherit; font-size: 16px; font-weight: 600; cursor: pointer; border: 1px solid var(--line); }
  .go { background: var(--ink); color: var(--surface); border-color: var(--ink); margin-top: 6px; }
  .go:disabled { opacity: 0.4; cursor: not-allowed; }
  .no { background: transparent; color: var(--ink); }
  .go:focus-visible, .no:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  @keyframes sheet-in { from { opacity: 0; transform: translateY(8px); } }
  @keyframes sheet-fade { from { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .sheet, .sheet::backdrop { animation: none; } }
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
  .job[data-state="done"] { animation: job-out 400ms ease 800ms forwards; }
  @keyframes job-out { to { opacity: 0; } }
  .pv { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; display: block; background: var(--track); }
  .info { min-width: 0; display: grid; gap: 6px; }
  .line { display: flex; flex-wrap: wrap; gap: 2px 10px; align-items: baseline; }
  .st { font-size: 13px; font-weight: 700; color: var(--ink); }
  .job[data-state="fail"] .st::before { content: "! "; }
  .job[data-state="done"] .st::before { content: "✓ "; }
  progress { width: 100%; height: 6px; border: 0; border-radius: 3px; overflow: hidden; background: var(--track); accent-color: var(--accent); }
  progress::-webkit-progress-bar { background: var(--track); }
  progress::-webkit-progress-value { background: var(--accent); }
  progress::-moz-progress-bar { background: var(--accent); }
  .act { all: unset; box-sizing: border-box; min-height: 44px; min-width: 44px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; color: var(--ink); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .act:disabled { opacity: 0.6; cursor: progress; }

  .car { min-width: 0; }
  .track {
    list-style: none; margin: 0; padding: 0; display: flex; gap: 10px; overflow-x: auto; overflow-y: hidden; position: relative;
    scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: none; border-radius: 10px;
  }
  .track::-webkit-scrollbar { display: none; }
  .track:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .it, .sent.busy { flex: 0 0 min(68%, 240px); aspect-ratio: 4 / 5; scroll-snap-align: start; }
  /* 사진만 둥글게 잘라 표시: 테두리·테마 카드 링(global .card) 제거 */
  .track .card { display: block; width: 100%; height: 100%; padding: 0; border: 0; box-shadow: none; border-radius: 10px; overflow: hidden; clip-path: inset(0 round 10px); background: var(--track); cursor: zoom-in; }
  .card img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .sent { flex: 0 0 1px; }
  .sent.busy { border-radius: 10px; background: var(--track); opacity: 0.5; animation: snap-pulse 1.2s ease-in-out infinite alternate; }
  .dots { width: 112px; height: 6px; margin: 18px auto 0; overflow: hidden; }
  .dots-strip { display: flex; transition: transform 360ms cubic-bezier(0.2, 0.7, 0.3, 1); }
  .dot { position: relative; flex: 0 0 16px; height: 6px; }
  .dot::before {
    content: ""; position: absolute; top: 0; left: 50%; width: 6px; height: 6px; margin-left: -3px; border-radius: 3px; background: var(--ink-3); opacity: 0.4;
    transition: width 360ms cubic-bezier(0.2, 0.7, 0.3, 1), margin-left 360ms cubic-bezier(0.2, 0.7, 0.3, 1), background-color 240ms ease, opacity 240ms ease, transform 240ms ease;
  }
  .dot.on::before { width: 16px; margin-left: -8px; background: var(--accent); opacity: 1; }
  .dot.edge::before { transform: scale(0.6); }
  .dot.out::before { transform: scale(0.3); opacity: 0; }
  @media (prefers-reduced-motion: reduce) { .dots-strip, .dot::before { transition: none; } }
  /* 그리드: 페이지(최대 6열 × 3행) 단위 가로 스와이프, 컨테이너 너비 그대로 */
  .track.grid { align-items: start; border-radius: 0; }
  .pg { flex: 0 0 100%; scroll-snap-align: start; }
  .pgrid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 3px; }
  .pgrid .it { aspect-ratio: 4 / 5; scroll-snap-align: none; }
  .track .pgrid .card { border-radius: 6px; clip-path: inset(0 round 6px); }
  /* 페이지 높이만큼 늘려 감시 영역 확보(높이 0 이면 교차 감지 누락) */
  .track.grid .sent { align-self: stretch; }
  .empty { margin: 8px 0; text-align: center; }
  .err-line { margin: 20px 0 0; text-align: center; }
  .skel { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .sk { display: block; aspect-ratio: 1; border-radius: 6px; background: var(--track); opacity: 0.5; animation: snap-pulse 1.2s ease-in-out infinite alternate; }
  @keyframes snap-pulse { from { opacity: 0.5; } to { opacity: 0.8; } }
  @media (prefers-reduced-motion: reduce) { .sk, .sent.busy { animation: none; } }

  .toasts { position: fixed; left: 0; right: 0; bottom: var(--toast-bottom, 24px); display: grid; justify-items: center; z-index: 260; pointer-events: none; }
  /* 비밀번호 마스킹 + 보기 토글 */
  .pwbox { position: relative; }
  .pwbox input { width: 100%; padding-right: 64px; box-sizing: border-box; }
  .pw-eye { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); min-width: 52px; min-height: 44px; padding: 0 8px; border: 0; background: none; color: var(--ink-3); font: 500 13px/1 var(--f-ui, inherit); cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .pw-eye:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 8px; }
</style>
