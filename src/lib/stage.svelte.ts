/** 인트로 게이트와 다른 섬들이 공유하는 상태. open=인트로가 끝나 본문이 드러났는지 */
export const stage = $state({ open: false, gate: false });

if (typeof window !== "undefined") {
  /* 게이트 섬이 끝내 올라오지 않아도 본문 애니메이션이 영원히 대기하지 않도록 */
  setTimeout(() => {
    if (!stage.gate) {
      stage.open = true;
      document.documentElement.classList.add("opened");
    }
  }, 5000);
}
