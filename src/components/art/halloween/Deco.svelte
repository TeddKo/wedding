<script lang="ts">
  /** 섹션 장난감 5종. 탭 연출은 fx/halloween.ts 의 TOYS 가 data-hw 로 연결 */
  let { kind }: { kind: "spider" | "cat" | "bat" | "potion" | "web" } = $props();
  const BAT = "M20 4c1-2 2-3 3-3 0 2 1 3 2 3 3-1 6-2 9-1 2 1 4 3 5 6-2-2-4-2-6-1-1 0-2 2-3 3-1-1-3-2-4-1-1 1-2 3-3 4-1-1-2-3-3-4-1-1-3 0-4 1-1-1-2-3-3-3-2-1-4-1-6 1 1-3 3-5 5-6 3-1 6 0 9 1 1 0 2-1 2-3 1 0 2 1 3 3Z";
</script>

{#if kind === "spider"}
  <button type="button" class="hw-deco hw-spider hw-idle" data-th="halloween" data-hw="spider" data-rv="fade" style="--d:900ms" aria-label="거미 건드리기"
    ><span class="hw-sway" aria-hidden="true"
      ><i class="hw-silk"></i><span class="hw-drop"
        ><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false"
          ><path d="M15 21C11 18 9 15 6 11M14.5 24C10 23.5 7 22 3 20M15 27C11 28.5 8 31 6 34.5M16.5 30C14 33 13 35.5 12.5 38.5M25 21C29 18 31 15 34 11M25.5 24C30 23.5 33 22 37 20M25 27C29 28.5 32 31 34 34.5M23.5 30C26 33 27 35.5 27.5 38.5" /><ellipse cx="20" cy="25.5" rx="6" ry="7" fill="currentColor" fill-opacity=".85" /><circle cx="20" cy="16" r="3.6" fill="currentColor" fill-opacity=".85" /><circle cx="18.6" cy="15.6" r=".9" fill="#c8a56a" stroke="none" /><circle cx="21.4" cy="15.6" r=".9" fill="#c8a56a" stroke="none" /><path d="M20 21.5v8" stroke="#c8a56a" stroke-opacity=".6" stroke-width="1" /></svg
      ></span
    ></span
  ></button>
{:else if kind === "cat"}
  <button type="button" class="hw-deco hw-cat" data-th="halloween" data-hw="cat" data-rv="fade" style="--d:900ms" aria-label="고양이 쓰다듬기"
    ><span class="hw-cat-art" aria-hidden="true"
      ><svg viewBox="0 0 56 40" focusable="false"
        ><path class="hw-cat-tail" d="M47 40C47 33 52 31 52 25S48 19 50 15" fill="none" stroke="#2b2420" stroke-width="3" stroke-linecap="round" /><path d="M8 40C7 30 8 23 11 18L10 6 18.5 12.5C21.5 11.5 26.5 11.5 29.5 12.5L38 6 37 18C40 23 41 30 40 40Z" fill="#2b2420" /><path d="M12.5 10.5 13 15.5 16 13.3ZM35.5 10.5 35 15.5 32 13.3Z" fill="#a0522d" fill-opacity=".55" /><g class="hw-cat-eyes"><ellipse cx="18.5" cy="25" rx="3.2" ry="3.6" fill="#c8a56a" /><ellipse cx="29.5" cy="25" rx="3.2" ry="3.6" fill="#c8a56a" /><path d="M18.5 22.3v5.4M29.5 22.3v5.4" stroke="#2b2420" stroke-width="1.4" stroke-linecap="round" /></g><path d="M22.8 30.5h2.4L24 32Z" fill="#a0522d" /><path d="M14 31 6 29.5M14 33 6 34M34 31l8-1.5M34 33l8 1" stroke="#b8aa97" stroke-width=".8" stroke-linecap="round" /><path d="M7 40C7 36.5 9 35 11.5 35S16 36.5 16 40M32 40C32 36.5 34 35 36.5 35S41 36.5 41 40" fill="#2b2420" stroke="#efe5d6" stroke-width="1" /></svg
    ></span
  ></button>
{:else if kind === "bat"}
  <button type="button" class="hw-deco hw-bat" data-th="halloween" data-hw="bat" data-rv="fade" style="--d:900ms" aria-label="박쥐 깨우기"
    ><svg class="hw-twig" viewBox="0 0 56 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M56 5C46 6 36 5 22 8" /><path d="M38 5.3C35 2.5 32 2 29 2.5" stroke-opacity=".6" /></svg
    ><span class="hw-bat-pos" aria-hidden="true"
      ><span class="hw-bat-fx"
        ><span class="hw-bat-fy"
          ><svg class="hw-bat-hang" viewBox="0 0 20 30" focusable="false"
            ><path d="M10 4C14 4 16 8 16 13C16 19 13 24 10 27C7 24 4 19 4 13C4 8 6 4 10 4Z" fill="currentColor" fill-opacity=".88" /><path d="M8.5 4V1.5M11.5 4V1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" /><path d="M7.5 25 6.5 29 9.5 26.5ZM12.5 25 13.5 29 10.5 26.5Z" fill="currentColor" /><path d="M10 7C8 12 8 18 9 23M10 7C12 12 12 18 11 23" stroke="#efe5d6" stroke-opacity=".35" stroke-width=".8" fill="none" /><circle cx="8.6" cy="22" r=".9" fill="#c8a56a" /><circle cx="11.4" cy="22" r=".9" fill="#c8a56a" /></svg
          ><svg class="hw-bat-fly" viewBox="0 0 40 16" focusable="false"><path d={BAT} /></svg
        ></span
      ></span
    ></span
  ></button>
{:else if kind === "potion"}
  <button type="button" class="hw-deco hw-potion" data-th="halloween" data-hw="potion" data-rv="fade" style="--d:900ms" aria-label="물약 흔들기"
    ><svg viewBox="0 0 32 44" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"
      ><rect class="hw-cork" x="12" y="2" width="8" height="7" rx="1.5" fill="#c8a56a" fill-opacity=".5" /><path d="M13 9V15C7 17 4 22 4 28C4 36 9 41 16 41S28 36 28 28C28 22 25 17 19 15V9M12 9H20" /><path d="M5.2 26C9 24 13 28 16 26S23 24 26.8 26C27.4 33 23 39 16 39S4.6 33 5.2 26Z" fill="currentColor" fill-opacity=".3" stroke="none" /><circle class="hw-in" cx="13" cy="33" r="1.4" stroke-width="1" /><path d="M9 24C8 27 8 31 10 34" stroke-opacity=".4" stroke-width="1.2" /></svg
    ><i class="hw-bub" aria-hidden="true"></i><i class="hw-bub" aria-hidden="true"></i><i class="hw-bub" aria-hidden="true"></i></button>
{:else}
  <button type="button" class="hw-deco hw-web" data-th="halloween" data-hw="web" data-rv="fade" style="--d:900ms" aria-label="거미줄 건드리기"
    ><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round" aria-hidden="true" focusable="false"
      ><path d="M64 0 4 2M64 0 10 30M64 0 30 54M64 0 62 62" /><path d="M48 .5Q52 4 50 7.8Q55 9.5 55.5 13.5Q59 13 63.5 16M34 1Q40 8 37.8 14.6Q45 18 48 25.4Q56 25 63 30M18 1.5Q27 12 23.8 22.3Q34 29 39.5 38.9Q52 40 62.5 46" /><circle class="hw-dew" cx="48" cy="25.4" r="1.6" fill="#efdca8" stroke="none" opacity="0" /></svg
  ></button>
{/if}
