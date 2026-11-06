/** 노드를 body(또는 지정 요소, 예: 열린 모달 dialog 의 top layer) 로 옮겨 상위 스태킹 컨텍스트(.page)의 영향 회피 */
export function portal(node: HTMLElement, host?: HTMLElement) {
  (host ?? document.body).appendChild(node);
  return { destroy: () => node.remove() };
}
