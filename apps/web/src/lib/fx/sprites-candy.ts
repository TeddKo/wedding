/** 할로윈 금박 플레이크 5종(각 24x24). fall.ts 스프라이트용. 채움 단색 + 얇은 하이라이트로 박(箔) 질감. */
const f = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`;

export const FLECKS: string[] = [
  f('<path d="M12 2l3.200 10L12 22 8.800 12Z" fill="#d6b374"/><path d="M12 2l3.200 10H12Z" fill="#efdca8" opacity=".7"/>'),
  f('<circle cx="12" cy="12" r="4.500" fill="#c8a56a"/><circle cx="10.500" cy="10.500" r="1.600" fill="#efdca8" opacity=".75"/>'),
  f(
    '<path d="M4 15C7 6 15 4 20 9 17 16 9 18 4 15Z" fill="#cfab6c"/><path d="M6 14C9 9 14 8 17 9" fill="none" stroke="#efdca8" stroke-width="1" stroke-linecap="round" opacity=".7"/>',
  ),
  f(
    '<rect x="7" y="7" width="10" height="10" rx="1" transform="rotate(32 12 12)" fill="#dcc185"/><path d="M8 9l4-2" stroke="#fff6dc" stroke-width="1" stroke-linecap="round" opacity=".6"/>',
  ),
  f('<path d="M12 3C12.800 9 15 11.200 21 12 15 12.800 12.800 15 12 21 11.200 15 9 12.800 3 12 9 11.200 11.200 9 12 3Z" fill="#e3c88e"/>'),
];

/** 사탕 4종(각 32x32 뷰박스, 64px 래스터). 바구니 탭 분사용 */
const c = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64">${body}</svg>`;

export const CANDIES: string[] = [
  c(
    '<path d="M9 16 3 10.5v11Z M23 16l6-5.5v11Z" fill="#c8a56a"/><path d="M4.5 13 8 15.5M4.5 19 8 16.5M27.5 13 24 15.5M27.5 19 24 16.5" stroke="#8a6a3a" stroke-width=".9" stroke-linecap="round"/><rect x="8" y="10.5" width="16" height="11" rx="5.5" fill="#e0904a"/><path d="M12.5 11.5 11 20.5M17.5 11 16 21M22 12.5 20.8 19.5" stroke="#fff3dc" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>',
  ),
  c(
    '<path d="M16 18v12" stroke="#efe5d6" stroke-width="2.2" stroke-linecap="round"/><circle cx="16" cy="11" r="9" fill="#a0522d"/><path d="M16 11m-1.5 0a1.5 1.5 0 1 1 1.5 1.5a3.2 3.2 0 1 1-3.2-3.2a5 5 0 1 1 5 5a6.8 6.8 0 1 1-6.8-6.8" fill="none" stroke="#f3d9a4" stroke-width="1.5" stroke-linecap="round"/>',
  ),
  c(
    '<circle cx="16" cy="16" r="11" fill="#efe5d6"/><path d="M16 16V5a11 11 0 0 1 7.8 3.2Z M16 16h11a11 11 0 0 1-3.2 7.8Z M16 16v11a11 11 0 0 1-7.8-3.2Z M16 16H5a11 11 0 0 1 3.2-7.8Z" fill="#a0522d"/><circle cx="16" cy="16" r="11" fill="none" stroke="#7a3d22" stroke-width="1"/><path d="M10 9.5a8 8 0 0 1 4-2" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>',
  ),
  c(
    '<path d="M16 3C19 3 26 22 26 25.5 26 28 21.5 29 16 29S6 28 6 25.5C6 22 13 3 16 3Z" fill="#e9b949"/><path d="M16 3C18.2 3 22.6 14.5 24.6 21H7.4C9.4 14.5 13.8 3 16 3Z" fill="#e0904a"/><path d="M16 3C17.3 3 19.3 7.6 20.7 11.5H11.3C12.7 7.6 14.7 3 16 3Z" fill="#f6ecd9"/>',
  ),
];
