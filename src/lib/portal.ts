/** 노드를 body 로 옮겨 상위 스태킹 컨텍스트(.page)의 영향 회피 */
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return { destroy: () => node.remove() };
}
